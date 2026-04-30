import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSON5 from 'json5'
import react from '@vitejs/plugin-react'
import updateVersionPlugin from './vite-plugin-update-version.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const configPath = resolve(__dirname, 'public/config.json5')

interface NetworkConfig {
  slug: string
  rpcUrl: string
  statsUrl?: string
}

// Load public/config.json5 to drive the dev proxy. Returns null if absent —
// the production build does not need this file (the runtime container reads
// config.json5 mounted at startup), so it must not block `vite build`.
function loadDevConfig(): { networks: NetworkConfig[] } | null {
  try {
    return JSON5.parse(readFileSync(configPath, 'utf-8'))
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

// Regex-anchored exact-match keys (^/rpc/{slug}$) match nginx `location =`
// semantics; default Vite proxy keys are prefix-match and would leak
// /rpc/{slug}XYZ to the upstream. `changeOrigin: true` rewrites Host like
// nginx's `proxy_set_header Host`. `rewrite: () => '/'` strips the prefix
// to match the entrypoint's `rewrite ^ / break;`.
function buildProxyTable(networks: NetworkConfig[]) {
  const proxy: Record<string, { target: string; changeOrigin: boolean; rewrite: (p: string) => string; secure?: boolean }> = {}
  for (const n of networks) {
    proxy[`^/rpc/${n.slug}$`] = {
      target: n.rpcUrl,
      changeOrigin: true,
      rewrite: () => '/',
      secure: true,
    }
    if (n.statsUrl) {
      proxy[`^/rpc/stats/${n.slug}$`] = {
        target: n.statsUrl,
        changeOrigin: true,
        rewrite: () => '/',
      }
    }
  }
  return proxy
}

// Dev-only: serve a redacted config.public.json5 from public/config.json5 so
// the SPA can load it the same way it does in production. The browser never
// sees rpcUrl/statsUrl values.
function publicConfigPlugin() {
  return {
    name: 'serve-public-config',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        // Block direct access to the full config (which lives in public/ for
        // vite.config.ts to read). Mirrors nginx's `location = /config.json5
        // { return 404; }` in production.
        if (req.url === '/config.json5' || req.url?.startsWith('/config.json5?')) {
          res.statusCode = 404
          res.end('Not Found')
          return
        }
        if (req.url !== '/config.public.json5') return next()
        try {
          const raw = JSON5.parse(readFileSync(configPath, 'utf-8'))
          const redacted = {
            networks: raw.networks.map((e: { slug: string; name: string; type: string; isArchive: boolean; statsUrl?: string }) => ({
              slug: e.slug,
              name: e.name,
              type: e.type,
              isArchive: e.isArchive,
              hasStats: e.statsUrl != null,
            })),
            pollIntervalMs: raw.pollIntervalMs,
            cacheEnabled: raw.cacheEnabled,
          }
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
          res.end(JSON.stringify(redacted))
        } catch (err) {
          res.statusCode = 500
          res.end(`config.public.json5 generation failed: ${(err as Error).message}`)
        }
      })
    },
  }
}

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    const cfg = loadDevConfig()
    if (!cfg) {
      console.error('\n  public/config.json5 not found.')
      console.error('  Run: cp public/config.example.json5 public/config.json5\n')
      process.exit(1)
    }
    return {
      plugins: [updateVersionPlugin(), react(), publicConfigPlugin()],
      server: {
        port: 5273,
        host: true,
        allowedHosts: ['explorer.ckbdev.com'],
        proxy: buildProxyTable(cfg.networks),
      },
    }
  }
  // build: dev proxy / public-config plugin not needed.
  return {
    plugins: [updateVersionPlugin(), react()],
  }
})
