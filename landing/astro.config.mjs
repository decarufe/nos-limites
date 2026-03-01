import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
    site: 'https://nos-limites.com',
    i18n: {
        locales: ['fr', 'en'],
        defaultLocale: 'fr',
        routing: {
            prefixDefaultLocale: false,
        },
    },
    integrations: [sitemap()],
});
