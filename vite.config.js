import { defineConfig } from 'vite'
import { resolve } from 'path'
import { readdirSync, statSync } from 'fs'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const root = process.cwd()

function getAllHtmlFiles(dir) {
  let results = []
  const list = readdirSync(dir)

  list.forEach(file => {
    if (file === 'dist' || file === 'node_modules') return

    const filePath = resolve(dir, file)
    const stat = statSync(filePath)

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllHtmlFiles(filePath))
    } else if (file.endsWith('.html')) {
      results.push(filePath)
    }
  })

  return results
}

const allHtmlFiles = getAllHtmlFiles(root)

const input = {}
allHtmlFiles.forEach(filePath => {
  const relativePath = filePath.replace(root + '/', '').replace('.html', '')
  const name = relativePath.replace(/\//g, '-')
  input[name] = filePath
})

export default defineConfig({
  root: '.',
  plugins: [
    viteStaticCopy({
      targets: [
        // SEO & icons
        { src: 'robots.txt', dest: '.' },
        { src: 'sitemap.xml', dest: '.' },
        { src: 'favicon.ico', dest: '.' },

        // Data files
        { src: 'cashlinks-data.json', dest: '.' },
        { src: 'giddy.json', dest: '.' },
        { src: 'golden-giddy.json', dest: '.' },
        { src: 'locations.json', dest: '.' },
        { src: 'supply.json', dest: '.' }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: input
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
  css: {
    postcss: {}
  }
})