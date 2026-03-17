import { Router } from 'express';
import { supabase } from '../index.js';

const router = Router();

const PATIENT_BOT_TOKEN = process.env.TELEGRAM_PATIENT_BOT_TOKEN?.trim() || null;

async function sendTelegramReminder(chatId, text) {
  if (!PATIENT_BOT_TOKEN || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${PATIENT_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// POST /api/cron/recordatorios — called every hour by external scheduler
router.post('/', async (req, res, next) => {
  try {
    const now = new Date();
    // Window: citas between 23h and 25h from now
    const from = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Find confirmed appointments in window
    const { data: citas, error } = await supabase
      .from('crm_citas')
      .select('id, paciente_id, inicio_en, motivo')
      .in('estado', ['confirmada', 'CONFIRMADA', 'pendiente'])
      .gte('inicio_en', from.toISOString())
      .lte('inicio_en', to.toISOString());

    if (error) throw error;
    if (!citas?.length) return res.json({ sent: 0, message: 'No appointments in 24h window' });

    // Get unique patient IDs
    const pacienteIds = [...new Set(citas.map(c => c.paciente_id))];

    // Get telegram links for these patients
    const { data: vinculos } = await supabase
      .from('vinculos_telegram_pacientes')
      .select('paciente_id, telegram_chat_id')
      .in('paciente_id', pacienteIds);

    // Get patient names
    const { data: pacientes } = await supabase
      .from('crm_pacientes')
      .select('id, nombre, apellidos')
      .in('id', pacienteIds);

    const chatMap = {};
    for (const v of (vinculos || [])) chatMap[v.paciente_id] = v.telegram_chat_id;
    const nameMap = {};
    for (const p of (pacientes || [])) nameMap[p.id] = [p.nombre, p.apellidos].filter(Boolean).join(' ');

    let sent = 0;
    const results = [];

    for (const cita of citas) {
      const chatId = chatMap[cita.paciente_id];
      if (!chatId) {
        results.push({ cita_id: cita.id, status: 'no_telegram_link' });
        continue;
      }

      const nombre = nameMap[cita.paciente_id] || 'Paciente';
      const fecha = new Date(cita.inicio_en);
      const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
      const dia = fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });

      const message = `📋 <b>Recordatorio de cita</b>\n\nHola ${nombre}, te recordamos que tienes una cita de fisioterapia:\n\n📅 <b>${dia}</b>\n🕐 <b>${hora}h</b>${cita.motivo ? `\n📝 ${cita.motivo}` : ''}\n\nSi necesitas cancelar o cambiar la cita, escríbenos por aquí.\n\n— Clínica de Fisioterapia`;

      const ok = await sendTelegramReminder(chatId, message);
      results.push({ cita_id: cita.id, paciente: nombre, status: ok ? 'sent' : 'failed' });
      if (ok) sent++;
    }

    res.json({ sent, total: citas.length, results });
  } catch (err) {
    next(err);
  }
});

// GET /api/cron/recordatorios/preview — preview what would be sent (dry run)
router.get('/preview', async (req, res, next) => {
  try {
    const now = new Date();
    const from = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const { data: citas, error } = await supabase
      .from('crm_citas')
      .select('id, paciente_id, inicio_en, motivo, estado, crm_pacientes(nombre, apellidos)')
      .in('estado', ['confirmada', 'CONFIRMADA', 'pendiente'])
      .gte('inicio_en', from.toISOString())
      .lte('inicio_en', to.toISOString());

    if (error) throw error;

    res.json({
      window: { from: from.toISOString(), to: to.toISOString() },
      citas: (citas || []).map(c => ({
        id: c.id,
        paciente: c.crm_pacientes ? `${c.crm_pacientes.nombre} ${c.crm_pacientes.apellidos || ''}`.trim() : c.paciente_id,
        inicio_en: c.inicio_en,
        motivo: c.motivo,
        estado: c.estado,
      })),
      count: (citas || []).length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
