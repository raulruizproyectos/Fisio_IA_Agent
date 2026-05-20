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
`.trim();

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

content = content.replace(/(import premiumClinicUiStyles[^;]*;\n)/, '$1' + imports + '\n');
content = content.replace(/(<main class="content">\s*)[\s\S]*?(<\/main>)/, '$1' + components + '        $2');

fs.writeFileSync(file, content);
console.log('index.astro successfully updated!');
