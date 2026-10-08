import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { writeFile } from 'node:fs/promises';

function readPublicUrls(mode) {
  // ponytail: matches the normal npm build; custom --mode builds need mode-aware env loading.
  const publicEnv = loadEnv(mode, process.cwd(), 'PUBLIC_');
  const publicKey = publicEnv.PUBLIC_SUPABASE_ANON_KEY;
  if (publicKey) {
    let anon = false;
    try { anon = JSON.parse(Buffer.from(publicKey.split('.')[1] || '', 'base64url')).role === 'anon'; } catch {}
    if (!/^[A-Za-z0-9_.-]+$/.test(publicKey) || (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publicKey) && !anon)) {
      throw new Error('PUBLIC_SUPABASE_ANON_KEY solo admite una clave pública de Supabase.');
    }
  }

  const publicUrls = {};
  for (const field of ['PUBLIC_SUPABASE_URL', 'PUBLIC_BACKEND_URL']) {
    const value = publicEnv[field] || '';
    if (value) {
      let url;
      try { url = new URL(value); } catch {}
      const host = '[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*';
      const shape = new RegExp('^https?://' + host + '(:[0-9]{1,5})?(/[A-Za-z0-9._~%/-]*)?$');
      if (/[^A-Za-z0-9:/._~%-]/.test(value) || !shape.test(value) || !url || url.port === '0' || (url.protocol !== 'https:' && !/^http:\/\/(localhost|127\.0\.0\.1)(:[0-9]{1,5})?(\/|$)/.test(value))) {
        throw new Error(field + ' debe ser HTTPS (HTTP solo para loopback), sin credenciales, query, fragmento ni caracteres de configuración.');
      }
    }
    publicUrls[field] = value;
  }
  return publicUrls;
}

let publicUrls = readPublicUrls(process.env.NODE_ENV || 'production');

// https://astro.build/config
export default defineConfig({
  integrations: [{
    name: 'fisio-runtime-url-defaults',
    hooks: {
      'astro:build:done': () => writeFile(new URL('./.runtime-defaults.sh', import.meta.url),
        `FISIO_BUILD_SUPABASE_URL='${publicUrls.PUBLIC_SUPABASE_URL}'\nFISIO_BUILD_BACKEND_URL='${publicUrls.PUBLIC_BACKEND_URL}'\n`),
    },
  }],
  security: {
    csp: {
      scriptDirective: { resources: [{ resource: "'none'", kind: 'attribute' }] },
      // Dynamic clinical views set style attributes; script attributes stay forbidden.
      styleDirective: { resources: [{ resource: "'unsafe-inline'", kind: 'attribute' }] },
      // API connections are constrained by the runtime nginx header; catalogue images remain external.
      directives: ["object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-src 'none'", "worker-src 'none'", "font-src 'self'"],
    },
  },
  // Preserve the existing spacing between inline elements across Astro versions.
  compressHTML: true,
  devToolbar: {
    enabled: false,
  },
  // Puerto de desarrollo
  server: {
    port: 4321,
  },
  // Configuración Vite
  vite: {
    plugins: [tailwindcss(), {
      name: 'fisio-public-configuration',
      // Vite resolves the actual mode; validate its keys and persist the URLs it bundles.
      configResolved({ mode }) { publicUrls = readPublicUrls(mode); },
    }],
  },
});
