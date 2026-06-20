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
                    index: resolve(__dirname, 'index.html'),
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

    // Only apply static copy during build
    if (command === 'build') {
        config.plugins.push(
            viteStaticCopy({
                targets: [
                    // REMOVED: js/webapp folder references from ignore
                    // We only copy assets that are NOT processed by Rollup
                    { src: 'assets', dest: '.' }, 
                    { src: 'docs', dest: '.' },
                    { src: 'pages', dest: '.' },
                    { src: 'explore', dest: '.' },
                    { src: 'game', dest: '.' },
                    { src: 'promote', dest: '.' },
                    {
                        src: ['*.html', '*.json', '*.txt', '*.xml', '*.ico', '*.PNG', '*.png', 'CNAME', 'robots.txt', 'sitemap.xml'],
                        dest: '.',
                        ignore: ['wallet.html', 'shop.html', 'callback.html']
                    }
                ]
            })
        );
    }

    return config;
});