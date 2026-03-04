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

function parseNumber(value, fallback = 0) {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function fixMojibake(value) {
  if (typeof value !== 'string') return value;
  if (!/[ÃÂâ€]/.test(value)) return value;
  try {
    const fixed = Buffer.from(value, 'latin1').toString('utf8');
    const weirdBefore = (value.match(/[ÃÂ]/g) || []).length;
    const weirdAfter = (fixed.match(/[ÃÂ]/g) || []).length;
    return weirdAfter < weirdBefore ? fixed : value;
  } catch {
    return value;
  }
}

function normalizeDeep(value) {
  if (Array.isArray(value)) return value.map(normalizeDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalizeDeep(v);
    return out;
  }
  return fixMojibake(value);
}

function parseVideoUrl(firstVideo) {
  if (!firstVideo) return null;
  const str = String(firstVideo).trim();
  if (/^https?:\/\//i.test(str)) return str;
  const srcMatch = str.match(/src="([^"]+)"/i);
  return srcMatch ? srcMatch[1] : null;
}

function imageUrlFromName(newPicture) {
  if (!newPicture) return null;
  return `https://proet-s3-do.fra1.digitaloceanspaces.com/exercise/${newPicture}`;
}

async function postJson(baseUrl, endpoint, payload) {
  const url = `${baseUrl}${endpoint}`;
  const body =
    typeof payload === 'string' ? JSON.stringify(payload) : JSON.stringify(payload ?? {});

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body,
  });

  const text = await response.text();
  let parsed = {};
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
  }

  if (!response.ok) {
    throw new Error(
      `[${endpoint}] HTTP ${response.status} ${response.statusText} ${JSON.stringify(parsed).slice(0, 220)}`
    );
  }

  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email || process.env.PROET_EMAIL;
  if (!email) {
    throw new Error('Missing --email (or PROET_EMAIL env var)');
  }

  const baseUrl = (args['base-url'] || 'https://app.exerciciterapeutic.cat').replace(/\/+$/, '');
  const locale = args.locale || 'val';
  const programLimit = Math.max(0, parseNumber(args['program-limit'], 0));
  const templatesLimit = Math.max(1, parseNumber(args['templates-limit'], 80));

  const nowIso = new Date().toISOString();
  const stamp = nowIso.slice(0, 10).replace(/-/g, '');
  const defaultOut = path.resolve(process.cwd(), `docs/data/proet_snapshot_${stamp}.json`);
  const outputPath = path.resolve(process.cwd(), args.output || defaultOut);

  const auth = await postJson(baseUrl, '/api/authentication/auth', email);
  const user = (auth.results || [])[0];
  if (!user) {
    throw new Error(`No profile found in ${baseUrl} for ${email}`);
  }

  const userProgramsResp = await postJson(baseUrl, '/api/programs/users/list', { userId: user.id });
  const rawPrograms = userProgramsResp.results || [];
  const programs = (programLimit > 0 ? rawPrograms.slice(0, programLimit) : rawPrograms).map((p) => ({
    id: p.id,
    title: p.title || '',
    target: p.target || '',
    picture: p.picture || null,
    updatedAt: p.updatedAt || null,
  }));

  const templatesResp = await postJson(baseUrl, '/api/programs/admin/most-used-physio', { locale });
  const templates = (templatesResp.results || []).slice(0, templatesLimit).map((t) => ({
    id: t.id,
    title: t.title || '',
    target: t.target || '',
    picture: t.picture || null,
    picture_url: t.picture
      ? `https://proet-s3-do.fra1.digitaloceanspaces.com/training/${t.picture}`
      : null,
    clone_count: t.clone_count || 0,
  }));

  const exerciseMap = new Map();
  const programSnapshots = [];
  let totalProgramExercises = 0;

  for (const program of programs) {
    const detailsResp = await postJson(baseUrl, '/api/programs/users/details', { id: program.id });
    const details = (detailsResp.results || [])[0] || {};

    const exResp = await postJson(baseUrl, '/api/exercises/program-list', {
      id: program.id,
      locale,
    });
    const programExercises = exResp.results || [];
    totalProgramExercises += programExercises.length;

    programSnapshots.push({
      id: program.id,
      title: details.title || program.title || '',
      target: details.target || program.target || '',
      notes: details.notes || null,
      picture: details.picture || program.picture || null,
      updated_at: details.updatedAt || program.updatedAt || null,
      exercise_count: programExercises.length,
      exercises: programExercises.map((ex) => ({
        id: ex.id,
        title: ex.title || '',
        image_filename: ex.new_picture || null,
        image_url: imageUrlFromName(ex.new_picture),
        youtube_url: parseVideoUrl(ex.first_video),
      })),
    });

    for (const ex of programExercises) {
      const key = String(ex.id);
      const current = exerciseMap.get(key);
      const base = current || {
        source_exercise_id: ex.id,
        title: ex.title || '',
        description_html: ex.descripcion || '',
        description_text: cleanText(ex.descripcion),
        image_filename: ex.new_picture || null,
        image_url: imageUrlFromName(ex.new_picture),
        youtube_url: parseVideoUrl(ex.first_video),
        series: ex.series ?? null,
        repetitions: ex.repetitions ?? null,
        rest: ex.rest ?? null,
        source_program_ids: [],
        source_program_titles: [],
      };

      if (!base.title && ex.title) base.title = ex.title;
      if (!base.description_html && ex.descripcion) {
        base.description_html = ex.descripcion;
        base.description_text = cleanText(ex.descripcion);
      }
      if (!base.image_filename && ex.new_picture) {
        base.image_filename = ex.new_picture;
        base.image_url = imageUrlFromName(ex.new_picture);
      }
      if (!base.youtube_url && ex.first_video) {
        base.youtube_url = parseVideoUrl(ex.first_video);
      }

      if (!base.source_program_ids.includes(program.id)) {
        base.source_program_ids.push(program.id);
      }
      if (!base.source_program_titles.includes(program.title || details.title || '')) {
        base.source_program_titles.push(program.title || details.title || '');
      }

      exerciseMap.set(key, base);
    }
  }

  const uniqueExercises = [...exerciseMap.values()].sort((a, b) =>
    String(a.title).localeCompare(String(b.title), 'es', { sensitivity: 'base' })
  );

  const snapshot = {
    generated_at: nowIso,
    source: {
      platform: 'proet',
      base_url: baseUrl,
      locale,
      endpoints: {
        auth: '/api/authentication/auth',
        user_programs: '/api/programs/users/list',
        user_program_details: '/api/programs/users/details',
        user_program_exercises: '/api/exercises/program-list',
        templates: '/api/programs/admin/most-used-physio',
      },
    },
    user_profile: {
      id: user.id,
      email: user.email,
      view: user.view,
      role_serialized: user.roles,
      domain: user.domain,
      external_name: user.external_name || null,
      last_login: user.last_login || null,
    },
    stats: {
      user_programs_total: programs.length,
      templates_total: templates.length,
      program_exercises_total: totalProgramExercises,
      unique_exercises_total: uniqueExercises.length,
    },
    templates_top: templates,
    programs: programSnapshots,
    unique_exercises: uniqueExercises,
  };

  const normalizedSnapshot = normalizeDeep(snapshot);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(normalizedSnapshot, null, 2)}\n`, 'utf8');

  console.log(`Saved: ${outputPath}`);
  console.log(
    `Stats -> programs:${programs.length} templates:${templates.length} program_exercises:${totalProgramExercises} unique_exercises:${uniqueExercises.length}`
  );
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
