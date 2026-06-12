import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          // Copy your regular scripts directly to output without compiling
          src: 'public/legacy-script.js',
          dest: './' 
        }
      ]
    })
  ]
});