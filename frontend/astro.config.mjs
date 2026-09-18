import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Puerto de desarrollo
  server: {
    port: 4321,
  },
  // Configuración Vite
  vite: {
    plugins: [tailwindcss()],
  },
});
