import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    root: '.',
    publicDir: 'public',

    optimizeDeps: {
        include: [
            '@phantom/browser-sdk',
            'buffer'
        ],
        force: true
    },

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
        {
            ...viteStaticCopy({
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
                    { src: 'docs', dest: '.' },
                    { src: 'pages', dest: '.' },
                    { src: 'explore', dest: '.' },
                    { src: 'game', dest: '.' },
                    { src: 'promote', dest: '.' },
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
                            'wallet.html',
                            'shop.html',
                            'callback.html'
                        ]
                    }
                ]
            }),
            apply: 'build'
        }
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