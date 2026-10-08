import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../frontend/src/pages/index.astro', import.meta.url), 'utf8');
const greeting = source.match(/const hour = new Date\(\)\.getHours\(\);[\s\S]*?dashboardTitle\.textContent = [^\n]+;/)?.[0];
assert.ok(greeting, 'El saludo del inicio debe seguir disponible');
for (const [hour, displayName, expected] of [
  [9, 'Carla', 'Buenos días, Carla'],
  [16, 'Carla JL', 'Buenas tardes, Carla JL'],
  [21, 'Carla', 'Buenas noches, Carla'],
  [16, 'qa-browser@example.invalid', 'Buenas tardes'],
]) {
  const dashboardTitle = {};
  runInNewContext(greeting, { dashboardTitle, displayName, Date: class { getHours() { return hour; } } });
  assert.equal(dashboardTitle.textContent, expected);
}
console.log('PASS: saludo personalizado con nombre; sin correo largo en el título.');
