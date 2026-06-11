import { defineConfig } from 'vite'
import { resolve } from 'path'
import { readdirSync, statSync } from 'fs'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const root = process.cwd()

// Recursively find all .html files (excluding dist/ and node_modules)
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

// Create clean input names
const input = {}
allHtmlFiles.forEach(filePath => {
  const relativePath = filePath.replace(root + '/', '').replace('.html', '')
  const name = relativePath.replace(/\//g, '-')
  input[name] = filePath
})

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'assets/js',
          dest: 'assets/js'
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: input,
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
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
  css: {
    postcss: {}
  }
})