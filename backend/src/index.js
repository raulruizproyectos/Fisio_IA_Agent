import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import patientsRouter from './routes/patients.js';
import telegramRouter from './routes/telegram.js';
import professionalRouter from './routes/professional.js';
import agentRouter from './routes/agent.js';
import exercisesRouter from './routes/exercises.js';

// Configuracion
const app = express();
const PORT = process.env.PORT || 3001;
const ERROR_WEBHOOK_URL = process.env.N8N_ERROR_WEBHOOK_URL || null;

// Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4321',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'fisio-ia-agent-api',
    timestamp: new Date().toISOString(),
  });
});

// Rutas
app.use('/api/patients', patientsRouter);
app.use('/api/pacientes', patientsRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/professional', professionalRouter);
app.use('/api/profesional', professionalRouter);
app.use('/api/agent', agentRouter);
app.use('/api/agente', agentRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/ejercicios', exercisesRouter);

// Error handler
app.use((err, req, res, next) => {
  if (ERROR_WEBHOOK_URL) {
    fetch(ERROR_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        severity: 'CRITICAL',
        service: 'fisio-ia-agent-api',
        route: req.originalUrl,
        method: req.method,
        message: err.message || 'Error interno del servidor',
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Swallow notifier errors to avoid blocking API error response.
    });
  }

  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

// Start
app.listen(PORT, () => {
  console.log(`\nFisio IA Agent API\n------------------\nServidor activo en http://localhost:${PORT}\nHealth check:     http://localhost:${PORT}/api/health\nSupabase:         ${process.env.SUPABASE_URL || 'No configurado'}\n`);
});

