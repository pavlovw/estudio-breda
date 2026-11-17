import { defineConfig } from 'astro/config';

export default defineConfig({
  // host: true permite abrir el sitio desde el celular en la misma red wifi
  server: { host: true, port: 4321 },
});
