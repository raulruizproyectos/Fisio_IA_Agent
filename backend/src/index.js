import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import patientsRouter from './routes/patients.js';
import telegramRouter from './routes/telegram.js';
import professionalRouter from './routes/professional.js';
import agentRouter from './routes/agent.js';
import exercisesRouter from './routes/exercises.js';
import paymentsRouter from './routes/payments.js';
import clinicalNotesRouter from './routes/clinical-notes.js';
import remindersRouter from './routes/reminders.js';
import invoicesRouter from './routes/invoices.js';
import documentsRouter from './routes/documents.js';
import bonosRouter from './routes/bonos.js';
import { buildReadinessReport, getReadinessStatusCode } from './lib/readiness.js';
import { serviceSupabase, supabase } from './lib/supabase.js';
import { authorizeRequest, requestIdentity } from './middleware/security.js';

// Configuracion
const app = express();
const DEFAULT_PORT = 3001;
const PLATFORM_PORT = Number.parseInt(process.env.PORT || '', 10);
const PRIMARY_PORT = Number.isFinite(PLATFORM_PORT) ? PLATFORM_PORT : DEFAULT_PORT;
const EXTRA_LISTEN_PORTS = (process.env.EXTRA_LISTEN_PORTS || (process.env.PORT ? '' : '3000'))
  .split(',')
  .map((value) => Number.parseInt(value.trim(), 10))
  .filter((value) => Number.isFinite(value));
const LISTEN_PORTS = Array.from(new Set([PRIMARY_PORT, DEFAULT_PORT, ...EXTRA_LISTEN_PORTS]));
const ERROR_WEBHOOK_URL = process.env.N8N_ERROR_WEBHOOK_URL || null;
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:4321',
  'http://127.0.0.1:4321',
  'https://fisio-frontend.b5xbaf.easypanel.host',
  'https://fisio-staging-fisio-frontend-staging.b5xbaf.easypanel.host',
];

const allowedOrigins = Array.from(
  new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(process.env.FRONTEND_URLS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : []),
  ])
);

// Middleware
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(requestIdentity);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin/server-to-server requests without Origin header.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin no permitido por CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '512kb', strict: true }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT || 300),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intentalo de nuevo mas tarde.' },
}));
app.use([
  '/api/professional/public-booking/appointments',
  '/api/profesional/public-booking/appointments',
], rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.PUBLIC_BOOKING_RATE_LIMIT || 20),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes de reserva. Inténtalo más tarde.' },
}));
app.use('/api/telegram/incoming', rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.TELEGRAM_RATE_LIMIT || 180),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Límite temporal de mensajes alcanzado.' },
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'fisio-ia-agent-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'fisio-ia-agent-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'fisio-ia-agent-api',
    health: '/api/health',
  });
});

app.use(authorizeRequest);

app.get('/api/me', (req, res) => {
  res.json(req.auth || {});
});

app.get('/api/health/readiness', async (_req, res) => {
  const report = await buildReadinessReport({ supabase: serviceSupabase, env: process.env });
  res.status(getReadinessStatusCode(report)).json(report);
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
app.use('/api/pagos', paymentsRouter);
app.use('/api/notas-clinicas', clinicalNotesRouter);
app.use('/api/cron/recordatorios', remindersRouter);
app.use('/api/facturas', invoicesRouter);
app.use('/api/documentos', documentsRouter);
app.use('/api/bonos', bonosRouter);

// Error handler
app.use((err, req, res, _next) => {
  if (ERROR_WEBHOOK_URL) {
    fetch(ERROR_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.N8N_WEBHOOK_SECRET
          ? { 'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET }
          : {}),
      },
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

  console.error(JSON.stringify({
    level: 'error',
    request_id: req.id,
    method: req.method,
    route: req.originalUrl,
    message: err.message || 'Error interno del servidor',
  }));
  const status = Number(err.status || 500);
  const safeMessage = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : (err.message || 'Error interno del servidor');
  res.status(status).json({ error: safeMessage, request_id: req.id });
});

// Start
const servers = LISTEN_PORTS.map((port, index) => {
  const isPrimary = index === 0;
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`\nFisio IA Agent API\n------------------\nServidor activo en http://0.0.0.0:${port}${isPrimary ? '' : ' (compat)'}\nHealth check:     http://0.0.0.0:${port}/api/health\nSupabase:         ${process.env.SUPABASE_URL || 'No configurado'}\n`);
  });

  server.on('error', (error) => {
    if (!isPrimary && error?.code === 'EADDRINUSE') {
      console.warn(`Puerto compat ${port} ocupado; backend principal sigue activo.`);
      return;
    }

    console.error(`No se pudo iniciar el backend en el puerto ${port}:`, error);
    process.exit(1);
  });
  return server;
});

function shutdown(signal) {
  console.log(`${signal}: cerrando servidor de forma ordenada`);
  const timeout = setTimeout(() => process.exit(1), 10_000).unref();
  Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))))
    .then(() => {
      clearTimeout(timeout);
      process.exit(0);
    });
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

export { supabase };
