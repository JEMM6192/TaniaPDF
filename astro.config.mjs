// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
    integrations: [vue()],
    site: 'https://jemm6192.github.io', 
    base: 'TaniaPDF',
    vite: {
      plugins: [tailwindcss()],
    },
  });
