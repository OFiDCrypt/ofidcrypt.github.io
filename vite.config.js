import { defineConfig } from 'vite'
import { resolve } from 'path'
import { readdirSync, statSync } from 'fs'

const root = process.cwd()

function getAllHtmlFiles(dir, baseDir = root) {
  let results = []
  const list = readdirSync(dir)

  list.forEach(file => {
    if (file === 'dist' || file === 'node_modules') return

    const filePath = resolve(dir, file)
    const stat = statSync(filePath)

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllHtmlFiles(filePath, baseDir))
    } else if (file.endsWith('.html')) {
      results.push(filePath)
    }
  })

  return results
}

const allHtmlFiles = getAllHtmlFiles(root)

// Create input with better names (preserves some folder structure)
const input = {}
allHtmlFiles.forEach(filePath => {
  let relativePath = filePath.replace(root + '/', '').replace('.html', '')
  // Replace slashes with dashes but keep it readable
  const name = relativePath.replace(/\//g, '-')
  input[name] = filePath
})

export default defineConfig({
  root: '.',
  publicDir: 'assets',           // ← This helps copy assets from your assets/ folder
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: input,
      output: {
        // Try to keep some structure
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