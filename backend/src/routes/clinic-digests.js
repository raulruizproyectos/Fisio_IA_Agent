import { Router } from 'express';
import { buildDigest } from '../lib/clinic-digests.js';

// POST /api/cron/resumenes/:tipo — called by n8n schedules with INTERNAL_API_KEY (every /api/cron route
// requires it). Returns the text for the physio and whether it is worth sending; n8n only delivers it.
const router = Router();

router.post('/:tipo', async (req, res, next) => {
  try {
    res.json({ ok: true, tipo: req.params.tipo, ...(await buildDigest(req.params.tipo)) });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
    next(err);
  }
});

export default router;
