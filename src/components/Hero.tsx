import { Envelope, MapPin, UserPlus, WhatsappLogo } from '@phosphor-icons/react'
import { useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { creator } from '../config/creator'
import { TEXT_IDS, TEXT_SIZE, type TextId, type TextLayout } from '../config/types'
import { emailHref, initials, whatsappHref } from '../config/derived'
import { useTilt } from '../lib/motion'
import { ExternalLink } from './ui/ExternalLink'
import { SaveContact } from './ui/SaveContact'
import { SmartImage } from './ui/SmartImage'

// Só dentro da prévia do painel os textos podem ser arrastados/redimensionados; cada mudança volta ao editor por postMessage.
const editable = window.parent !== window && new URLSearchParams(location.search).has('preview')
const pct = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10
const px = (v: number) => Math.round(Math.min(TEXT_SIZE.max, Math.max(TEXT_SIZE.min, v)))
const send = (id: TextId, patch: TextLayout) => parent.postMessage({ type: 'vorenme:layout', id, patch }, location.origin)

/** Posição atual do elemento em % do espaço livre do cartão (translate(-x%,-y%) mantém tudo dentro da foto). */
function posOf(el: HTMLElement) {
  const box = el.closest('.id-card')!.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  const free = { w: Math.max(1, box.width - r.width), h: Math.max(1, box.height - r.height) }
  return { x: ((r.left - box.left) / free.w) * 100, y: ((r.top - box.top) / free.h) * 100, free }
}

/** Uma peça de texto: no lugar padrão (dentro do bloco de baixo) ou solta, onde a pessoa deixou. */
function Piece({ id, label, className = '', children }: { id: TextId; label: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  const l = creator.photo.layout?.[id]
  // O arrasto usa transform; some quando a nova posição chega do editor (próximo render).
  useLayoutEffect(() => { if (ref.current) ref.current.style.transform = '' })

  const style: CSSProperties = {
    ...(l?.size && { fontSize: px(l.size) }),
    ...(l?.x !== undefined && l?.y !== undefined && { position: 'absolute', left: `${l.x}%`, top: `${l.y}%`, translate: `-${l.x}% -${l.y}%` }),
  }
  if (!editable) return <span aria-hidden="true" className={className} style={style}>{children}</span>

  const drag = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return
    const el = ref.current!
    const start = { ...posOf(el), cx: e.clientX, cy: e.clientY }
    let dx = 0, dy = 0
    el.setPointerCapture(e.pointerId)
    el.dataset.dragging = ''
    const move = (ev: PointerEvent) => {
      // limita o deslocamento para não sair do cartão
      dx = Math.min(Math.max(ev.clientX - start.cx, (-start.x / 100) * start.free.w), ((100 - start.x) / 100) * start.free.w)
      dy = Math.min(Math.max(ev.clientY - start.cy, (-start.y / 100) * start.free.h), ((100 - start.y) / 100) * start.free.h)
      el.style.transform = `translate(${dx}px, ${dy}px)`
    }
    const up = () => {
      delete el.dataset.dragging
      el.removeEventListener('pointermove', move)
      if (Math.abs(dx) + Math.abs(dy) < 2) return (el.style.transform = '')
      send(id, { x: pct(start.x + (dx / start.free.w) * 100), y: pct(start.y + (dy / start.free.h) * 100) })
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up, { once: true })
    el.addEventListener('pointercancel', up, { once: true })
  }

  const resize = (e: ReactPointerEvent<HTMLSpanElement>) => {
    e.stopPropagation()
    const el = ref.current!
    const handle = e.currentTarget
    const start = { size: parseFloat(getComputedStyle(el).fontSize), w: el.getBoundingClientRect().width, cx: e.clientX, cy: e.clientY }
    let size = px(start.size)
    handle.setPointerCapture(e.pointerId)
    el.dataset.dragging = ''
    const move = (ev: PointerEvent) => {
      size = px(start.size * (1 + (ev.clientX - start.cx + ev.clientY - start.cy) / 2 / start.w))
      el.style.fontSize = `${size}px`
    }
    const up = () => {
      delete el.dataset.dragging
      handle.removeEventListener('pointermove', move)
      send(id, { size })
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up, { once: true })
    handle.addEventListener('pointercancel', up, { once: true })
  }

  // Teclado: setas movem 2% (Shift = 10%); + e - mudam o tamanho.
  const keys = (e: ReactKeyboardEvent<HTMLSpanElement>) => {
    const el = ref.current!
    const step = e.shiftKey ? 10 : 2
    const d = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, number[]>)[e.key]
    if (d) {
      e.preventDefault()
      const { x, y } = posOf(el)
      send(id, { x: pct(x + d[0] * step), y: pct(y + d[1] * step) })
    } else if (e.key === '+' || e.key === '=' || e.key === '-') {
      e.preventDefault()
      send(id, { size: px(parseFloat(getComputedStyle(el).fontSize) + (e.key === '-' ? -2 : 2)) })
    }
  }

  return (
    <span ref={ref} tabIndex={0} role="group" aria-label={`${label}: arraste para mover; setas movem, + e - mudam o tamanho`}
      title="Arraste para mover" onPointerDown={drag} onKeyDown={keys} className={`drag-text ${className}`} style={style}>
      {children}
      <span aria-hidden="true" title="Arraste para mudar o tamanho" className="resize-handle" onPointerDown={resize} />
    </span>
  )
}

/** The business card itself: photo, name, niche, handle. Tilts like a physical card on desktop. */
function IdentityCard() {
  const tilt = useTilt<HTMLDivElement>(editable ? 0 : 7) // na prévia, a inclinação atrapalharia o arrasto
  const { name, username, photo, niche, location } = creator
  const lay = photo.layout ?? {}
  const free = (id: TextId) => lay[id]?.x !== undefined && lay[id]?.y !== undefined
  const pieces: Record<TextId, { label: string; className: string; content: ReactNode } | null> = {
    first: { label: 'Nome', className: 'id-name block', content: name.first },
    last: { label: 'Sobrenome', className: 'id-name block', content: <>{name.last}<span className="text-accent">.</span></> },
    niche: { label: 'Especialidade', className: 'block text-[15px] font-medium text-white/90', content: niche },
    username: { label: 'Usuário', className: 'block truncate text-[13px] text-white/70', content: `@${username}` },
    location: location
      ? { label: 'Cidade', className: 'flex shrink-0 items-center gap-1 text-[13px] text-white/70', content: <><MapPin size="1em" aria-hidden="true" />{location}</> }
      : null,
  }
  const piece = (id: TextId, wrap = '') => {
    const p = pieces[id]
    if (!p || free(id)) return null
    return <Piece id={id} label={p.label} className={`${p.className} ${wrap}`}>{p.content}</Piece>
  }
  const moved = TEXT_IDS.filter(free)
  const rowFree = free('username') && (!location || free('location'))

  return (
    <div className="deal">
      <div
        ref={tilt}
        className="id-card on-photo aspect-[4/5] max-h-[58dvh] w-full md:max-h-none lg:max-h-[calc(100dvh-17rem)] lg:min-h-[420px]"
      >
        <SmartImage
          photo={photo}
          widths={[480, 720, 960, 1280]}
          sizes="(min-width: 1200px) 440px, (min-width: 1024px) 38vw, (min-width: 768px) 46vw, 100vw"
          priority
          fallback={initials}
        />
        {/* legibility scrim for the name */}
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/85 via-black/15 via-55% to-transparent" />
        {/* Nome completo para leitores de tela; as peças visíveis são decorativas e podem estar em qualquer lugar. */}
        <h1 id="creator-name" className="sr-only">{name.first} {name.last}</h1>
        <div className="id-copy absolute inset-x-0 bottom-0 p-5 text-[#FAFAF9] sm:p-6">
          {piece('first')}
          {piece('last')}
          {piece('niche', 'mt-3')}
          {!rowFree && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/15 pt-3">
              {piece('username')}
              {piece('location')}
            </div>
          )}
        </div>
        {moved.map((id) => {
          const p = pieces[id]
          return p && <Piece key={id} id={id} label={p.label} className={`${p.className} text-[#FAFAF9] [text-shadow:0_1px_12px_rgb(0_0_0/0.45)]`}>{p.content}</Piece>
        })}
        <span aria-hidden="true" className="id-sheen" />
      </div>
    </div>
  )
}

const i = (n: number) => ({ '--i': n }) as CSSProperties

export function Hero({ className = '' }: { className?: string }) {
  const { bio, labels } = creator
  const primary = whatsappHref
    ? { href: whatsappHref, label: labels.whatsapp, Icon: WhatsappLogo }
    : emailHref
      ? { href: emailHref, label: labels.email, Icon: Envelope }
      : undefined

  return (
    <header aria-labelledby="creator-name" className={`md:grid md:grid-cols-2 md:items-end md:gap-8 lg:block ${className}`}>
      <IdentityCard />
      <div className="hero-copy mt-6 md:mt-0 lg:mt-6">
        <p className="rise max-w-[38ch] text-[17px] leading-[1.5] text-ink/85 md:text-lg" style={i(2)}>
          {bio}
        </p>
        <div id="hero-cta" className="rise mt-5 grid grid-cols-2 gap-2" style={i(3)}>
          {primary && (
            <ExternalLink
              href={primary.href}
              className="press flex h-[52px] items-center justify-center gap-2 rounded-[var(--radius-ctl)] bg-accent px-4 text-[15px] font-semibold text-accent-fg hover:brightness-110"
            >
              <primary.Icon size={20} weight="bold" aria-hidden="true" />
              {primary.label}
            </ExternalLink>
          )}
          <SaveContact
            className={`press flex h-[52px] items-center justify-center gap-2 rounded-[var(--radius-ctl)] border border-line-strong bg-surface px-4 text-[15px] font-semibold hover:bg-surface-2 ${primary ? '' : 'col-span-2'}`}
          >
            <UserPlus size={20} weight="bold" aria-hidden="true" />
            {labels.saveContact}
          </SaveContact>
        </div>
      </div>
    </header>
  )
}
