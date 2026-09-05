import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://maykon.meneghel.me',
  server: { port: 4322 },
  build: { inlineStylesheets: 'auto' },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt', 'es'],
    routing: { prefixDefaultLocale: false },
  },
});
