import { Router } from 'express';
import { dispatchPendingNotices } from '../lib/agent-notices.js';

// Retry pass for the booking agent's alerts (clinic) and notices (patient), called by an n8n schedule
// with INTERNAL_API_KEY (every /api/cron route requires it). Only resends what surely was not delivered.
const router = Router();

router.post('/', async (_req, res, next) => {
  try {
    const professionalId = String(process.env.MESSAGING_PILOT_PROFESSIONAL_ID || '').trim() || null;
    res.json({ ok: true, delivered: await dispatchPendingNotices({ professionalId }) });
  } catch (err) {
    next(err);
  }
});

export default router;
