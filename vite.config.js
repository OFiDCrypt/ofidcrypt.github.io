import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    root: '.',
    publicDir: 'public',

    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                wallet: resolve(__dirname, 'wallet.html'),
                shop: resolve(__dirname, 'shop.html'),
                callback: resolve(__dirname, 'callback.html'),
            }
        }
    },

    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'assets',
                    dest: '.',
                    overwrite: true,
                    ignore: [
                        'js/webapp/wallet.js',
                        'js/webapp/shop.js',
                        'js/webapp/swapUtils.js'
                    ]
                },

                // Copy all other static folders
                { src: 'docs', dest: '.' },
                { src: 'pages', dest: '.' },
                { src: 'explore', dest: '.' },
                { src: 'game', dest: '.' },
                { src: 'promote', dest: '.' },

                // Copy ALL root HTML files + other static files
                {
                    src: [
                        '*.html',
                        '*.json',
                        '*.txt',
                        '*.xml',
                        '*.ico',
                        '*.PNG',
                        '*.png',
                        'CNAME',
                        'robots.txt',
                        'sitemap.xml'
                    ],
                    dest: '.',
                    ignore: [
                        'wallet.html',      // Already handled as entry point
                        'shop.html',        // Already handled as entry point
                        'callback.html'     // Already handled as entry point
                    ]
                }
            ]
        })
    ],

    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'https://giddy-key-swaps-production.up.railway.app',
                changeOrigin: true,
                secure: true
            }
        }
    }
});
