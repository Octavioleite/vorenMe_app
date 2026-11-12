import '@fontsource-variable/geist'
import './index.css'

const API = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`
const slug = location.pathname.split('/')[1]?.toLowerCase()

const message = (text: string) => {
  const root = document.getElementById('root')!
  root.className = 'grid min-h-dvh place-items-center p-6 text-center text-muted'
  root.textContent = text
}

// O cartão precisa estar em globalThis.__CARD__ antes de qualquer módulo importar config/creator,
// por isso o App só é importado depois do fetch.
const load = slug
  ? fetch(`${API}/public/cards/${encodeURIComponent(slug)}`).then(async (res) => {
      if (res.status === 404) return null
      if (res.status === 410) return false
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()).data
    })
  : Promise.resolve(undefined)

// Sem slug = página inicial do VorenMe (propaganda + entrar). Sem slug com ?preview = cartão de exemplo
// dentro do iframe da landing (render.tsx recebe o modelo por postMessage).
if (!slug && !new URLSearchParams(location.search).has('preview')) import('./Landing')
else load
  .then(async (card) => {
    if (card === null) {
      message('Cartão não encontrado.')
      return
    }
    if (card === false) {
      message('Este cartão está fora do ar no momento.')
      return
    }
    if (card) (globalThis as { __CARD__?: unknown }).__CARD__ = card
    await import('./render')
  })
  .catch(() => message('Não foi possível carregar o cartão. Tente novamente.'))
