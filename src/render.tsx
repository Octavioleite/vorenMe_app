import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { creator, setCreator } from './config/creator'
import { refreshDerived } from './config/derived'
import type { CreatorConfig } from './config/types'
import { applyHead } from './lib/head'
import { startTracking } from './lib/track'

applyHead(creator)

export const PREVIEW_MSG = 'vorenme:preview'

/** Dentro do iframe do painel: recebe o cartão a cada alteração e re-renderiza na hora, sem recarregar. */
function Preview() {
  const [, rerender] = useState(0)
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.data?.type !== PREVIEW_MSG) return
      const next = e.data.config as CreatorConfig
      // Mantém o tema escolhido no botão da pré-visualização; só troca se o campo "tema" do cartão mudou.
      const keepTheme = next.theme === creator.theme
      setCreator(next)
      refreshDerived()
      applyHead(next, keepTheme)
      rerender((n) => n + 1)
      // Landing: "Ver o Conecta em ação" abre o exemplo já no bloco pedido.
      if (typeof e.data.scroll === 'string') setTimeout(() => document.getElementById(e.data.scroll)?.scrollIntoView({ block: 'start' }), 300)
    }
    addEventListener('message', onMessage)
    parent.postMessage({ type: 'vorenme:ready' }, location.origin) // avisa o painel que já pode mandar
    return () => removeEventListener('message', onMessage)
  }, [])
  return <App />
}

const inPanel = window.parent !== window && new URLSearchParams(location.search).has('preview')
const slug = location.pathname.split('/')[1]
if (!inPanel && slug) startTracking(slug, creator.connect?.actions.map((a) => a.id))

createRoot(document.getElementById('root')!).render(<StrictMode>{inPanel ? <Preview /> : <App />}</StrictMode>)
