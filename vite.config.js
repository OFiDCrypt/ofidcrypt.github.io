import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ command }) => {
    const config = {
        root: '.',
        publicDir: 'public',

        optimizeDeps: {
            include: ['@phantom/browser-sdk', 'buffer'],
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

        server: {
            port: 5173,
            proxy: {
                '/api': {
                    target: 'https://giddy-key-swaps-production.up.railway.app',
                    changeOrigin: true,
                    secure: true
                }
            }
        },

        plugins: []
    };

    if (command === 'build') {
        config.plugins.push(
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
                    { src: 'docs', dest: '.' },
                    { src: 'pages', dest: '.' },
                    { src: 'explore', dest: '.' },
                    { src: 'game', dest: '.' },
                    { src: 'promote', dest: '.' },

                    // Explicit list of HTML files (replaced *.html)
                    {
                        src: [
                            'index.html',
                            '404.html',
                            'bouncyball.html',
                            'cashlinks.html',
                            'cashlinks-updater.html',
                            'discover.html',
                            'explore.html',
                            'kincommunity.html',
                            'ofidkid.html',
                            'ofidtales.html',
                            'onegiddy.html',
                            'posts-page2.html',
                            'promote.html',
                            'redeem.html',
                            'redeem-backup.html',
                            'swap-test.html',
                            'test-sdk.html'
                        ],
                        dest: '.'
                    },

                    // Keep all the other root static files
                    {
                        src: [
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
                        dest: '.'
                    }
                ]
            })
        );
    }

    return config;
});