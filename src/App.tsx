import { Footer } from './components/Footer'
import { useEffect, useRef } from 'react'
import { editable, Hero } from './components/Hero'
import { MobileDock } from './components/MobileDock'
import { BrandsTile } from './components/tiles/BrandsTile'
import { ConnectTile } from './components/tiles/ConnectTile'
import { CouponsTile } from './components/tiles/CouponsTile'
import { FeaturedTile } from './components/tiles/FeaturedTile'
import { NowTile } from './components/tiles/NowTile'
import { LocalTile } from './components/tiles/LocalTile'
import { PixTile } from './components/tiles/PixTile'
import { PartnershipTile } from './components/tiles/PartnershipTile'
import { QrTile } from './components/tiles/QrTile'
import { SocialTiles } from './components/tiles/SocialTiles'
import { TopBar } from './components/TopBar'
import { SimpleCard } from './components/SimpleCard'
import { creator } from './config/creator'
import { blockOrder, CARD_BLOCKS, type BlockId } from './config/types'
import { useReveal } from './lib/motion'

const BY_CLASS = Object.fromEntries(Object.entries(CARD_BLOCKS).map(([id, cls]) => [cls, id as BlockId]))
const blockOf = (el: EventTarget | null) => {
  const tile = (el as Element | null)?.closest?.('.tiles > *')
  const id = tile && [...tile.classList].map((c) => BY_CLASS[c]).find(Boolean)
  return id ? { tile: tile as HTMLElement, id } : null
}

/** Na prévia do painel, cada bloco pode ser arrastado para outro lugar; a nova ordem vai para o editor.
 *  Mouse: arrastar. Toque: segurar meio segundo e arrastar (deslizar sem segurar continua rolando a página). */
const HOLD_MS = 350
function useBlockDrag(off: boolean) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!editable || !el) return
    const ac = new AbortController()
    const signal = ac.signal
    const sync = () => el.querySelectorAll<HTMLElement>(':scope > *').forEach((t) => t.toggleAttribute('data-block', !!blockOf(t)))
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(el, { childList: true })

    let drag: { id: BlockId; tile: HTMLElement; sx: number; sy: number; live: boolean; timer?: number } | null = null
    let over: HTMLElement | null = null
    const mark = (t: HTMLElement | null) => { over?.removeAttribute('data-drop'); over = t; t?.setAttribute('data-drop', '') }
    const lift = () => { if (drag) { drag.live = true; drag.tile.setAttribute('data-lift', ''); navigator.vibrate?.(10) } }

    el.addEventListener('dragstart', (e) => e.preventDefault(), { signal }) // links e imagens têm arrasto nativo próprio
    el.addEventListener('pointerdown', (e) => {
      const b = blockOf(e.target)
      if (e.button !== 0 || !b || (e.target as Element).closest('input, textarea, select')) return
      drag = { ...b, sx: e.clientX, sy: e.clientY, live: false }
      if (e.pointerType === 'touch') drag.timer = window.setTimeout(lift, HOLD_MS)
    }, { signal })
    addEventListener('pointermove', (e) => {
      if (!drag) return
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy
      if (!drag.live) {
        if (Math.hypot(dx, dy) < 6) return
        if (e.pointerType === 'touch') return void (clearTimeout(drag.timer), (drag = null)) // deslizou antes de segurar: é rolagem
        lift()
      }
      drag.tile.style.translate = `${dx}px ${dy}px`
      const t = blockOf(document.elementFromPoint(e.clientX, e.clientY)) // o bloco levantado tem pointer-events: none (index.css)
      mark(t && t.id !== drag.id ? t.tile : null)
    }, { signal })
    // Depois de segurar, o dedo arrasta o bloco em vez de rolar a página.
    addEventListener('touchmove', (e) => { if (drag?.live) e.preventDefault() }, { passive: false, signal })
    const end = () => {
      if (!drag) return
      clearTimeout(drag.timer)
      if (drag.live) {
        const to = over && blockOf(over)
        if (to) parent.postMessage({ type: 'vorenme:move', from: drag.id, to: to.id }, location.origin)
        drag.tile.style.translate = ''
        drag.tile.removeAttribute('data-lift')
        mark(null)
        // O clique que o navegador manda ao soltar não abre o link do bloco.
        const eat = (ev: Event) => { ev.preventDefault(); ev.stopPropagation() }
        addEventListener('click', eat, { capture: true, once: true })
        setTimeout(() => removeEventListener('click', eat, { capture: true }), 300)
      }
      drag = null
    }
    addEventListener('pointerup', end, { signal })
    addEventListener('pointercancel', end, { signal })
    return () => { ac.abort(); mo.disconnect() }
  }, [off]) // 'simples' não tem blocos: ao sair dele, a grade monta e precisa dos ouvintes
  return ref
}

/**
 * Composition
 *  mobile  : top bar → card → bio + actions → conecta → socials 2×2 → featured → partnership → now
 *  tablet  : card and bio side by side, tiles below
 *  Cada estilo (config.style) recompõe isto em CSS pelas classes layout/hero-col/tiles/t-* (index.css).
 *  desktop : the card stays pinned on the left (5 cols) while the tiles scroll on the right (7 cols):
 *            featured · socials 2×2 · partnership · now | QR
 */
export default function App() {
  useReveal(creator) // a prévia troca o cartão sem remontar: blocos novos também precisam entrar
  const tiles = useBlockDrag(creator.style === 'simples')
  if (creator.style === 'simples') return <SimpleCard />
  const hasNow = !!creator.now
  // Ordem escolhida no painel vence as classes order-* e a composição de cada estilo (index.css). QR fica colado ao Bloco extra.
  const order = creator.order && blockOrder(creator)
  const orderCss = order && order.map((id, i) => `.tiles>.${CARD_BLOCKS[id]}{order:${i * 2} !important}`).join('')
    + `.tiles>.t-qr{order:${order.indexOf('extra') * 2 + 1} !important}`
  // Largura escolhida no painel vence a do estilo. "Metade" = metade das colunas da grade do estilo (--half, index.css).
  const widthCss = Object.entries(creator.width ?? {}).map(([id, w]) => id in CARD_BLOCKS
    && `.tiles>.${CARD_BLOCKS[id as BlockId]}{grid-column:${w === 'full' ? '1 / -1' : 'span var(--half, 1)'} !important}`).filter(Boolean).join('')

  return (
    <>
      {(orderCss || widthCss) && <style>{`${orderCss || ''}${widthCss}`}</style>}
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10">
        <TopBar />
        <div className="layout lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">
          <Hero className="hero-col lg:top-6 lg:[@media(min-height:44rem)]:sticky lg:col-span-5" />
          <main ref={tiles} className="tiles mt-10 grid grid-cols-2 gap-3 md:mt-12 lg:col-span-7 lg:mt-0">
            <ConnectTile className="col-span-2" />
            <SocialTiles className="t-social order-1 col-span-2 lg:order-2" />
            <FeaturedTile className="t-featured order-2 col-span-2 lg:order-1" />
            <LocalTile className="t-local order-3 col-span-2" />
            <PixTile className="t-pix order-3 col-span-2" />
            <CouponsTile className="t-coupons order-3 col-span-2" />
            <PartnershipTile className="t-pship order-3 col-span-2" />
            <NowTile className={`t-now order-4 col-span-2 ${hasNow ? 'lg:col-span-1' : ''}`} />
            <QrTile className={`t-qr order-5 hidden lg:flex ${hasNow ? 'lg:col-span-1' : 'lg:col-span-2'}`} />
            <BrandsTile className="t-brands order-6 col-span-2" />
          </main>
        </div>
        <Footer />
      </div>
      <MobileDock />
    </>
  )
}
