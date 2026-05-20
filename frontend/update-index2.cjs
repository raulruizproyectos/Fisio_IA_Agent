const fs = require('fs');
const file = 'frontend/src/pages/index.astro';
let content = fs.readFileSync(file, 'utf8');

const imports = `
import DashboardView from '../components/views/DashboardView.astro';
import PatientsView from '../components/views/PatientsView.astro';
import PlantillasView from '../components/views/PlantillasView.astro';
import IntakesView from '../components/views/IntakesView.astro';
import CitasView from '../components/views/CitasView.astro';
import HistorialView from '../components/views/HistorialView.astro';
import PagosView from '../components/views/PagosView.astro';
import GestoriaView from '../components/views/GestoriaView.astro';
import FichaPacienteView from '../components/views/FichaPacienteView.astro';
import BonosView from '../components/views/BonosView.astro';
import FacturacionView from '../components/views/FacturacionView.astro';
import DocumentosView from '../components/views/DocumentosView.astro';
import ConfigView from '../components/views/ConfigView.astro';
`;

const components = `
          <DashboardView />
          <PatientsView />
          <PlantillasView />
          <IntakesView />
          <CitasView />
          <HistorialView />
          <PagosView />
          <GestoriaView />
          <FichaPacienteView />
          <BonosView />
          <FacturacionView />
          <DocumentosView />
          <ConfigView />
`;

// 1. Find the first occurrence of `---` and the second occurrence of `---`
const firstDash = content.indexOf('---');
const secondDash = content.indexOf('---', firstDash + 3);

// 2. Insert imports right before the second `---`
content = content.slice(0, secondDash) + imports + content.slice(secondDash);

// 3. Find the <main class="content"> and </main>
const mainStart = content.indexOf('<main class="content">');
const mainEnd = content.indexOf('</main>', mainStart);

// 4. Replace content between <main ...> and </main> with components
content = content.slice(0, mainStart + '<main class="content">'.length) + '\n' + components + content.slice(mainEnd);

fs.writeFileSync(file, content);
console.log('index.astro successfully updated!');
