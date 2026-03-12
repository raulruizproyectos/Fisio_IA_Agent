#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const args = {};
  for (const token of argv) {
    if (!token.startsWith('--')) continue;
    const [rawKey, ...rest] = token.slice(2).split('=');
    const key = rawKey.trim();
    const value = rest.length ? rest.join('=').trim() : 'true';
    args[key] = value;
  }
  return args;
}

function parseEnv(content) {
  const env = {};
  for (const line of String(content || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Decode HTML entities and strip tags from PROET description_html */
function decodeHtmlDescription(html) {
  if (!html) return '';
  return String(html)
    // Strip HTML tags
    .replace(/<[^>]*>/g, ' ')
    // Named entities (Spanish chars)
    .replace(/&Aacute;/gi, 'Á').replace(/&aacute;/gi, 'á')
    .replace(/&Eacute;/gi, 'É').replace(/&eacute;/gi, 'é')
    .replace(/&Iacute;/gi, 'Í').replace(/&iacute;/gi, 'í')
    .replace(/&Oacute;/gi, 'Ó').replace(/&oacute;/gi, 'ó')
    .replace(/&Uacute;/gi, 'Ú').replace(/&uacute;/gi, 'ú')
    .replace(/&Ntilde;/gi, 'Ñ').replace(/&ntilde;/gi, 'ñ')
    .replace(/&Uuml;/gi, 'Ü').replace(/&uuml;/gi, 'ü')
    .replace(/&Ouml;/gi, 'Ö').replace(/&ouml;/gi, 'ö')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    // Numeric entities
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/** Derive Spanish name from PROET image_filename (e.g. "abduccion-cadera-8059.png" -> "Abduccion cadera") */
function spanishNameFromFilename(filename) {
  if (!filename) return null;
  const base = String(filename)
    .replace(/\.[a-z]+$/i, '')   // remove extension
    .replace(/-\d+$/, '');        // remove trailing numeric ID
  const words = base.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (!words) return null;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function inferBodyZone(text) {
  const value = String(text || '').toLowerCase();
  if (/(cervical|cuello|trapecio)/.test(value)) return 'cervical';
  if (/(hombro|esc[aá]pula|manguito|brazo)/.test(value)) return 'hombro_brazo';
  if (/(lumbar|espalda|dorsal|columna)/.test(value)) return 'espalda';
  if (/(cadera|gl[uú]te|pelvis)/.test(value)) return 'cadera';
  if (/(rodilla|menisco|ligamento cruzado)/.test(value)) return 'rodilla';
  if (/(tobillo|pie|aquiles|gemelo|pantorrilla)/.test(value)) return 'tobillo_pie';
  if (/(respir|covid|pulmon)/.test(value)) return 'respiratorio';
  return 'general';
}

function inferLevel(text) {
  const value = String(text || '').toLowerCase();
  if (/(avanzad|alto)/.test(value)) return 'alto';
  if (/(b[aá]sic|inicio|suave|leve)/.test(value)) return 'bajo';
  return 'medio';
}

async function findLatestSnapshot(cwd) {
  const dataDir = path.resolve(cwd, 'docs/data');
  const files = await fs.readdir(dataDir);
  const candidates = files
    .filter((name) => /^proet_snapshot_\d{8}\.json$/i.test(name))
    .sort((a, b) => b.localeCompare(a));
  if (!candidates.length) {
    throw new Error('No hay snapshots PROET en docs/data/');
  }
  return path.resolve(dataDir, candidates[0]);
}

async function supabaseRequest({ baseUrl, serviceKey, method, resourcePath, query = '', body = null, prefer = '' }) {
  const url = `${baseUrl}/rest/v1/${resourcePath}${query ? `?${query}` : ''}`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };
  if (body !== null) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(url, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })() : null;
  if (!response.ok) {
    throw new Error(`${method} ${resourcePath} failed (${response.status}): ${JSON.stringify(payload).slice(0, 260)}`);
  }
  return payload;
}

function buildDolencias(snapshot, nowIso) {
  const sourceItems = []
    .concat(Array.isArray(snapshot.templates_top) ? snapshot.templates_top : [])
    .concat(Array.isArray(snapshot.programs) ? snapshot.programs : []);

  const map = new Map();
  for (const item of sourceItems) {
    const name = cleanText(item.title);
    if (!name) continue;
    const key = name.toLowerCase();
    if (map.has(key)) continue;
    const description = cleanText(item.target || item.notes || '');
    map.set(key, {
      nombre: name,
      zona_corporal: inferBodyZone(`${name} ${description}`),
      descripcion: description || null,
      niveles_severidad: ['leve', 'moderada', 'severa'],
      activo: true,
      creado_en: nowIso,
    });
  }
  return [...map.values()];
}

function buildCrmExercises(snapshot, nowIso) {
  const uniqueExercises = Array.isArray(snapshot.unique_exercises) ? snapshot.unique_exercises : [];
  return uniqueExercises
    .map((ex) => {
      const nombreEs = spanishNameFromFilename(ex.image_filename) || cleanText(ex.title);
      if (!nombreEs) return null;
      const description = decodeHtmlDescription(ex.description_html || ex.description_text || '');
      const sourceTitles = Array.isArray(ex.source_program_titles) ? ex.source_program_titles.filter(Boolean) : [];
      const textForInference = `${nombreEs} ${description} ${sourceTitles.join(' ')}`;
      return {
        codigo: `PROET-${ex.source_exercise_id}`,
        nombre: nombreEs,
        descripcion: description || null,
        zona_corporal: inferBodyZone(textForInference),
        nivel: inferLevel(textForInference),
        contraindicaciones: null,
        activo: true,
        metadata: {
          source: 'proet',
          imported_at: nowIso,
          proet_source_exercise_id: ex.source_exercise_id,
          proet_image_filename: ex.image_filename || null,
          proet_image_url: ex.image_url || null,
          proet_title_original: ex.title || null,
          proet_youtube_url: ex.youtube_url || null,
          source_program_ids: Array.isArray(ex.source_program_ids) ? ex.source_program_ids : [],
          source_program_titles: sourceTitles,
          series_defecto: ex.series ?? null,
          repeticiones_defecto: ex.repetitions ?? null,
          descanso_segundos_defecto: ex.rest ?? null,
        },
      };
    })
    .filter(Boolean);
}

async function main() {
  const cwd = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const nowIso = new Date().toISOString();
  const batchSize = Math.max(1, Number(args['batch-size'] || 200));
  const dryRun = args['dry-run'] === 'true';

  const envPath = path.resolve(cwd, args['env-file'] || 'backend/.env');
  const envContent = await fs.readFile(envPath, 'utf8');
  const env = parseEnv(envContent);

  const supabaseUrl = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(`Faltan SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY en ${envPath}`);
  }

  const snapshotPath = args.snapshot
    ? path.resolve(cwd, args.snapshot)
    : await findLatestSnapshot(cwd);
  const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));

  const dolenciasRows = buildDolencias(snapshot, nowIso);
  const crmExerciseRows = buildCrmExercises(snapshot, nowIso);

  console.log(`Snapshot: ${snapshotPath}`);
  console.log(`Dolencias candidatas: ${dolenciasRows.length}`);
  console.log(`Ejercicios CRM candidatos: ${crmExerciseRows.length}`);
  if (dryRun) {
    console.log('Dry run activo: no se aplican cambios.');
    return;
  }

  // Insert dolencias without duplicates by nombre
  let dolenciasInserted = 0;
  try {
    const existingDolencias = await supabaseRequest({
      baseUrl: supabaseUrl,
      serviceKey,
      method: 'GET',
      resourcePath: 'dolencias',
      query: 'select=nombre',
    });
    const existingNames = new Set((existingDolencias || []).map((row) => String(row.nombre || '').toLowerCase()));
    const toInsert = dolenciasRows.filter((row) => !existingNames.has(row.nombre.toLowerCase()));
    for (const block of chunk(toInsert, batchSize)) {
      await supabaseRequest({
        baseUrl: supabaseUrl,
        serviceKey,
        method: 'POST',
        resourcePath: 'dolencias',
        prefer: 'return=minimal',
        body: block,
      });
      dolenciasInserted += block.length;
    }
  } catch (err) {
    console.warn(`Aviso dolencias: ${err.message}`);
  }

  // Upsert CRM exercises by codigo
  let crmUpserted = 0;
  for (const block of chunk(crmExerciseRows, batchSize)) {
    const rows = await supabaseRequest({
      baseUrl: supabaseUrl,
      serviceKey,
      method: 'POST',
      resourcePath: 'crm_ejercicios_catalogo',
      query: 'on_conflict=codigo',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: block,
    });
    crmUpserted += Array.isArray(rows) ? rows.length : block.length;
  }

  console.log(`Dolencias insertadas: ${dolenciasInserted}`);
  console.log(`Ejercicios CRM upsertados: ${crmUpserted}`);
  console.log('OK: catálogo PROET sincronizado en Supabase.');
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
