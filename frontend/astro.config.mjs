import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Puerto de desarrollo
  server: {
    port: 4321,
  },
  // Configuración de integración futura con Supabase
  vite: {
    define: {
      'import.meta.env.PUBLIC_SUPABASE_URL': JSON.stringify(process.env.PUBLIC_SUPABASE_URL || ''),
      'import.meta.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.PUBLIC_SUPABASE_ANON_KEY || ''),
    },
  },
});
