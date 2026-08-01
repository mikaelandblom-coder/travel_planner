import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Folds the JS and CSS into index.html so the build is a single file that can
 * be opened straight from disk. Browsers block module scripts on file://, so
 * the offline build also uses a classic (iife) bundle — see the config below.
 */
function singleFile(): Plugin {
  return {
    name: 'single-file',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const files = Object.values(bundle)
      const html = files.find(f => f.type === 'asset' && f.fileName.endsWith('.html'))
      if (!html || html.type !== 'asset') return

      let source = String(html.source)

      for (const f of files) {
        if (f.type === 'chunk' && f.fileName.endsWith('.js')) {
          // A literal </script> inside the code would end the tag early.
          const code = f.code.replace(/<\/script>/g, '<\\/script>')
          // Vite hoists the entry script into <head>. A module script is
          // deferred there, but a classic one would run before #root exists —
          // so drop the original tag and re-add it at the end of <body>.
          source = source
            .replace(/<script\b[^>]*\bsrc="[^"]*\.js"[^>]*><\/script>/, '')
            .replace('</body>', () => `<script>${code}</script>\n  </body>`)
          delete bundle[f.fileName]
        }
        if (f.type === 'asset' && f.fileName.endsWith('.css')) {
          source = source.replace(
            /<link\b[^>]*\bhref="[^"]*\.css"[^>]*>/,
            () => `<style>${String(f.source)}</style>`,
          )
          delete bundle[f.fileName]
        }
      }

      html.source = source
      html.fileName = 'travel-planner.html'
    },
  }
}

// base: './' makes the build work at any path, including
// https://<user>.github.io/<repo>/ on GitHub Pages.
export default defineConfig(({ mode }) => {
  // `npm run build:file` → one self-contained travel-planner.html in dist-file/.
  const offline = mode === 'file'

  return {
    plugins: offline ? [react(), singleFile()] : [react()],
    base: './',
    build: offline
      ? {
          outDir: 'dist-file',
          assetsInlineLimit: Number.MAX_SAFE_INTEGER, // fold any asset into the HTML
          cssCodeSplit: false,
          modulePreload: false,
          rollupOptions: {
            output: { format: 'iife', inlineDynamicImports: true },
          },
        }
      : {},
  }
})
