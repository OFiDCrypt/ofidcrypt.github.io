import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  root: './',
// ✅ Enable public folder (critical for callback.html)
    publicDir: 'public',

  // Silences the warning notifications for static global browser files
  experimental: {
    skipMethodCheck: true
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        shop: resolve(__dirname, 'shop.html'),
        wallet: resolve(__dirname, 'wallet.html'),
        callback: resolve(__dirname, 'public/auth/callback.html'),
      },
      external: [
        '/assets/js/ofid-main.js',
        '/assets/js/webapp/shop.js',
        'assets/js/webapp/swapUtils.js'
      ]
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        // 1. Core Codebase Folders (Copies sub-directories cleanly into /dist)
        { src: 'pages/*', dest: 'pages' },
        { src: 'docs/*', dest: 'docs' },
        { src: 'explore/*', dest: 'explore' },
        { src: 'game/*', dest: 'game' },
        { src: 'promote/*', dest: 'promote' },

        // 2. Loose Root Static HTML Layouts
        { src: 'index.html', dest: './' },
        { src: '404.html', dest: './' },
        { src: 'discover.html', dest: './' },
        { src: 'explore.html', dest: './' },
        { src: 'onegiddy.html', dest: './' },
        { src: 'bouncyball.html', dest: './' },
        { src: 'kincommunity.html', dest: './' },
        { src: 'ofidkid.html', dest: './' },
        { src: 'ofidtales.html', dest: './' },
        { src: 'redeem.html', dest: './' },
        { src: 'redeem-backup.html', dest: './' },
        { src: 'swap-test.html', dest: './' },
        { src: 'posts-page2.html', dest: './' },
        { src: 'cashlinks.html', dest: './' },
        { src: 'cashlinks-updater.html', dest: './' },
        
        // 3. Application Metadata, Graphics, and JSON Configuration Metrics
        { src: '*.png', dest: './' },
        { src: '*.PNG', dest: './' },
        { src: '*.ico', dest: './' },
        { src: '*.txt', dest: './' },
        { src: '*.xml', dest: './' },
        { src: '*.json', dest: './' },
        { src: 'CNAME', dest: './' },
        { src: 'robots.txt', dest: './' },
        { src: 'sitemap.xml', dest: './' }
      ]
    })
  ]
});
