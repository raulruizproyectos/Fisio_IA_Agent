// Run after frontend build; verify the policy against the bytes browsers receive.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const nginx = readFileSync(new URL('../frontend/nginx.conf', import.meta.url), 'utf8');
const locations = [...nginx.matchAll(/location[^\{]+\{([^}]+)\}/g)];
assert.equal(locations.length, 4);
assert.ok(nginx.includes('include /etc/fisio/connect-sources.conf;'));
for (const [, config] of locations) {
  assert.ok(config.includes('add_header Content-Security-Policy "frame-ancestors \'self\'; connect-src \'self\' $fisio_connect_sources" always;'), 'Every location must retain frame and connection protection');
  assert.ok(config.includes('add_header Permissions-Policy "camera=(), geolocation=(), payment=(), microphone=(self)" always;'), 'Every location must retain permissions and allow clinical audio');
}

for (const page of ['index.html', 'login/index.html', 'reset-password/index.html', 'reserva/index.html']) {
  const html = readFileSync(new URL('../frontend/dist/' + page, import.meta.url), 'utf8');
  const meta = html.match(/<meta\b[^>]*http-equiv="content-security-policy"[^>]*>/i)?.[0];
  assert.ok(meta, page + ' must enforce a CSP');
  const policy = meta.match(/content="([^"]*)"/)?.[1].replaceAll('&#39;', "'").replaceAll('&amp;', '&');
  const directives = new Map(policy.split(';').filter(Boolean).map(d => { const [name, ...values] = d.trim().split(/\s+/); return [name, values]; }));
  const scripts = directives.get('script-src-elem') || directives.get('script-src');
  assert.ok(scripts?.includes("'self'"));
  assert.ok(!scripts.includes("'unsafe-inline'") && !scripts.includes("'unsafe-eval'") && !scripts.includes('*'));
  assert.deepEqual(directives.get('script-src-attr'), ["'none'"]);
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
  assert.deepEqual(directives.get('base-uri'), ["'none'"]);
  assert.deepEqual(directives.get('form-action'), ["'self'"]);
  assert.deepEqual(directives.get('style-src-attr'), ["'unsafe-inline'"]);
  assert.ok(!/\son[a-z]+\s*=/i.test(html), page + ' cannot depend on inline event handlers');
  assert.ok(html.indexOf(meta) < html.indexOf('<script'), page + ' must enforce CSP before loading scripts');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc=/.test(match[1]) || !match[2].trim() || /type="application\/ld\+json"/.test(match[1])) continue;
    const hash = "'sha256-" + createHash('sha256').update(match[2]).digest('base64') + "'";
    assert.ok(scripts.includes(hash), page + ' inline script must have an exact hash');
  }
}
console.log('PASS: all four built pages enforce CSP before scripts, hash inline code exactly, disable inline handlers/eval/objects/base changes and preserve form/style contracts.');
