// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
    integrations: [ vue({
      template: {
        // Indica a Vue que trate "pdf-viewer-element" como un elemento nativo
        compilerOptions: {
          isCustomElement: (tag) => tag === 'pdf-viewer-element'
        }
      }
    })    // Indica que "pdf-viewer-element" es un elemento personalizado nativo
     ],
    site: 'https://jemm6192.github.io', 
    base: 'TaniaPDF',
    vite: {
      plugins: [tailwindcss()],
    },
  });
