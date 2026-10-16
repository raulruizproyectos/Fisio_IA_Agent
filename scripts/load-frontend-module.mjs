// Import the real TypeScript modules in Node without adding a build or test dependency.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const ts = createRequire(new URL('../frontend/package.json', import.meta.url))('typescript');
const modules = new Map();

async function moduleUrl(file) {
  if (!modules.has(file.href)) modules.set(file.href, (async () => {
    const source = await readFile(file, 'utf8');
    let code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    for (const match of code.matchAll(/from\s+(['"])(\.[^'"]+)\1/g)) {
      const path = match[2];
      const dependency = await moduleUrl(new URL(path.endsWith('.ts') ? path : path + '.ts', file));
      code = code.replaceAll(match[1] + path + match[1], JSON.stringify(dependency));
    }
    return 'data:text/javascript;base64,' + Buffer.from(code + '\n//# sourceURL=' + file.href).toString('base64');
  })());
  return modules.get(file.href);
}

export async function loadFrontendModule(path) {
  return import(await moduleUrl(new URL('../frontend/src/' + path, import.meta.url)));
}
