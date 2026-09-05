import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://manu.meneghel.me',
  server: { port: 4323 },
  build: { inlineStylesheets: 'auto' },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt', 'es'],
    routing: { prefixDefaultLocale: false },
  },
});
