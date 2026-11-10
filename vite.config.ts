import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Connect } from 'vite'

// /painel/:id/editar e /admin/usuarios/:id são rotas dos apps (não um cartão): devolve o HTML do app.
// Em produção, a hospedagem precisa da mesma regra (/painel/* -> /painel/index.html, /admin/* -> /admin/index.html).
const painelFallback: Connect.NextHandleFunction = (req, _res, next) => {
  const app = req.url?.split('?')[0].match(/^\/(painel|admin)(\/[^.]*)?$/)?.[1]
  if (app) req.url = `/${app}/index.html`
  next()
}

// Título, tema e cor de cada cartão são aplicados em runtime (src/lib/head.ts), com o cartão vindo da API.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'painel-fallback',
      configureServer: (s) => void s.middlewares.use(painelFallback),
      configurePreviewServer: (s) => void s.middlewares.use(painelFallback),
    },
  ],
  build: {
    rollupOptions: {
      input: { main: 'index.html', painel: 'painel/index.html', admin: 'admin/index.html' },
    },
  },
  server: {
    proxy: { '/api': 'http://localhost:8081' },
  },
})
