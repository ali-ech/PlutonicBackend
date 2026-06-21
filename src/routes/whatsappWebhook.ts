import { Router } from 'express';
import { handleInboundWhatsAppMessage } from '../services/rescheduleReply.js';

const router = Router();

/** UltraMsg webhook — configure in UltraMsg dashboard → Instance settings → Webhook URL */
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body as {
      event_type?: string;
      data?: {
        from?: string;
        body?: string;
        fromMe?: boolean;
        type?: string;
      };
    };

    if (payload.event_type === 'message_received' && payload.data) {
      const { from, body, fromMe, type } = payload.data;
      if (!fromMe && body && type === 'chat') {
        await handleInboundWhatsAppMessage(from, body);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
