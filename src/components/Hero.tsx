import { Envelope, MapPin, UserPlus, WhatsappLogo } from '@phosphor-icons/react'
import { useLayoutEffect, useRef, useSyncExternalStore, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { creator } from '../config/creator'
import { EXTRA_SIZE, FONTS, MOBILE_QUERY, TEXT_IDS, TEXT_SIZE, textLayout, type Extra, type TextId, type TextLayout } from '../config/types'
import { connectPrimary, emailHref, initials, whatsappHref } from '../config/derived'
import { CHANNEL_TARGET } from '../lib/links'
import { CHANNEL_ICON } from './icons'
import { useTilt } from '../lib/motion'
import { ExternalLink } from './ui/ExternalLink'
import { SaveContact } from './ui/SaveContact'
import { SmartImage } from './ui/SmartImage'

// Só dentro da prévia do painel os textos podem ser arrastados/redimensionados; cada mudança volta ao editor por postMessage.
export const editable = window.parent !== window && new URLSearchParams(location.search).has('preview')
const pct = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10
const px = (v: number) => Math.round(Math.min(TEXT_SIZE.max, Math.max(TEXT_SIZE.min, v)))
const sendText = (id: TextId, patch: TextLayout) =>
  parent.postMessage({ type: 'vorenme:layout', id, patch, mobile: matchMedia(MOBILE_QUERY).matches }, location.origin)
/** Celular e telas maiores têm ajustes de texto separados; troca ao vivo se a tela mudar de tamanho. */
const mq = matchMedia(MOBILE_QUERY)
const useMobile = () => useSyncExternalStore((cb) => (mq.addEventListener('change', cb), () => mq.removeEventListener('change', cb)), () => mq.matches)

/** Peça selecionada na prévia (como no Canva): o editor mostra fonte, cor e tamanho dela. Texto do modelo = TextId; elemento solto = "e:<id>". */
let selected: string | null = null
const subs = new Set<() => void>()
const pick = (id: string | null, el?: HTMLElement) => {
  selected = id
  subs.forEach((f) => f())
  parent.postMessage({ type: 'vorenme:select', id, size: el && parseFloat(getComputedStyle(el).fontSize) }, location.origin)
}
const useSelected = () => useSyncExternalStore((cb) => (subs.add(cb), () => subs.delete(cb)), () => selected)
if (editable) {
  // Tocar fora de um texto desmarca; o editor também pode desmarcar (botão fechar, texto oculto).
  addEventListener('pointerdown', (e) => { if (selected && !(e.target as Element).closest?.('.drag-text')) pick(null) })
  addEventListener('message', (e) => {
    if (e.origin === location.origin && e.data?.type === 'vorenme:select' && e.data.id !== selected) { selected = e.data.id; subs.forEach((f) => f()) }
  })
  // Desfazer/refazer também com o foco dentro da prévia (o atalho não chega ao editor sozinho).
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase()
    if (!(e.metaKey || e.ctrlKey) || (k !== 'z' && k !== 'y')) return
    e.preventDefault()
    parent.postMessage({ type: 'vorenme:undo', redo: k === 'y' || e.shiftKey }, location.origin)
  })
}

/** Posição atual do elemento em % do espaço livre do cartão (translate(-x%,-y%) mantém tudo dentro da foto). */
function posOf(el: HTMLElement) {
  const box = el.closest('.id-card')!.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  const free = { w: Math.max(1, box.width - r.width), h: Math.max(1, box.height - r.height) }
  return { x: ((r.left - box.left) / free.w) * 100, y: ((r.top - box.top) / free.h) * 100, free }
}

const rel = (v: number) => Math.round(Math.min(EXTRA_SIZE.max, Math.max(EXTRA_SIZE.min, v)) * 10) / 10
const at = (x: number, y: number): CSSProperties => ({ position: 'absolute', left: `${x}%`, top: `${y}%`, translate: `-${x}% -${y}%` })

/** Uma peça sobre a foto: texto do modelo (no lugar padrão ou solto) ou elemento solto (extra).
 *  Texto do modelo: tamanho em px, por tela. Extra: tamanho em % da largura do cartão (cqw), igual em toda tela. */
function Piece({ id, label, l, extra, className = '', children }: { id: string; label: string; l?: TextLayout; extra?: Extra; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  // O arrasto usa transform; some quando a nova posição chega do editor (próximo render).
  useLayoutEffect(() => { if (ref.current) ref.current.style.transform = '' })

  const key = extra ? `e:${extra.id}` : id
  const on = useSelected() === key
  const box = !!extra && extra.kind !== 'text'
  const font = (extra ?? l)?.font
  const style: CSSProperties = extra ? {
    ...at(extra.x, extra.y),
    ...(box ? { width: `${extra.size}cqw`, aspectRatio: String(extra.ratio ?? 1) } : { fontSize: `${extra.size}cqw`, color: extra.color ?? '#FAFAF9', maxWidth: '100%' }),
    ...(font && FONTS[font] && { fontFamily: FONTS[font][1] }),
  } : {
    ...(l?.size && { fontSize: px(l.size) }),
    ...(font && FONTS[font] && { fontFamily: FONTS[font][1] }),
    ...(l?.color && { color: l.color }),
    ...(l?.x !== undefined && l?.y !== undefined && at(l.x, l.y)),
  }
  if (!editable) return <span aria-hidden={extra?.kind === 'text' ? undefined : true} className={className} style={style}>{children}</span>

  const send = (patch: TextLayout) => extra
    ? parent.postMessage({ type: 'vorenme:extra', id: extra.id, patch }, location.origin)
    : sendText(id as TextId, patch)
  /** Tamanho atual na unidade da peça, e como aplicar um novo durante o arrasto. */
  const cardW = (el: HTMLElement) => el.closest('.id-card')!.getBoundingClientRect().width
  const sizeOf = (el: HTMLElement) => !extra ? parseFloat(getComputedStyle(el).fontSize)
    : ((box ? el.getBoundingClientRect().width : parseFloat(getComputedStyle(el).fontSize)) / cardW(el)) * 100
  const clamp = extra ? rel : px
  const apply = (el: HTMLElement, v: number) => { el.style[box ? 'width' : 'fontSize'] = extra ? `${v}cqw` : `${v}px` }

  const drag = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return
    const el = ref.current!
    const start = { ...posOf(el), cx: e.clientX, cy: e.clientY }
    let dx = 0, dy = 0
    const off = new AbortController() // solta todos os ouvintes de uma vez (senão o pointercancel sobra e reenvia depois)
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
      off.abort()
      if (Math.abs(dx) + Math.abs(dy) < 2) return (el.style.transform = '', pick(key, el)) // toque sem arrastar = selecionar
      send({ x: pct(start.x + (dx / start.free.w) * 100), y: pct(start.y + (dy / start.free.h) * 100) })
    }
    el.addEventListener('pointermove', move, { signal: off.signal })
    el.addEventListener('pointerup', up, { signal: off.signal })
    el.addEventListener('pointercancel', up, { signal: off.signal })
  }

  const resize = (e: ReactPointerEvent<HTMLSpanElement>) => {
    e.stopPropagation()
    const el = ref.current!
    const handle = e.currentTarget
    const start = { size: sizeOf(el), w: el.getBoundingClientRect().width, cx: e.clientX, cy: e.clientY }
    let size = clamp(start.size)
    const off = new AbortController()
    handle.setPointerCapture(e.pointerId)
    el.dataset.dragging = ''
    const move = (ev: PointerEvent) => {
      size = clamp(start.size * (1 + (ev.clientX - start.cx + ev.clientY - start.cy) / 2 / start.w))
      apply(el, size)
    }
    const up = () => {
      delete el.dataset.dragging
      off.abort()
      send({ size })
      pick(key, el)
    }
    handle.addEventListener('pointermove', move, { signal: off.signal })
    handle.addEventListener('pointerup', up, { signal: off.signal })
    handle.addEventListener('pointercancel', up, { signal: off.signal })
  }

  // Teclado: setas movem 2% (Shift = 10%); + e - mudam o tamanho.
  const keys = (e: ReactKeyboardEvent<HTMLSpanElement>) => {
    const el = ref.current!
    const step = e.shiftKey ? 10 : 2
    const d = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, number[]>)[e.key]
    if (d) {
      e.preventDefault()
      const { x, y } = posOf(el)
      send({ x: pct(x + d[0] * step), y: pct(y + d[1] * step) })
    } else if (e.key === '+' || e.key === '=' || e.key === '-') {
      e.preventDefault()
      send({ size: clamp(sizeOf(el) + (e.key === '-' ? -1 : 1) * (extra ? 1 : 2)) })
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      send({ hidden: true })
    }
  }

  return (
    <span ref={ref} tabIndex={0} role="group" aria-label={`${label}: toque para mudar fonte e cor; arraste para mover; setas movem, + e - mudam o tamanho, Delete tira do cartão`}
      title="Toque para editar, arraste para mover" onPointerDown={drag} onKeyDown={keys} onFocus={(e) => !on && e.currentTarget.matches(':focus-visible') && pick(key, e.currentTarget)}
      data-selected={on || undefined} className={`drag-text ${className}`} style={style}>
      {children}
      <span aria-hidden="true" title="Arraste para mudar o tamanho" className="resize-handle" onPointerDown={resize} />
      <span aria-hidden="true" title="Tirar do cartão" className="remove-handle"
        onPointerDown={(e) => e.stopPropagation()} onClick={() => send({ hidden: true })}>×</span>
    </span>
  )
}

/** The business card itself: photo, name, niche, handle. Tilts like a physical card on desktop. */
function IdentityCard() {
  const tilt = useTilt<HTMLDivElement>(editable ? 0 : 7) // na prévia, a inclinação atrapalharia o arrasto
  const { name, username, photo, niche, location } = creator
  const lay = textLayout(photo, useMobile())
  const free = (id: TextId) => lay[id]?.x !== undefined && lay[id]?.y !== undefined
  const gone = (id: TextId) => !!lay[id]?.hidden
  const pieces: Record<TextId, { label: string; className: string; content: ReactNode } | null> = {
    // Sem sobrenome (lojas, marcas): o ponto de destaque vai para o fim do nome.
    first: { label: 'Nome', className: 'id-name block w-fit', content: name.last ? name.first : <>{name.first}<span className="text-accent">.</span></> },
    last: name.last ? { label: 'Sobrenome', className: 'id-name block w-fit', content: <>{name.last}<span className="text-accent">.</span></> } : null,
    niche: { label: 'Especialidade', className: 'id-niche block w-fit text-[15px] font-medium text-white/90', content: niche },
    username: { label: 'Usuário', className: 'id-handle block w-fit max-w-full truncate text-[13px] text-white/70', content: `@${username}` },
    location: location
      ? { label: 'Cidade', className: 'flex shrink-0 items-center gap-1 text-[13px] text-white/70', content: <><MapPin size="1em" aria-hidden="true" />{location}</> }
      : null,
  }
  // Peça solta deixa o lugar reservado (invisível): senão as outras do bloco se mexem para ocupar o espaço.
  const piece = (id: TextId, wrap = '') => {
    const p = pieces[id]
    if (!p || gone(id)) return null
    // O lugar reservado é um span comum: o Piece aplicaria position:absolute do layout e não ocuparia espaço.
    if (free(id)) return <span aria-hidden="true" className={`${p.className} ${wrap} invisible`}>{p.content}</span>
    return <Piece id={id} label={p.label} l={lay[id]} className={`${p.className} ${wrap}`}>{p.content}</Piece>
  }
  const moved = TEXT_IDS.filter((id) => free(id) && !gone(id))
  const out = (id: TextId) => free(id) || gone(id)
  const rowFree = out('username') && (!location || out('location'))
  const rowGone = gone('username') && (!location || gone('location'))

  return (
    <div className="deal">
      <div
        ref={tilt}
        className="id-card on-photo aspect-[4/5] max-h-[58dvh] w-full md:max-h-[max(320px,calc(100dvh-8rem))] lg:max-h-[calc(100dvh-17rem)] lg:min-h-[420px]"
      >
        <SmartImage
          photo={photo}
          widths={[480, 720, 960, 1280]}
          sizes="(min-width: 1200px) 440px, (min-width: 1024px) 38vw, (min-width: 768px) 46vw, 100vw"
          priority
          fallback={initials}
          className="id-photo"
        />
        {/* legibility scrim for the name */}
        <div aria-hidden="true" className="id-scrim absolute inset-0 bg-linear-to-t from-black/85 via-black/15 via-55% to-transparent" />
        {/* Nome completo para leitores de tela; as peças visíveis são decorativas e podem estar em qualquer lugar. */}
        <h1 id="creator-name" className="sr-only">{name.first} {name.last}</h1>
        {/* Elementos soltos ficam atrás dos textos do modelo (uma forma vira fundo do nome, por exemplo). */}
        {(creator.extras ?? []).map((x) => {
          const radius = x.round ? '999px' : '1.5cqw'
          return (
            <Piece key={x.id} id={x.id} extra={x} label={x.kind === 'text' ? 'Texto' : x.kind === 'shape' ? 'Forma' : 'Imagem'}
              className={`block ${x.kind === 'text' ? 'display leading-[1.05] font-semibold whitespace-pre-line [text-shadow:0_1px_12px_rgb(0_0_0/0.35)]' : ''}`}>
              {x.kind === 'text' ? x.text
                : x.kind === 'shape' ? <span className="block size-full" style={{ background: x.color ?? 'var(--accent)', borderRadius: radius }} />
                : <span className="block size-full overflow-hidden" style={{ borderRadius: radius }}><img src={x.src} alt="" draggable={false} className="size-full object-cover" /></span>}
            </Piece>
          )
        })}
        <div className="id-copy absolute inset-x-0 bottom-0 p-5 text-[#FAFAF9] sm:p-6">
          {piece('first')}
          {piece('last')}
          {piece('niche', 'mt-3')}
          <div className={`mt-4 flex items-center justify-between gap-3 border-t border-white/15 pt-3 ${rowGone ? 'hidden' : rowFree ? 'invisible' : ''}`}>
            {piece('username')}
            {piece('location')}
          </div>
        </div>
        {moved.map((id) => {
          const p = pieces[id]
          return p && <Piece key={id} id={id} label={p.label} l={lay[id]} className={`${p.className} text-[#FAFAF9] [text-shadow:0_1px_12px_rgb(0_0_0/0.45)]`}>{p.content}</Piece>
        })}
        <span aria-hidden="true" className="id-sheen" />
      </div>
    </div>
  )
}

const i = (n: number) => ({ '--i': n }) as CSSProperties

export function Hero({ className = '' }: { className?: string }) {
  const { bio, labels } = creator
  // Conecta ligado: a ação principal do dono toma o lugar do WhatsApp genérico.
  const primary = connectPrimary
    ? { href: connectPrimary.href, label: connectPrimary.action.label, Icon: CHANNEL_ICON[connectPrimary.action.channel],
        track: { 'data-track': CHANNEL_TARGET[connectPrimary.action.channel], 'data-action': connectPrimary.action.id } }
    : whatsappHref
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
              {...('track' in primary ? primary.track : {})}
              className="press flex min-h-[52px] items-center justify-center gap-2 rounded-[var(--radius-ctl)] bg-accent px-3 py-2 text-center text-[15px] leading-tight sm:px-4 font-semibold text-accent-fg hover:brightness-110"
            >
              <primary.Icon size={20} weight="bold" aria-hidden="true" className="shrink-0" />
              {primary.label}
            </ExternalLink>
          )}
          <SaveContact
            className={`press flex min-h-[52px] items-center justify-center gap-2 rounded-[var(--radius-ctl)] border border-line-strong bg-surface px-3 py-2 text-center text-[15px] leading-tight sm:px-4 font-semibold hover:bg-surface-2 ${primary ? '' : 'col-span-2'}`}
          >
            <UserPlus size={20} weight="bold" aria-hidden="true" className="shrink-0" />
            {labels.saveContact}
          </SaveContact>
        </div>
      </div>
    </header>
  )
}
