// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://Bdavid117.github.io',
  base: '/Hackaton',
  output: 'server', // Nota: GH Pages no corre SSR. Se subirá el layout estático.
  adapter: node({ mode: 'standalone' }),
