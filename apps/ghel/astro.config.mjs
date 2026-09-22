import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ghel.meneghel.me',
  server: { port: 4324 },
  build: { inlineStylesheets: 'always' },
});
