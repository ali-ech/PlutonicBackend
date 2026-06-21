import { cert, getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AdminUser } from '../models/index.js';

let initAttempted = false;
let initOk = false;

export function isFcmConfigured(): boolean {
  if (getApps().length) return true;
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (saPath && existsSync(resolve(process.cwd(), saPath))) return true;
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) return true;
  return false;
}

function initFirebase(): boolean {
  if (getApps().length) return true;
  if (initAttempted && !initOk) return false;
  initAttempted = true;

  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (saPath) {
    const fullPath = resolve(process.cwd(), saPath);
    if (existsSync(fullPath)) {
      try {
        const json = JSON.parse(readFileSync(fullPath, 'utf8'));
        initializeApp({ credential: cert(json) });
        initOk = true;
        console.log('[FCM] Firebase Admin initialized from service account file');
        return true;
      } catch (err) {
        console.error('[FCM] Failed to read service account file:', err);
      }
    } else {
      console.warn(`[FCM] Service account file not found: ${fullPath}`);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    try {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
      initOk = true;
      console.log('[FCM] Firebase Admin initialized from env credentials');
      return true;
    } catch (err) {
      console.error('[FCM] Failed to initialize from env credentials:', err);
    }
  }

  try {
    initializeApp({ credential: applicationDefault() });
    initOk = true;
    return true;
  } catch {
    initOk = false;
    return false;
  }
}

function getAdminDashboardUrl(): string {
  const base = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/admin/dashboard`;
}

function getIconUrl(): string {
  const base = (process.env.PUBLIC_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/assets/branding/logo.svg`;
}

function buildDataPayload(
  title: string,
  body: string,
  dashboardUrl: string,
  extra?: Record<string, string>
): Record<string, string> {
  return {
    title,
    body,
    click_action: dashboardUrl,
    ...Object.fromEntries(
      Object.entries(extra || {}).map(([key, value]) => [key, String(value)])
    ),
  };
}

async function removeInvalidTokens(invalidTokens: string[]): Promise<void> {
  if (!invalidTokens.length) return;
  await AdminUser.updateMany(
    { fcmTokens: { $in: invalidTokens } },
    { $pull: { fcmTokens: { $in: invalidTokens } } }
  );
  console.log('[FCM] Removed invalid tokens:', invalidTokens.length);
}

export async function sendFcmToAdmins(params: {
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ sent: number; failed: number; error?: string }> {
  const admins = await AdminUser.find({ fcmTokens: { $exists: true, $ne: [] } });
  const tokens = [...new Set(admins.flatMap((a) => a.fcmTokens).filter(Boolean))];

  if (!tokens.length) {
    console.log('[FCM] No admin tokens registered — open admin dashboard and allow notifications');
    return { sent: 0, failed: 0, error: 'No admin FCM tokens registered' };
  }

  if (!initFirebase()) {
    const msg =
      'FCM server not configured. Add firebase-service-account.json (see server/firebase-service-account.json.example)';
    console.warn('[FCM]', msg, params.title);
    return { sent: 0, failed: tokens.length, error: msg };
  }

  const dashboardUrl = getAdminDashboardUrl();
  const iconUrl = getIconUrl();
  const dataPayload = buildDataPayload(params.title, params.body, dashboardUrl, params.data);

  try {
    const res = await getMessaging().sendEachForMulticast({
      tokens,
      // notification + webpush.notification: browser shows alert when tab/site is closed
      notification: { title: params.title, body: params.body },
      data: dataPayload,
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '86400',
        },
        notification: {
          title: params.title,
          body: params.body,
          icon: iconUrl,
          badge: iconUrl,
          requireInteraction: true,
          tag: 'plutonic-admin',
          renotify: true,
          silent: false,
        },
        fcmOptions: {
          link: dashboardUrl,
        },
      },
      android: {
        priority: 'high',
        notification: {
          title: params.title,
          body: params.body,
          sound: 'default',
          channelId: 'plutonic_admin',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: { title: params.title, body: params.body },
            sound: 'default',
            badge: 1,
          },
        },
      },
    });

    const invalid: string[] = [];
    res.responses.forEach((r, i) => {
      if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
        invalid.push(tokens[i]);
      }
      if (!r.success) {
        console.error('[FCM] token failed:', tokens[i], r.error?.message);
      }
    });

    await removeInvalidTokens(invalid);

    console.log('[FCM] sent', res.successCount, 'of', tokens.length, params.title);
    return { sent: res.successCount, failed: res.failureCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'FCM send failed';
    console.error('[FCM] send failed:', err);
    return { sent: 0, failed: tokens.length, error: message };
  }
}

export function logFcmStartupStatus(): void {
  if (isFcmConfigured()) {
    initFirebase();
  } else {
    console.warn(
      '[FCM] Push notifications disabled until service account is configured.\n' +
        '  1. Firebase Console → Project mkd-delivery-21550 → Settings → Service accounts\n' +
        '  2. Generate new private key → save as server/firebase-service-account.json\n' +
        '  3. Set FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json in server/.env\n' +
        '  4. Import VAPID key in Cloud Messaging → Web Push certificates (if not done)'
    );
  }
}
