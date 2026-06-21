import { Settings } from '../models/index.js';

export interface WhatsAppSendResult {
  sent: boolean;
  to: string;
  error?: string;
}

/** Normalize to international digits (no +). Supports UAE (+971) and Pakistan (+92). */
export function normalizePhoneDigits(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('00')) digits = digits.slice(2);

  // Already international
  if (digits.startsWith('971') && digits.length >= 11) return digits;
  if (digits.startsWith('92') && digits.length >= 11) return digits;

  // Local format with leading 0
  if (digits.startsWith('0')) {
    const local = digits.slice(1);
    // Pakistan mobile: 03xx xxxxxxx (10 digits after removing 0)
    if (local.length === 10 && local.startsWith('3')) return '92' + local;
    // UAE mobile: 5x xxx xxxx (9 digits after removing 0)
    if (local.length === 9 && local.startsWith('5')) return '971' + local;
    // Pakistan other (landline etc.)
    if (local.length >= 9 && local.length <= 10 && local.startsWith('3')) return '92' + local;
    // UAE landline / other local numbers
    if (local.length >= 8 && local.length <= 9) return '971' + local;
    return '971' + local;
  }

  // Without leading 0
  if (digits.length === 9 && digits.startsWith('5')) return '971' + digits;
  if (digits.length === 10 && digits.startsWith('3')) return '92' + digits;

  return digits;
}

/** UltraMsg expects digits without + prefix, e.g. 971501234567 */
function formatPhoneForUltraMsg(phone: string): string {
  return normalizePhoneDigits(phone);
}

function formatPhoneDisplay(phone: string): string {
  return '+' + normalizePhoneDigits(phone);
}

function parseUltraMsgResponse(text: string): { ok: boolean; error?: string } {
  try {
    const data = JSON.parse(text) as { sent?: string | boolean; message?: string; error?: string };
    const sent = data.sent === true || data.sent === 'true';
    if (sent) return { ok: true };
    return { ok: false, error: data.message || data.error || text };
  } catch {
    return { ok: false, error: text };
  }
}

async function sendViaUltraMsg(to: string, body: string): Promise<WhatsAppSendResult> {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;
  const recipient = formatPhoneForUltraMsg(to);

  if (!recipient || recipient.length < 11) {
    return { sent: false, to: formatPhoneDisplay(to), error: 'Invalid customer phone number' };
  }

  if (!instanceId || !token) {
    return { sent: false, to: formatPhoneDisplay(recipient), error: 'UltraMsg not configured' };
  }

  try {
    const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
    const params = new URLSearchParams({
      token,
      to: recipient,
      body,
      priority: '5',
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const text = await res.text();
    const parsed = parseUltraMsgResponse(text);

    if (!res.ok || !parsed.ok) {
      console.error('[UltraMsg] failed to', recipient, text);
      return { sent: false, to: formatPhoneDisplay(recipient), error: parsed.error || text };
    }

    console.log('[UltraMsg] sent to customer', formatPhoneDisplay(recipient), text);
    return { sent: true, to: formatPhoneDisplay(recipient) };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('UltraMsg send failed:', err);
    return { sent: false, to: formatPhoneDisplay(recipient), error: message };
  }
}

async function sendViaMetaCloud(phone: string, message: string): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const recipient = normalizePhoneDigits(phone);

  if (!token || !phoneId) {
    return { sent: false, to: formatPhoneDisplay(recipient), error: 'Meta WhatsApp not configured' };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body: message },
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('Meta WhatsApp API error:', text);
      return { sent: false, to: formatPhoneDisplay(recipient), error: text };
    }
    return { sent: true, to: formatPhoneDisplay(recipient) };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Meta WhatsApp send failed:', err);
    return { sent: false, to: formatPhoneDisplay(recipient), error: message };
  }
}

/** Send outbound WhatsApp to the customer booking phone number. */
export async function sendWhatsAppText(phone: string, message: string): Promise<WhatsAppSendResult> {
  if (process.env.ULTRAMSG_INSTANCE_ID && process.env.ULTRAMSG_TOKEN) {
    const result = await sendViaUltraMsg(phone, message);
    if (result.sent) return result;
    if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
      return sendViaMetaCloud(phone, message);
    }
    return result;
  }

  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
    return sendViaMetaCloud(phone, message);
  }

  console.log('[WhatsApp not configured]', formatPhoneDisplay(phone), message.slice(0, 100) + '...');
  return { sent: false, to: formatPhoneDisplay(phone), error: 'WhatsApp not configured' };
}

/** wa.me link — used only for customer → company actions (e.g. send bank receipt). */
export function whatsAppClickUrl(phone: string, message: string): string {
  const num = normalizePhoneDigits(phone);
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export async function notifyBookingConfirmed(params: {
  phone: string;
  ref: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  services: string;
  total: number;
  address: string;
  paymentMethod: string;
  cityName?: string;
}): Promise<WhatsAppSendResult & { receiptClickUrl?: string }> {
  const settings = await Settings.findOne();
  const biz = settings?.businessInfo;

  let message = `Hello! Your Plutonic booking is confirmed.\n\n`;
  message += `Ref: ${params.ref}\n`;
  message += `Date: ${params.date}\n`;
  message += `Time: ${params.slotStart} - ${params.slotEnd}\n`;
  if (params.cityName) message += `Area: ${params.cityName}\n`;
  message += `Services: ${params.services}\n`;
  message += `Total: AED ${params.total}\n`;
  message += `Address: ${params.address}\n`;
  message += `Payment: ${params.paymentMethod}\n`;

  let receiptClickUrl: string | undefined;
  if (params.paymentMethod.toLowerCase().includes('bank') && biz) {
    message += `\nBank transfer:\n`;
    message += `Bank: ${biz.bankName}\n`;
    message += `Account: ${biz.accountName}\n`;
    message += `IBAN: ${biz.iban}\n`;
    message += `Amount: AED ${params.total}\n`;
    message += `\nAfter paying, send your receipt to our WhatsApp (${biz.phone || '+971 56 1615616'}) with ref ${params.ref}.`;

    if (biz.whatsapp) {
      receiptClickUrl = whatsAppClickUrl(
        biz.whatsapp,
        `Payment receipt for Plutonic booking ${params.ref} — AED ${params.total}`
      );
    }
  }

  const result = await sendWhatsAppText(params.phone, message);
  return { ...result, receiptClickUrl };
}

export function getPublicUrl(): string {
  return (process.env.PUBLIC_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function formatRescheduleOptionLine(
  index: number,
  opt: { date: string; slotStart: string; slotEnd: string }
): string {
  return `${index + 1}) ${opt.date} · ${opt.slotStart}–${opt.slotEnd}`;
}

export function buildRescheduleWhatsAppBody(params: {
  ref: string;
  token: string;
  options: { date: string; slotStart: string; slotEnd: string }[];
}): string {
  const base = getPublicUrl();
  const lines = [
    `📅 Plutonic — Reschedule booking ${params.ref}`,
    '',
    'Pick your new time:',
    '',
  ];

  params.options.forEach((opt, i) => {
    lines.push(formatRescheduleOptionLine(i, opt));
    lines.push(`   ${base}/reschedule/${params.token}?pick=${i}`);
    lines.push('');
  });

  lines.push(`Reply in this chat with 1–${params.options.length} (e.g. reply "1").`);
  lines.push('');
  lines.push(`Or choose on the website: ${base}/reschedule/${params.token}`);

  return lines.join('\n');
}

export async function notifyRescheduleOptions(params: {
  phone: string;
  ref: string;
  token: string;
  options: { date: string; slotStart: string; slotEnd: string }[];
}): Promise<WhatsAppSendResult> {
  const message = buildRescheduleWhatsAppBody({
    ref: params.ref,
    token: params.token,
    options: params.options,
  });
  return sendWhatsAppText(params.phone, message);
}

export async function notifyRescheduleConfirmed(params: {
  phone: string;
  ref: string;
  date: string;
  slotStart: string;
  slotEnd: string;
}): Promise<WhatsAppSendResult> {
  const message = `Plutonic: Your booking ${params.ref} is confirmed for ${params.date} at ${params.slotStart}-${params.slotEnd}. See you then!`;
  return sendWhatsAppText(params.phone, message);
}

export async function notifyPaymentReceived(params: {
  phone: string;
  ref: string;
  amount: number;
}): Promise<WhatsAppSendResult> {
  const message = `Plutonic: Payment received for booking ${params.ref}. Amount: AED ${params.amount}. Thank you!`;
  return sendWhatsAppText(params.phone, message);
}
