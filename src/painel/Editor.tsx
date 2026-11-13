import {
  ArrowCounterClockwise, ArrowLeft, CaretDown, CaretUp, DotsSixVertical, Desktop, DeviceMobile, CircleNotch, NavigationArrow, ArrowRight, Target, ArrowSquareOut, ChatCircleText, Check, CloudArrowUp, Confetti, Copy, WarningCircle, Code, Eye, EyeSlash, GearSix, IdentificationCard, Image as ImageIcon, User, X, LinkSimple, ListBullets, MapPin, Megaphone, CurrencyDollar, Palette, Plus, ShareNetwork, Sparkle, TextT, Ticket, Star, Trash, ArrowUUpLeft, ArrowUUpRight, Square, Circle,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { platformMeta } from '../components/icons'
import { addressFromCep, addressFromGeo, placeLinks } from '../lib/places'
import { CARD_BLOCKS, EXTRA_SIZE, FONTS, MAX_EXTRAS, STYLES, TEXT_IDS, TEXT_SIZE, blockOrder, textLayout, type BlockId, type Extra, type FontId, type CreatorConfig, type Style, type TextId, type TextLayout, type Platform, type SocialLink } from '../config/types'
import { api, ApiError, uploadImage, type Card } from './api'
import { ConnectEditor } from './ConnectEditor'
import { DevicePreview } from './DevicePreview'
import { GuideButton } from './Guide'
import { confetti } from './confetti'
import { SLUG, forSave, socialFrom, socialText, toSlug, waNumber } from './forSave'
import { Errors, Field, FEATURED_SPEC, ImagePicker, PHOTO_SPEC, PhotoFrame, PhotoHint, ask, useCopyLink, Section, Tags, Thumb, errorText, iconBtn, input, primary, secondary } from './ui'

const PLATFORMS = Object.keys(platformMeta) as Platform[]
const NAV = [['identidade', 'Você'], ['aparencia', 'Visual'], ['contato', 'Contato'], ['blocos', 'Blocos']] as const
/** Criação em 3 etapas; os blocos opcionais (Conecta, Pix, cupons...) ficam para depois, no editor completo. */
const STEPS: [string, string[], string, string][] = [
  ['Você', ['identidade'], 'Quem é você?', 'Foto, nome e uma frase sobre o que você faz.'],
  ['Visual', ['aparencia'], 'Escolha a cara do cartão', 'Um estilo e uma cor. Dá para trocar quando quiser.'],
  ['Contato', ['contato', 'redes'], 'Como te encontram', 'WhatsApp e redes viram botões de um toque no cartão.'],
]
/** Blocos opcionais: só aparecem no editor quando estão ativos ou a pessoa toca em Adicionar. */
const BLOCKS: { id: string; title: string; text: string; Icon: typeof Target; on: (c: CreatorConfig) => boolean }[] = [
  { id: 'conecta', title: 'VorenMe Conecta', text: 'Pedidos, agendamentos e contatos', Icon: Target, on: (c) => !!c.connect },
  { id: 'local', title: 'Localização', text: 'CEP ou GPS, rotas no Maps, Waze e Uber', Icon: MapPin, on: (c) => !!(c.address || c.review) },
  { id: 'pix', title: 'Pix', text: 'Sua chave para receber', Icon: CurrencyDollar, on: (c) => !!c.pix },
  { id: 'chamada', title: 'Chamada principal', text: 'Convite para trabalhar com você', Icon: Megaphone, on: () => true },
  { id: 'cupons', title: 'Cupons', text: 'Códigos de desconto', Icon: Ticket, on: (c) => !!c.coupons?.length },
  { id: 'destaque', title: 'Destaque', text: 'Um vídeo ou post em evidência', Icon: Star, on: (c) => !!c.featured },
  { id: 'extra', title: 'Bloco extra', text: 'Texto livre com etiquetas', Icon: Sparkle, on: (c) => !!c.now },
  { id: 'marcas', title: 'Marcas', text: 'Com quem você já trabalhou', Icon: ListBullets, on: (c) => !!c.brands?.length },
]
const isBlock = (id: string) => BLOCKS.some((b) => b.id === id)
/** Linhas de "Ordem no cartão": Redes + os blocos que existem em CARD_BLOCKS (Conecta fica sempre em 1º). */
const ORDER_ROWS = [{ id: 'redes', title: 'Redes', Icon: LinkSimple, on: (c: CreatorConfig) => c.socials.length > 0 }, ...BLOCKS]
/** Abre a seção e tudo que a contém (<details>) antes de rolar até ela. */
const goTo = (id: string) => {
  const el = document.getElementById(id)
  if (!el) return
  for (let d: HTMLElement | null = el; d; d = d.parentElement) if (d instanceof HTMLDetailsElement) d.open = true
  el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}
const count = (n: number | undefined, one: string, many: string) => (n ? `${n} ${n === 1 ? one : many}` : undefined)
const TEXT_LABELS: [TextId, string][] = [['first', 'Nome'], ['last', 'Sobrenome'], ['niche', 'Especialidade'], ['username', 'Usuário'], ['location', 'Cidade']]
const KINDS = [{ id: 'video', label: 'Vídeo' }, { id: 'post', label: 'Post' }, { id: 'project', label: 'Projeto' }] as const
/** Nome e nicho de cada estilo; o nome aparece na fonte do próprio estilo (index.css, [data-style]). */
const STYLE_NAMES: Record<Style, [string, string]> = {
  criador: ['Criador', 'Influência, conteúdo'],
  forte: ['Forte', 'Automotivo, esporte'],
  tinta: ['Tinta', 'Barbearia, tatuagem'],
  atelie: ['Ateliê', 'Salão, moda, loja'],
  sereno: ['Sereno', 'Terapia, estética'],
  glam: ['Glam', 'Unhas, cílios'],
  clinica: ['Clínica', 'Saúde, odontologia'],
  leve: ['Leve', 'Pet, comida, infantil'],
  sobrio: ['Sóbrio', 'Advocacia, finanças, imóveis'],
  palco: ['Palco', 'Música, DJ, eventos'],
  oficio: ['Ofício', 'Serviços, obra, reforma'],
  galeria: ['Galeria', 'Foto, arquitetura, design'],
  simples: ['Simples', 'Só o essencial'],
}
const SWATCHES = ['#6D3BF5', '#E8552B', '#2A7A8C', '#3B82C4', '#7A8F6B', '#B5838D', '#121214']

const AUTOSAVE_MS = 900
const UNDO_GAP_MS = 600
const UNDO_MAX = 100

const PREVIEW_MSG = 'vorenme:preview' // mesmo valor de src/render.tsx

/** Link do cartão com botão de copiar (diálogo de conclusão). */
function CopyLink({ url }: { url: string }) {
  const { done: copied, copy } = useCopyLink(url)
  return (
    <div data-copy className="mt-5 flex items-center gap-2 rounded-[14px] border border-line bg-surface-2/60 py-1.5 pr-1.5 pl-3.5">
      <span data-url className="min-w-0 flex-1 truncate text-[14px] font-medium">{url.replace(/^https?:\/\//, '')}</span>
      <button type="button" onClick={copy} aria-live="polite" className={`${secondary} shrink-0 py-2 text-[13px]`}>
        {copied ? <><Check size={14} weight="bold" className="text-accent" aria-hidden="true" /> Copiado</> : <><Copy size={14} aria-hidden="true" /> Copiar link</>}
      </button>
    </div>
  )
}

/* ── Barra de edição da prévia (estilo Canva). Fica fora do iframe reduzido, em tamanho real. ── */
const chip = (on: boolean) => `press inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[14px] font-medium ${on ? 'border-ink bg-ink text-bg' : 'border-line bg-bg hover:border-line-strong'}`
const barBox = 'step-in mx-auto grid max-w-[560px] gap-3 rounded-[20px] bg-surface p-3 text-left shadow-[0_16px_40px_-20px_rgb(17_17_19/0.45)] ring-1 ring-black/5'

function Bar({ label, icon, actions, onClose, children }: { label: string; icon: React.ReactNode; actions: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div role="region" aria-label={`Editar ${label}`} className={barBox}>
      <div className="flex items-center gap-1 pl-1">
        <span className="mr-1 text-accent" aria-hidden="true">{icon}</span>
        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold">{label}</p>
        {actions}
        <button type="button" className={iconBtn} title="Fechar" aria-label="Fechar edição" onClick={onClose}><X size={15} /></button>
      </div>
      {children}
    </div>
  )
}
const BarBtn = ({ title, onClick, disabled, children }: { title: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
  <button type="button" className={`${iconBtn} disabled:opacity-30`} title={title} aria-label={title} onClick={onClick} disabled={disabled}>{children}</button>
)

function FontRow({ value, onChange }: { value?: FontId; onChange: (f?: FontId) => void }) {
  return (
    <div role="group" aria-label="Fonte" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
      <button type="button" aria-pressed={!value} className={chip(!value)} onClick={() => onChange(undefined)}>Do estilo</button>
      {(Object.keys(FONTS) as FontId[]).map((f) => (
        <button key={f} type="button" aria-pressed={value === f} className={chip(value === f)} style={{ fontFamily: FONTS[f][1] }} onClick={() => onChange(f)}>{FONTS[f][0]}</button>
      ))}
    </div>
  )
}

/** auto = o botão "sem cor própria" (o que ele significa muda: cor do estilo, branco, cor do cartão). */
function ColorRow({ value, accent, auto, onChange }: { value?: string; accent: string; auto: [string, string]; onChange: (c?: string) => void }) {
  const colors = [...new Set(['#FAFAF9', '#121214', accent.toUpperCase(), ...SWATCHES])]
  const ring = (on: boolean) => `press size-7 rounded-full border-2 ${on ? 'border-ink' : 'border-line-strong'}`
  return (
    <div role="group" aria-label="Cor" className="flex flex-wrap items-center gap-1.5">
      <button type="button" aria-pressed={!value} title={auto[0]} aria-label={auto[0]} className={ring(!value)} style={{ background: auto[1] }} onClick={() => onChange(undefined)} />
      {colors.map((hex) => (
        <button key={hex} type="button" aria-pressed={value === hex} aria-label={`Cor ${hex}`} title={hex} className={ring(value === hex)} style={{ background: hex }} onClick={() => onChange(hex)} />
      ))}
      <label className="press relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-full border border-line-strong" title="Outra cor">
        <span className="sr-only">Outra cor</span>
        <Plus size={12} weight="bold" aria-hidden="true" />
        <input type="color" value={value ?? '#FAFAF9'} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    </div>
  )
}

function SizeRow({ value, min, max, unit, onChange }: { value: number; min: number; max: number; unit: string; onChange: (n: number) => void }) {
  return (
    <label className="flex min-w-[180px] flex-1 items-center gap-2.5 text-[13px] font-medium">
      Tamanho
      <input type="range" min={min} max={Math.max(max, value)} value={value} onChange={(e) => onChange(+e.target.value)} className="min-w-0 flex-1 accent-accent" />
      <span className="w-10 text-right text-[12px] text-muted tabular-nums">{Math.round(value)}{unit}</span>
    </label>
  )
}

function TextInspector({ label, l, size, accent, mobile, onPos, onBoth, onClose }: {
  label: string; l?: TextLayout; size?: number; accent: string; mobile: boolean
  onPos: (p: TextLayout) => void; onBoth: (p: TextLayout) => void; onClose: () => void
}) {
  return (
    <Bar label={label} icon={<TextT size={17} weight="bold" />} onClose={onClose} actions={<>
      <BarBtn title={`Voltar ${label} ao padrão`} onClick={() => { onPos({ x: undefined, y: undefined, size: undefined }); onBoth({ font: undefined, color: undefined }) }}><ArrowCounterClockwise size={15} /></BarBtn>
      <BarBtn title={`Tirar ${label} do cartão`} onClick={() => onBoth({ hidden: true })}><EyeSlash size={15} /></BarBtn>
    </>}>
      <FontRow value={l?.font} onChange={(font) => onBoth({ font })} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-1">
        <ColorRow value={l?.color} accent={accent} auto={['Cor do estilo', 'linear-gradient(135deg, #FAFAF9 50%, #121214 50%)']} onChange={(color) => onBoth({ color })} />
        <SizeRow value={l?.size ?? size ?? 32} min={TEXT_SIZE.min} max={120} unit="px" onChange={(n) => onPos({ size: n })} />
      </div>
      <p className="px-1 text-[12px] text-muted">Arraste o texto no cartão para mover. Posição e tamanho valem só para o {mobile ? 'celular' : 'tablet e computador'}; fonte e cor, para todas as telas.</p>
    </Bar>
  )
}

const EXTRA_LABEL = { text: 'Texto', shape: 'Forma', image: 'Imagem' } as const
function ExtraInspector({ x, first, last, accent, onChange, onLayer, onCopy, onRemove, onClose }: {
  x: Extra; first: boolean; last: boolean; accent: string
  onChange: (p: Partial<Extra>) => void; onLayer: (d: 1 | -1) => void; onCopy: () => void; onRemove: () => void; onClose: () => void
}) {
  const label = EXTRA_LABEL[x.kind]
  return (
    <Bar label={label} icon={x.kind === 'text' ? <TextT size={17} weight="bold" /> : x.kind === 'shape' ? <Square size={17} weight="bold" /> : <ImageIcon size={17} weight="bold" />}
      onClose={onClose} actions={<>
        <BarBtn title="Trazer para frente" disabled={last} onClick={() => onLayer(1)}><CaretUp size={15} weight="bold" /></BarBtn>
        <BarBtn title="Enviar para trás" disabled={first} onClick={() => onLayer(-1)}><CaretDown size={15} weight="bold" /></BarBtn>
        <BarBtn title="Duplicar" onClick={onCopy}><Copy size={15} /></BarBtn>
        <BarBtn title={`Apagar ${label.toLowerCase()}`} onClick={onRemove}><Trash size={15} /></BarBtn>
      </>}>
      {x.kind === 'text' && <>
        <textarea rows={2} maxLength={120} aria-label="Texto" className={input} value={x.text ?? ''} onChange={(e) => onChange({ text: e.target.value })} />
        <FontRow value={x.font} onChange={(font) => onChange({ font })} />
      </>}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-1">
        {x.kind !== 'image' && <ColorRow value={x.color} accent={accent}
          auto={x.kind === 'text' ? ['Branco', '#FAFAF9'] : ['Cor do cartão', 'var(--accent)']} onChange={(color) => onChange({ color })} />}
        {x.kind !== 'text' && (
          <div role="group" aria-label="Cantos" className="flex gap-1.5">
            <button type="button" aria-pressed={!x.round} className={chip(!x.round)} onClick={() => onChange({ round: undefined })}><Square size={14} weight="bold" aria-hidden="true" /> Reto</button>
            <button type="button" aria-pressed={!!x.round} className={chip(!!x.round)} onClick={() => onChange({ round: true })}><Circle size={14} weight="bold" aria-hidden="true" /> Redondo</button>
          </div>
        )}
        <SizeRow value={x.size} min={EXTRA_SIZE.min} max={x.kind === 'text' ? 40 : EXTRA_SIZE.max} unit="%" onChange={(size) => onChange({ size })} />
      </div>
      <p className="px-1 text-[12px] text-muted">Arraste no cartão para mover; a bolinha do canto muda o tamanho. Fica igual no celular e no computador.</p>
    </Bar>
  )
}

/** Sem nada selecionado: adicionar elementos soltos ao cartão. */
function AddBar({ disabled, full, onAdd, onError }: { disabled: boolean; full: boolean; onAdd: (x: Omit<Extra, 'id'>) => void; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false)
  const off = disabled || full || busy
  const image = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      const src = await uploadImage(file, 1200)
      const img = new Image()
      img.src = src
      await img.decode().catch(() => {})
      onAdd({ kind: 'image', src, x: 50, y: 30, size: 40, ratio: img.naturalWidth && img.naturalHeight ? +(img.naturalWidth / img.naturalHeight).toFixed(3) : 1 })
    } catch (e) { onError(errorText(e)) } finally { setBusy(false) }
  }
  return (
    <div className={barBox}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 pl-1 text-[13px] font-semibold">Adicionar</span>
        <button type="button" disabled={off} className={`${chip(false)} disabled:opacity-40`} onClick={() => onAdd({ kind: 'text', text: 'Seu texto', x: 50, y: 20, size: 9 })}>
          <TextT size={15} weight="bold" aria-hidden="true" /> Texto
        </button>
        <button type="button" disabled={off} className={`${chip(false)} disabled:opacity-40`} onClick={() => onAdd({ kind: 'shape', x: 0, y: 100, size: 100, ratio: 3 })}>
          <Square size={15} weight="bold" aria-hidden="true" /> Faixa
        </button>
        <button type="button" disabled={off} className={`${chip(false)} disabled:opacity-40`} onClick={() => onAdd({ kind: 'shape', round: true, x: 90, y: 10, size: 22, ratio: 1 })}>
          <Circle size={15} weight="bold" aria-hidden="true" /> Círculo
        </button>
        <label className={`${chip(false)} cursor-pointer ${off ? 'pointer-events-none opacity-40' : ''}`}>
          {busy ? <CircleNotch size={15} className="animate-spin" aria-hidden="true" /> : <ImageIcon size={15} weight="bold" aria-hidden="true" />} {busy ? 'Enviando...' : 'Imagem'}
          <input type="file" accept="image/*" className="sr-only" disabled={off} onChange={(e) => { image(e.target.files?.[0]); e.target.value = '' }} />
        </label>
      </div>
      <p className="px-1 text-[12px] text-muted">
        {disabled ? 'O estilo Simples não tem a foto grande. Escolha outro estilo para enfeitar o cartão.'
          : full ? `Limite de ${MAX_EXTRAS} elementos. Apague um para adicionar outro.`
          : 'Toque em qualquer texto para editar. Arraste textos e blocos para mudar de lugar; no celular, segure o bloco antes de arrastar.'}
      </p>
    </div>
  )
}

/** Endereço por CEP, pela localização atual ou digitado. Os botões Maps/Waze/Uber do cartão saem daqui. */
function AddressFinder({ value, onChange }: { value: CreatorConfig['address']; onChange: (a: CreatorConfig['address']) => void }) {
  const [cep, setCep] = useState('')
  const [busy, setBusy] = useState<'' | 'cep' | 'gps'>('')
  const [msg, setMsg] = useState('')
  const text = useRef<HTMLInputElement>(null)
  const put = (patch: Partial<NonNullable<CreatorConfig['address']>>) => {
    const next = { ...value, text: '', ...patch } as NonNullable<CreatorConfig['address']>
    onChange(next.text ? next : undefined) // o servidor exige o texto
  }
  const byCep = async (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 8)
    setCep(d.replace(/(\d{5})(\d)/, '$1-$2'))
    if (d.length !== 8) return
    setBusy('cep'); setMsg('')
    try {
      const found = await addressFromCep(d)
      if (!found) return setMsg('CEP não encontrado. Confira os números.')
      put({ text: `${found}, ${d.replace(/(\d{5})/, '$1-')}`, geo: undefined })
      setMsg('Achamos! Digite o número logo depois do nome da rua (ex: ", 1500").')
      setTimeout(() => { const el = text.current; if (el) { el.focus(); el.setSelectionRange(el.value.indexOf(','), el.value.indexOf(',')) } })
    } catch { setMsg('Não deu para buscar o CEP agora. Digite o endereço abaixo.') }
    finally { setBusy('') }
  }
  const byGps = () => {
    if (!navigator.geolocation) return setMsg('Seu navegador não permite usar a localização.')
    setBusy('gps'); setMsg('')
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const geo = { lat: +coords.latitude.toFixed(6), lng: +coords.longitude.toFixed(6) }
      const found = await addressFromGeo(geo)
      put({ geo, text: found ?? value?.text ?? 'Minha localização' })
      setMsg(found ? 'Pronto! Confira o endereço e ajuste se precisar.' : 'Localização salva. Escreva o endereço como quer que apareça.')
      setBusy('')
    }, (e) => {
      setMsg(e.code === e.PERMISSION_DENIED ? 'Você não permitiu a localização. Libere nas configurações do navegador ou use o CEP.' : 'Não conseguimos sua localização. Tente o CEP.')
      setBusy('')
    }, { enableHighAccuracy: true, timeout: 15000 })
  }
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 @md:grid-cols-[180px_1fr] @md:items-end">
        <Field label="CEP">
          <input inputMode="numeric" autoComplete="postal-code" className={input} placeholder="00000-000" value={cep} onChange={(e) => byCep(e.target.value)} />
        </Field>
        <button type="button" onClick={byGps} disabled={!!busy} className={`${secondary} @md:justify-self-start`}>
          {busy === 'gps' ? <CircleNotch size={16} className="animate-spin" aria-hidden="true" /> : <NavigationArrow size={16} weight="bold" aria-hidden="true" />}
          {busy === 'gps' ? 'Buscando...' : 'Usar minha localização'}
        </button>
      </div>
      {(msg || busy === 'cep') && <p aria-live="polite" className="text-[13px] text-muted">{busy === 'cep' ? 'Buscando CEP...' : msg}</p>}
      <Field label="Endereço que aparece no cartão">
        <input ref={text} className={input} value={value?.text ?? ''} placeholder="Rua Augusta, 1500 - Consolação, São Paulo - SP"
          onChange={(e) => put({ text: e.target.value })} />
      </Field>
      {value?.geo && (
        <p className="flex flex-wrap items-center gap-2 text-[13px] text-accent">
          <MapPin size={15} weight="fill" aria-hidden="true" /> Rotas apontam para o local exato.
          <button type="button" className="text-muted underline-offset-2 hover:text-ink hover:underline" onClick={() => put({ geo: undefined })}>Usar só o endereço</button>
        </p>
      )}
      {value?.text && (() => {
        const l = placeLinks(value.text, value.geo)
        return (
          <div className="flex flex-wrap gap-2">
            <span className="self-center text-[13px] text-muted">Testar:</span>
            {([['Google Maps', l.maps], ['Waze', l.waze], ['Uber', l.uber]] as const).map(([n, href]) => (
              <a key={n} href={href} target="_blank" rel="noreferrer" className="press inline-flex items-center gap-1 rounded-full bg-[#f2f2f4] px-3 py-1.5 text-[13px] font-medium hover:bg-[#e8e8ec]">
                {n} <ArrowSquareOut size={13} aria-hidden="true" />
              </a>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

export function Editor({ card, wizard, focus, published = true, onBack, onAuthLost }: { card: Card; wizard?: boolean; focus?: string; published?: boolean; onBack: () => void; onAuthLost: () => void }) {
  const [step, setStep] = useState(wizard ? 0 : -1) // -1 = editor completo
  const hide = (id: string) => step >= 0 && !STEPS[step][1].includes(id)
  const toStep = (i: number) => {
    setStep(i)
    if (i >= 0) STEPS[i][1].forEach((id) => { const el = document.getElementById(id) as HTMLDetailsElement | null; if (el) el.open = true })
    scrollTo({ top: 0 })
  }
  /** Última etapa: comemora e vira o editor completo. */
  const finish = async () => {
    if (dirty && !(await save())) return // o erro aparece no topo; sem confete com cartão desatualizado
    toStep(-1)
    const url = `${location.origin}/${saved.slug}`
    setTimeout(() => confetti([config.accent, '#FFC94A', '#FF6B6B', '#34D399', '#60A5FA', '#F472B6']), 120) // depois do diálogo abrir
    const go = await ask({
      icon: <span className="deal relative grid place-items-center">
        <span className="absolute inset-0 rounded-full bg-accent/30 [animation:ring_1.1s_var(--ease)_2]" aria-hidden="true" />
        <Confetti size={22} weight="bold" aria-hidden="true" />
      </span>,
      title: 'Seu cartão está pronto!',
      text: published
        ? 'Ele já está no ar. Mande o link para seus clientes ou volte aqui para ajustar quando quiser.'
        : 'Falta só confirmar seu e-mail: abra o link que enviamos e ele vai ao ar. Depois é só mandar o link para seus clientes.',
      extra: <>
        <CopyLink url={url} />
        {!config.connect && (
          <button type="button" className="press mt-3 flex w-full items-center gap-3 rounded-[14px] bg-accent/8 p-3 text-left hover:bg-accent/12"
            onClick={(e) => { e.currentTarget.closest('dialog')!.close(); setTimeout(() => jump('conecta'), 150) }}>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-fg"><Target size={17} weight="bold" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">Ative o VorenMe Conecta</span>
              <span className="block text-[13px] text-muted">Receba pedidos e agendamentos pelo cartão.</span>
            </span>
            <ArrowRight size={15} weight="bold" className="text-accent" aria-hidden="true" />
          </button>
        )}
      </>,
      confirm: 'Ver meu cartão', cancel: 'Continuar editando',
    })
    if (go) open(url, '_blank', 'noreferrer')
  }
  const [config, setConfig] = useState<CreatorConfig>(card.config)
  const [slug, setSlug] = useState(card.slug)
  const [saved, setSaved] = useState<{ slug: string; json: string; failed?: string }>({ slug: card.slug, json: JSON.stringify(card.config) })
  const [json, setJson] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Plano vencido: o servidor recusa salvar (402). Avisamos logo ao abrir, antes de a pessoa perder trabalho.
  const [locked, setLocked] = useState<{ offlineAt?: string } | null>(null)
  useEffect(() => {
    api<{ active: boolean; offlineAt: string }>('/billing').then((b) => !b.active && setLocked({ offlineAt: b.offlineAt }), () => {})
  }, [])
  const [preview, setPreview] = useState(false)
  const [pulse, setPulse] = useState(0)
  const [active, setActive] = useState<string>(NAV[0][0])
  // Conecta ativo ganha atalho próprio na barra (é o bloco que mais importa).
  const hasConecta = !!config.connect
  // Avançado fica sempre por último: são as configurações que raramente mudam.
  const nav: readonly (readonly [string, string])[] = [...NAV, ...(hasConecta ? [['conecta', 'Conecta'] as const] : []), ['avancado', 'Avançado']]
  const frame = useRef<HTMLIFrameElement>(null)

  const current = JSON.stringify(config) // uma vez por render (config pode ter foto em data URL)
  const configDirty = current !== saved.json
  const slugPending = slug !== saved.slug && !busy
  const dirty = slug !== saved.slug || configDirty
  // Voltou ao que está salvo: o erro do último envio não vale mais.
  useEffect(() => { if (!dirty) setError('') }, [dirty])

  // Avisa antes de fechar a aba com alterações não salvas.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [dirty])

  /** Desfazer/refazer: cópias do cartão antes de cada mudança. Mudanças seguidas (digitar, arrastar o controle de tamanho)
   *  viram um passo só a cada UNDO_GAP_MS. */
  const past = useRef<CreatorConfig[]>([])
  const future = useRef<CreatorConfig[]>([])
  const lastPush = useRef(0)
  const record = () => {
    future.current = []
    if (Date.now() - lastPush.current < UNDO_GAP_MS) return
    lastPush.current = Date.now()
    past.current = [...past.current.slice(-(UNDO_MAX - 1)), config]
  }
  const undo = (redo = false) => {
    const [from, to] = redo ? [future, past] : [past, future]
    const prev = from.current.at(-1)
    if (!prev) return
    from.current = from.current.slice(0, -1)
    to.current = [...to.current, config]
    lastPush.current = 0
    setConfig(prev)
  }
  /** Atualiza um campo aninhado: set(c => { c.name.first = v }) */
  const set = (fn: (c: CreatorConfig) => void) => {
    record()
    setConfig((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }
  /** Mescla na posição/tamanho de um texto, no ajuste do celular ou no de tablet/computador; campos undefined voltam ao padrão.
      Cartão de antes da separação (sem layoutMobile): na primeira mudança o celular ganha cópia do ajuste atual,
      e daí em diante um nunca mexe no outro. */
  const setLayout = (id: TextId, patch: TextLayout, mobile: boolean) =>
    set((c) => {
      c.photo.layoutMobile ??= structuredClone(c.photo.layout ?? {})
      const key = mobile ? 'layoutMobile' : 'layout'
      const next = Object.fromEntries(Object.entries({ ...c.photo[key]?.[id], ...patch }).filter(([, v]) => v !== undefined))
      const all = { ...c.photo[key], [id]: next }
      if (!Object.keys(next).length) delete all[id]
      // O celular guarda {} (padrão próprio) em vez de sumir: sumir faria ele voltar a copiar o computador.
      c.photo[key] = Object.keys(all).length || mobile ? all : undefined
    })
  /** Tirar/voltar, fonte e cor de um texto valem para celular e computador juntos. */
  const setBoth = (id: TextId, patch: TextLayout) => {
    setLayout(id, patch, true)
    setLayout(id, patch, false)
    if (patch.hidden) select(null) // texto oculto não tem o que editar
  }
  const setHidden = (id: TextId, hidden: boolean) => setBoth(id, { hidden: hidden || undefined })
  /** Peça selecionada (na prévia ou na lista): texto do modelo (TextId) ou elemento solto ("e:<id>").
   *  size = tamanho atual medido na prévia (texto do modelo sem tamanho próprio). */
  const [sel, setSel] = useState<{ key: string; size?: number } | null>(null)
  const select = (key: string | null) => {
    setSel(key ? { key } : null)
    frame.current?.contentWindow?.postMessage({ type: 'vorenme:select', id: key }, location.origin)
    if (key) setPreview(true) // no celular a prévia abre em tela cheia
  }
  const selText = TEXT_IDS.find((id) => id === sel?.key)
  const selExtra = sel?.key.startsWith('e:') ? config.extras?.find((x) => x.id === sel.key.slice(2)) : undefined
  /** Elementos soltos: valores undefined somem do objeto (o servidor recebe só o que existe). */
  const setExtra = (id: string, patch: Partial<Extra>) => set((c) => {
    const x = c.extras?.find((e) => e.id === id)
    if (x) Object.entries(patch).forEach(([k, v]) => (v === undefined ? delete x[k as keyof Extra] : Object.assign(x, { [k]: v })))
  })
  const removeExtra = (id: string) => {
    set((c) => { c.extras = c.extras?.filter((e) => e.id !== id); if (!c.extras?.length) delete c.extras })
    select(null)
  }
  const addExtra = (x: Omit<Extra, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 10)
    set((c) => { (c.extras ??= []).push({ ...x, id }) })
    select(`e:${id}`)
  }
  const layer = (id: string, d: 1 | -1) => set((c) => {
    const a = c.extras!, i = a.findIndex((e) => e.id === id)
    if (a[i + d]) [a[i], a[i + d]] = [a[i + d], a[i]]
  })
  /** Qual ajuste a lista de textos mostra: segue o aparelho escolhido na prévia (tablet usa o do computador). */
  const [mobileView, setMobileView] = useState(true)
  const setSocial = (i: number, patch: Partial<SocialLink>) => set((c) => Object.assign(c.socials[i], patch))

  /** true = salvou. Envios entram em fila: quem chama durante um envio espera por ele (não vira "falhou").
   *  O endereço (slug) só vai nos envios explícitos: no automático, cada pausa na digitação trocaria o link.
   *  Compara com o que foi ENVIADO (o jsonb do Postgres reordena as chaves). */
  const queue = useRef(Promise.resolve(true))
  const save = (withSlug = true): Promise<boolean> => {
    const sent = { slug: withSlug ? slug : undefined, json: current }
    const body = { slug: sent.slug, config: forSave(config) }
    const run = async () => {
      setBusy(true)
      try {
        await api<Card>(`/cards/${card.id}`, 'PUT', body)
        setSaved((s) => ({ slug: sent.slug ?? s.slug, json: sent.json }))
        setError('')
        return true
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) onAuthLost()
        else if (err instanceof ApiError && err.status === 402) setLocked((l) => l ?? {})
        else setError(errorText(err))
        setSaved((s) => ({ ...s, failed: sent.json }))
        return false
      } finally {
        setBusy(false)
      }
    }
    return (queue.current = queue.current.then(run))
  }

  // Salvamento automático: espera a pessoa parar de digitar. Não repete um envio que já falhou igual.
  const failedSame = saved.failed === current
  useEffect(() => {
    if (!configDirty || busy || failedSame || locked) return
    const t = setTimeout(() => save(false), AUTOSAVE_MS)
    return () => clearTimeout(t)
  }, [config, configDirty, busy, failedSame, locked]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pré-visualização ao vivo: manda o cartão para o iframe a cada alteração, sem salvar nem recarregar.
  const sendPreview = () =>
    frame.current?.contentWindow?.postMessage({ type: PREVIEW_MSG, config }, location.origin)
  const first = useRef(true)
  useEffect(() => {
    sendPreview()
    if (first.current) first.current = false
    else setPulse((n) => n + 1)
  }, [config]) // eslint-disable-line react-hooks/exhaustive-deps

  // Atalho da seção visível fica ativo (IntersectionObserver, sem ouvir o scroll): vence a mais de cima na faixa.
  // Clicou num atalho: ele fica ativo até a pessoa rolar por conta própria (no fim da página a seção
  // clicada não chega ao topo e as seguintes também entram na faixa).
  const pinned = useRef(false)
  // Bloco aberto uma vez continua montado (apagar o conteúdo não faz a seção sumir no meio da digitação).
  const [opened, setOpened] = useState(() => new Set(BLOCKS.filter((b) => b.on(card.config)).map((b) => b.id)))
  const [dragging, setDragging] = useState<BlockId>()
  const jump = (id: string) => {
    pinned.current = true
    setActive(id === 'conecta' && hasConecta ? 'conecta' : isBlock(id) ? 'blocos' : id === 'redes' ? 'contato' : id)
    if (isBlock(id)) setOpened((s) => new Set(s).add(id))
    setTimeout(() => goTo(id)) // depois de a seção montar
  }
  useEffect(() => {
    const seen = new Set<string>()
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? seen.add(e.target.id) : seen.delete(e.target.id)))
      const top = nav.find(([id]) => seen.has(id))
      if (top && !pinned.current) setActive(top[0])
    }, { rootMargin: '-140px 0px -60% 0px' })
    nav.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el) })
    const unpin = () => { pinned.current = false }
    const events = ['wheel', 'touchmove', 'keydown'] as const
    events.forEach((t) => addEventListener(t, unpin, { passive: true }))
    return () => { io.disconnect(); events.forEach((t) => removeEventListener(t, unpin)) }
  }, [step < 0, hasConecta]) // "blocos" só existe no editor completo; "conecta" só quando ativo
  useEffect(() => {
    const onReady = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return
      if (e.data?.type === 'vorenme:ready') sendPreview()
      // Nome arrastado na prévia (Hero.tsx): a posição vira parte do cartão e é salva como o resto.
      // Texto arrastado/redimensionado na prévia (Hero.tsx): vira parte do cartão e é salvo como o resto.
      if (e.data?.type === 'vorenme:select') {
        const key = e.data.id
        setSel(typeof key === 'string' && (TEXT_IDS.includes(key as TextId) || key.startsWith('e:')) ? { key, size: Number.isFinite(e.data.size) ? e.data.size : undefined } : null)
      }
      if (e.data?.type === 'vorenme:undo') undo(e.data.redo === true)
      // Elemento solto arrastado/redimensionado/apagado na prévia (Hero.tsx).
      if (e.data?.type === 'vorenme:extra' && typeof e.data.id === 'string') {
        const { x: px, y: py, size, hidden } = e.data.patch ?? {}
        if (hidden === true) return removeExtra(e.data.id)
        setExtra(e.data.id, {
          ...(Number.isFinite(px) && Number.isFinite(py) && { x: px, y: py }),
          ...(Number.isFinite(size) && { size }),
        })
      }
      // Bloco arrastado e solto na prévia (App.tsx).
      if (e.data?.type === 'vorenme:move' && e.data.from in CARD_BLOCKS && e.data.to in CARD_BLOCKS) move(e.data.from, e.data.to)
      if (e.data?.type === 'vorenme:layout' && TEXT_IDS.includes(e.data.id)) {
        if (e.data.patch?.hidden === true) return setHidden(e.data.id, true)
        const { x: px, y: py, size } = e.data.patch ?? {}
        setLayout(e.data.id, {
          ...(Number.isFinite(px) && Number.isFinite(py) && { x: px, y: py }),
          ...(Number.isFinite(size) && { size }),
        }, e.data.mobile === true)
      }
    }
    addEventListener('message', onReady)
    return () => removeEventListener('message', onReady)
  })

  // Veio de um atalho (ex.: "Ativar Conecta" na tela Cartões): abre e rola até a seção.
  useEffect(() => {
    // Também por link: /painel/:id/editar#conecta (botões das recomendações em Estatísticas).
    const to = focus ?? (location.hash.slice(1) || undefined)
    if (to && step < 0) setTimeout(() => jump(to), 150)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl/Cmd + S salva.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
      // Desfazer do cartão. Dentro de um campo de texto, quem desfaz é o próprio campo.
      const k = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && (k === 'z' || k === 'y') && !(e.target as Element).closest?.('input, textarea, select')) {
        e.preventDefault()
        undo(k === 'y' || e.shiftKey)
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  const back = async () => {
    if (!dirty || (await save()) || (await ask({ title: 'Sair sem salvar?', text: 'Não conseguimos salvar suas últimas alterações. Se sair agora, elas serão perdidas.', confirm: 'Sair mesmo assim', cancel: 'Continuar editando', danger: true }))) onBack()
  }

  const applyJson = () => {
    try {
      const next = JSON.parse(json)
      // Sem esses campos a tela do editor quebraria; o resto o servidor valida ao salvar.
      if (!next?.name || !next.photo || !Array.isArray(next.socials) || !next.partnership || !next.seo || !next.labels) throw 0
      record()
      setConfig(next)
      setError('')
    } catch {
      setError('JSON inválido. Confira vírgulas, aspas e se nenhum campo obrigatório foi apagado.')
    }
  }

  const c = config
  const lay = textLayout(c.photo, mobileView)
  const words = c.bio.trim().split(/\s+/).filter(Boolean).length
  const full = step < 0
  // Ordem no cartão: só os blocos ligados aparecem; os desligados guardam o lugar em c.order.
  const rows = c.style === 'simples' ? [] : blockOrder(c).flatMap((id) => {
    const r = ORDER_ROWS.find((r) => r.id === id)!
    return r.on(c) ? [{ ...r, id }] : []
  })
  const move = (from: BlockId, to: BlockId) => set((x) => {
    const o = blockOrder(x)
    const down = o.indexOf(from) < o.indexOf(to)
    o.splice(o.indexOf(from), 1)
    o.splice(o.indexOf(to) + (down ? 1 : 0), 0, from)
    x.order = o
  })
  return (
    // noValidate: os avisos nativos do navegador saem no idioma dele (inglês, às vezes); quem valida é o servidor, em português.
    <form noValidate onSubmit={(e: FormEvent) => { e.preventDefault(); save() }}>
      {/* Barra de ações fixa */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex items-center gap-3">
          <button type="button" onClick={back} className={iconBtn} aria-label="Voltar para seus cartões" title="Voltar">
            <ArrowLeft size={17} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{c.name.first} {c.name.last}</p>
            <p className="truncate text-[13px] text-muted">{location.host}/{saved.slug}</p>
          </div>
          <div className="flex">
            <button type="button" onClick={() => undo()} disabled={!past.current.length} className={`${iconBtn} disabled:opacity-30`} aria-label="Desfazer" title="Desfazer (Ctrl+Z)">
              <ArrowUUpLeft size={17} />
            </button>
            <button type="button" onClick={() => undo(true)} disabled={!future.current.length} className={`${iconBtn} disabled:opacity-30 max-sm:hidden`} aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)">
              <ArrowUUpRight size={17} />
            </button>
          </div>
          <span aria-live="polite" className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium ${locked ? 'bg-amber-500/12 text-amber-700' : error || slugPending ? 'bg-red-500/10 text-red-500' : busy || configDirty ? 'bg-surface-2 text-muted' : 'bg-accent/10 text-accent'}`}>
            {locked ? <><WarningCircle size={15} weight="bold" aria-hidden="true" /> Plano vencido</>
              : error || slugPending ? <><WarningCircle size={15} weight="bold" aria-hidden="true" /> Não salvo</>
              : busy || configDirty ? <><CloudArrowUp size={15} aria-hidden="true" /> Salvando...</>
              : <><Check size={15} weight="bold" aria-hidden="true" /> Salvo</>}
          </span>
          <GuideButton compact start="identidade" onSection={(id) => {
            const i = STEPS.findIndex(([, ids]) => ids.includes(id))
            if (!full && i >= 0) return toStep(i)
            if (!full) toStep(-1)
            jump(id)
          }} />
          <a href={`/${saved.slug}`} target="_blank" rel="noreferrer" className={`${secondary} hidden sm:inline-flex`}>
            <ArrowSquareOut size={16} aria-hidden="true" /> Abrir
          </a>
        </div>
        {!full ? (
          <nav aria-label={`Etapa ${step + 1} de ${STEPS.length}`} className="mt-3">
            <ol className="flex gap-1.5">
              {STEPS.map(([label], i) => (
                <li key={label}>
                  <button type="button" onClick={() => toStep(i)} aria-current={i === step ? 'step' : undefined}
                    className={`press inline-flex items-center gap-1.5 rounded-full py-1.5 pr-3.5 pl-1.5 text-[13px] font-medium transition-colors ${i === step ? 'bg-ink text-bg' : i < step ? 'bg-accent/10 text-accent' : 'bg-[#f2f2f4] text-muted hover:text-ink'}`}>
                    <span className={`grid size-5 place-items-center rounded-full text-[11px] ${i === step ? 'bg-bg text-ink' : 'bg-bg/70'}`}>
                      {i < step ? <Check size={11} weight="bold" aria-hidden="true" /> : i + 1}
                    </span>
                    {label}
                  </button>
                </li>
              ))}
            </ol>
            <div className="mt-2.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }} aria-hidden="true">
              {STEPS.map(([label], i) => (
                <span key={label} className="h-1 overflow-hidden rounded-full bg-line">
                  <span className={`block h-full origin-left rounded-full bg-accent transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${i <= step ? 'scale-x-100' : 'scale-x-0'}`} />
                </span>
              ))}
            </div>
          </nav>
        ) : (
          <nav aria-label="Seções" className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
            {nav.map(([id, label]) => (
              <button key={id} type="button" onClick={() => jump(id)} aria-current={active === id ? 'true' : undefined}
                className={`press inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${active === id ? 'bg-ink text-bg' : id === 'conecta' ? 'bg-accent/12 font-semibold text-accent hover:bg-accent/20' : 'bg-[#f2f2f4] text-muted hover:text-ink'}`}>
                {id === 'conecta' && <Target size={14} weight="bold" aria-hidden="true" />}
                {label}
              </button>
            ))}
          </nav>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,42%)] lg:has-[[data-device=computador]]:grid-cols-[minmax(340px,1fr)_minmax(0,64%)]">
        <fieldset disabled={!!locked} className="grid min-w-0 content-start gap-5">
          {locked ? (
            <div role="alert" className="flex flex-col gap-4 rounded-[20px] border border-amber-500/30 bg-amber-500/10 p-5 sm:flex-row sm:items-center">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-700"><WarningCircle size={22} weight="bold" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">Seu plano está vencido. Nada do que você mudar aqui será salvo.</p>
                <p className="mt-1 text-[14px] text-muted">
                  Assine para voltar a editar.{locked.offlineAt && new Date(locked.offlineAt) > new Date()
                    ? ` Seu cartão continua no ar até ${new Date(locked.offlineAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}.` : ''}
                </p>
              </div>
              {/* <a> não é desativado pelo fieldset: o botão de assinar continua funcionando. */}
              <a href="/painel/assinatura" className={`${primary} shrink-0`}>Assinar agora</a>
            </div>
          ) : <Errors text={error} />}

          {!full && (
            <header key={step} className="rise grid gap-1.5 px-1 pt-1 [--i:-3]">
              <p className="text-[13px] font-semibold text-accent">Etapa {step + 1} de {STEPS.length}</p>
              <h2 className="text-[26px] leading-tight font-semibold tracking-[-0.03em] sm:text-[30px]">{STEPS[step][2]}</h2>
              <p className="max-w-[52ch] text-[15px] text-muted">{STEPS[step][3]}</p>
            </header>
          )}

          <Section icon={<IdentificationCard size={17} weight="bold" />} title="Sobre você" id="identidade" hidden={hide('identidade')} description="Foto, nome e bio">
            <div className="grid gap-4 @md:grid-cols-2">
              <div className="@md:col-span-2">
                <ImagePicker value={c.photo.src} onChange={(v) => set((x) => { x.photo = { ...x.photo, src: v, focal: undefined, zoom: undefined, fit: undefined } })} onError={setError}
                  thumbClass="size-20 rounded-full" fallback={<User size={24} aria-hidden="true" />} />
                <PhotoHint spec={PHOTO_SPEC[c.style ?? 'criador']} style={STYLE_NAMES[c.style ?? 'criador'][0]} />
                {c.photo.src && <div className="mt-3"><PhotoFrame src={c.photo.src} value={c.photo} spec={PHOTO_SPEC[c.style ?? 'criador']}
                  onChange={(f) => set((x) => { x.photo = { ...x.photo, ...f } })} /></div>}
              </div>
              <Field label="Nome"><input className={input} value={c.name.first} onChange={(e) => set((x) => { x.name.first = e.target.value })} /></Field>
              <Field label="Sobrenome (opcional)"><input className={input} value={c.name.last} onChange={(e) => set((x) => { x.name.last = e.target.value })} /></Field>
              <Field label="O que você faz">
                <input className={input} value={c.niche} placeholder="Ex: Psicóloga, Barbeiro" onChange={(e) => set((x) => { x.niche = e.target.value })} />
              </Field>
              <Field label="Cidade (opcional)"><input className={input} value={c.location ?? ''} onChange={(e) => set((x) => { x.location = e.target.value || undefined })} /></Field>
              <label className="grid content-start gap-2 @md:col-span-2">
                <span className="flex items-baseline justify-between text-[13px] font-medium text-ink">
                  Bio
                  <span className={`text-[12px] font-normal tabular-nums ${words > 20 ? 'text-amber-600' : 'text-muted'}`}>{words}/20 palavras</span>
                </span>
                <textarea rows={2} className={input} value={c.bio} onChange={(e) => set((x) => { x.bio = e.target.value })} />
              </label>
            </div>
          </Section>

          <Section icon={<Palette size={17} weight="bold" />} title="Visual" id="aparencia" hidden={hide('aparencia')} description="Estilo, cor e tema">
            <div className="grid gap-5 @md:grid-cols-2">
              <fieldset className="grid gap-2 @md:col-span-2">
                <legend className="mb-2 text-[13px] font-medium">Estilo</legend>
                <div className="grid grid-cols-2 gap-2 @lg:grid-cols-3 @2xl:grid-cols-4">
                  {STYLES.map((s) => {
                    const on = (c.style ?? 'criador') === s
                    return (
                      <label key={s} className={`press cursor-pointer rounded-[12px] border px-3 py-2.5 ${on ? 'border-accent bg-accent/6 ring-1 ring-accent' : 'border-line hover:border-line-strong'}`}>
                        <input type="radio" name="style" className="sr-only" checked={on} onChange={() => set((x) => { x.style = s })} />
                        <span data-style={s} className="display block text-[20px] leading-tight font-semibold tracking-[-0.03em]">{STYLE_NAMES[s][0]}</span>
                        <span className="mt-0.5 block text-[12px] text-muted">{STYLE_NAMES[s][1]}</span>
                        <span className="mt-1.5 block text-[11px] font-medium text-muted">Foto {PHOTO_SPEC[s].round ? 'redonda' : PHOTO_SPEC[s].shape}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
              <div className="grid gap-2">
                <span className="text-[13px] font-medium">Cor</span>
                <div className="flex flex-wrap items-center gap-2">
                  {SWATCHES.map((hex) => (
                    <button key={hex} type="button" onClick={() => set((x) => { x.accent = hex })}
                      className={`press size-9 rounded-full border-2 ${c.accent.toUpperCase() === hex ? 'border-ink' : 'border-line-strong'}`}
                      style={{ background: hex }} aria-label={`Usar a cor ${hex}`} aria-pressed={c.accent.toUpperCase() === hex} />
                  ))}
                  <label className="press relative grid size-9 cursor-pointer place-items-center overflow-hidden rounded-full border border-line-strong" title="Escolher outra cor">
                    <span className="sr-only">Escolher outra cor</span>
                    <Plus size={14} weight="bold" aria-hidden="true" />
                    <input type="color" value={c.accent} onChange={(e) => set((x) => { x.accent = e.target.value.toUpperCase() })}
                      className="absolute inset-0 cursor-pointer opacity-0" />
                  </label>
                </div>
              </div>
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-[13px] font-medium">Tema</legend>
                <div className="grid grid-cols-2 rounded-[12px] border border-line bg-bg p-1">
                  {(['light', 'dark'] as const).map((t) => (
                    <label key={t} className={`press cursor-pointer rounded-[9px] py-2 text-center text-sm font-medium ${c.theme === t ? 'bg-surface-2 text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
                      <input type="radio" name="theme" className="sr-only" checked={c.theme === t} onChange={() => set((x) => { x.theme = t })} />
                      {t === 'light' ? 'Claro' : 'Escuro'}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-3 border-t border-line pt-5 @md:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-medium">Textos sobre a foto</p>
                    <p className="max-w-[56ch] text-[12px] text-muted">Toque num texto, aqui ou na prévia, para trocar fonte, cor e tamanho. Na prévia, arraste para mover.
                      O celular tem um ajuste de posição e o computador outro. O tablet usa o do computador.</p>
                  </div>
                  <button type="button" disabled={!Object.keys(lay).length} className={`${secondary} py-2 text-[13px] whitespace-normal`}
                    onClick={() => set((x) => { x.photo.layoutMobile ??= structuredClone(x.photo.layout ?? {}); if (mobileView) x.photo.layoutMobile = {}; else delete x.photo.layout })}>
                    <ArrowCounterClockwise size={14} weight="bold" aria-hidden="true" /> Restaurar {mobileView ? 'celular' : 'computador'}
                  </button>
                </div>
                <p className="flex items-center gap-1.5 rounded-[10px] bg-accent/8 px-3 py-2 text-[12px] font-medium text-accent">
                  {mobileView ? <DeviceMobile size={15} weight="bold" aria-hidden="true" /> : <Desktop size={15} weight="bold" aria-hidden="true" />}
                  Mostrando o ajuste do {mobileView ? 'celular' : 'tablet e computador'}. Troque o aparelho na prévia para ajustar o outro.
                </p>
                <div className="grid gap-2 @xl:grid-cols-2">
                  {TEXT_LABELS.filter(([id]) => (id !== 'location' || c.location) && (id !== 'last' || c.name.last)).map(([id, label]) => {
                    const l = lay[id]
                    const moved = l?.x !== undefined
                    const off = !!l?.hidden
                    return (
                      <div key={id} className="flex items-center gap-2 rounded-[12px] bg-surface-2/60 py-1.5 pr-1.5 pl-3">
                        <button type="button" disabled={off} onClick={() => select(id)} aria-pressed={sel?.key === id} title={`Editar ${label}`}
                          className={`min-w-0 flex-1 truncate text-left text-[13px] font-medium underline-offset-2 enabled:hover:underline ${off ? 'text-muted line-through' : sel?.key === id ? 'text-accent' : ''}`}
                          style={l?.font && FONTS[l.font] ? { fontFamily: FONTS[l.font][1] } : undefined}>{label}</button>
                        {l?.color && !off && <span aria-hidden="true" className="size-3 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: l.color }} />}
                        <span className={`text-[11px] ${(moved || l?.font || l?.color) && !off ? 'text-accent' : 'text-muted'}`}>{off ? 'Oculto' : moved ? 'Movido' : l?.font || l?.color ? 'Editado' : 'Padrão'}</span>
                        <button type="button" title={off ? `Mostrar ${label}` : `Tirar ${label} do cartão`} aria-label={off ? `Mostrar ${label}` : `Tirar ${label} do cartão`}
                          aria-pressed={off}
                          className="press grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink pointer-coarse:size-10"
                          onClick={() => setHidden(id, !off)}>
                          {off ? <EyeSlash size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                        </button>
                        <div className="flex w-[84px] items-center rounded-[10px] border border-line bg-bg focus-within:border-accent">
                          <input type="number" inputMode="numeric" min={TEXT_SIZE.min} max={TEXT_SIZE.max} placeholder="Auto"
                            aria-label={`Tamanho de ${label} em px`} value={l?.size ?? ''}
                            className="min-w-0 flex-1 bg-transparent py-1.5 pl-2.5 text-[16px] text-ink outline-none sm:text-[14px]"
                            onChange={(e) => setLayout(id, { size: e.target.value ? +e.target.value : undefined }, mobileView)}
                            onBlur={() => l?.size && setLayout(id, { size: Math.min(TEXT_SIZE.max, Math.max(TEXT_SIZE.min, l.size)) }, mobileView)} />
                          <span className="pr-2 text-[12px] text-muted">px</span>
                        </div>
                        <button type="button" disabled={!l} title={`Voltar ${label} ao padrão`} aria-label={`Voltar ${label} ao padrão`}
                          className="press grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink disabled:opacity-30 pointer-coarse:size-10"
                          onClick={() => setLayout(id, { x: undefined, y: undefined, size: undefined }, mobileView)}>
                          <ArrowCounterClockwise size={14} aria-hidden="true" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </Section>

          <Section icon={<ChatCircleText size={17} weight="bold" />} title="Contato" id="contato" hidden={hide('contato')} description="WhatsApp, e-mail e site">
            <div className="grid gap-4 @md:grid-cols-2">
              <Field label="WhatsApp">
                <input type="tel" inputMode="tel" className={input} value={c.whatsapp?.display ?? c.whatsapp?.number ?? ''} placeholder="(11) 98765-4321"
                  onChange={(e) => set((x) => {
                    const number = waNumber(e.target.value)
                    x.whatsapp = number ? { ...x.whatsapp, number, display: e.target.value } : undefined
                  })} />
              </Field>
              <Field label="E-mail (opcional)">
                <input type="email" className={input} value={c.email?.address ?? ''}
                  onChange={(e) => set((x) => { x.email = e.target.value ? { ...x.email, address: e.target.value } : undefined })} />
              </Field>
              <div className="@md:col-span-2">
                <Field label="Mensagem que já vem escrita no WhatsApp">
                  <input className={input} value={c.whatsapp?.message ?? ''} disabled={!c.whatsapp} placeholder="Oi! Vi seu cartão e quero agendar."
                    onChange={(e) => set((x) => { x.whatsapp!.message = e.target.value })} />
                </Field>
              </div>
              <Field label="Site (opcional)">
                <input type="url" className={input} value={c.website?.url ?? ''} placeholder="seusite.com.br"
                  onChange={(e) => set((x) => {
                    const url = e.target.value
                    x.website = url ? { url, label: url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') } : undefined
                  })} />
              </Field>
              <Field label="Aviso no topo (opcional)">
                <input className={input} value={c.availability?.label ?? ''} placeholder="Ex: Agenda aberta"
                  onChange={(e) => set((x) => { x.availability = e.target.value ? { open: true, label: e.target.value } : undefined })} />
              </Field>
            </div>
          </Section>

          <Section icon={<LinkSimple size={17} weight="bold" />} title="Redes" id="redes" hidden={hide('redes')} description="Onde as pessoas te seguem" badge={c.socials.length ? `${c.socials.length}` : undefined}>
            <div className="grid gap-3">
              {c.socials.map((s, i) => {
                const { name, Icon } = platformMeta[s.platform] ?? platformMeta.website
                const linkOnly = s.platform === 'website' || s.platform === 'spotify'
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/12 text-accent" title={name}><Icon size={18} weight="bold" aria-hidden="true" /></span>
                    <input aria-label={name} placeholder={linkOnly ? `Link do ${name}` : '@usuario ou link do perfil'} className={`${input} min-w-0`}
                      value={socialText(s)} onChange={(e) => setSocial(i, socialFrom(s.platform, e.target.value))} />
                    <button type="button" className={`${iconBtn} hover:text-red-500`} onClick={() => set((x) => { x.socials.splice(i, 1) })}
                      aria-label={`Remover ${name}`} title={`Remover ${name}`}>
                      <Trash size={16} />
                    </button>
                  </div>
                )
              })}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="mr-1 text-[13px] text-muted">Adicionar</span>
                {PLATFORMS.map((p) => {
                  const { name, Icon } = platformMeta[p]
                  return (
                    <button key={p} type="button" className="press inline-flex items-center gap-1.5 rounded-full bg-[#f2f2f4] py-1.5 pr-3 pl-2 text-[13px] font-medium hover:bg-[#e8e8ec]"
                      onClick={() => set((x) => { x.socials.push({ platform: p, handle: '', url: '' }) })}>
                      <Icon size={15} weight="bold" aria-hidden="true" /> {name}
                    </button>
                  )
                })}
              </div>
            </div>
          </Section>

          {full && (
            <section id="blocos" className="grid scroll-mt-36 gap-3 pt-2">
              <div className="px-1">
                <h2 className="text-[17px] font-semibold tracking-tight">Adicionar blocos</h2>
                <p className="text-[14px] text-muted">Tudo opcional. Toque para ligar e preencher.</p>
              </div>
              <div className="@container">
                <div className="grid grid-cols-2 gap-2 @lg:grid-cols-4">
                  {BLOCKS.map(({ id, title, text, Icon, on }, i) => {
                    const active = on(c)
                    return (
                      <button key={id} type="button" onClick={() => jump(id)}
                        className={`press grid content-start gap-2 rounded-[16px] border p-3.5 text-left transition-colors ${i === 0 && !active ? 'border-accent/40 bg-accent/6 hover:bg-accent/10' : 'border-line bg-surface hover:border-line-strong'}`}>
                        <span className="flex items-center justify-between">
                          <span className={`grid size-9 place-items-center rounded-full ${i === 0 ? 'bg-accent text-accent-fg' : 'bg-accent/12 text-accent'}`}><Icon size={17} weight="bold" aria-hidden="true" /></span>
                          {active
                            ? <span className="inline-flex items-center gap-1 text-[12px] font-medium text-accent"><Check size={12} weight="bold" aria-hidden="true" /> Ativo</span>
                            : <Plus size={15} weight="bold" className="text-muted" aria-hidden="true" />}
                        </span>
                        <span>
                          <span className="block text-[14px] leading-tight font-semibold">{title}</span>
                          <span className="mt-0.5 block text-[12px] leading-snug text-muted">{text}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              {rows.length > 1 && (
                <div className="mt-3 grid gap-2">
                  <div className="px-1">
                    <h3 className="text-[15px] font-semibold tracking-tight">Ordem no cartão</h3>
                    <p className="text-[13px] text-muted">Arraste aqui, use as setas ou arraste os blocos direto na prévia. A largura escolhida vale para todas as telas.</p>
                  </div>
                  <ol className="grid gap-1.5">
                    {rows.map(({ id, title, Icon }, i) => (
                      <li key={id} draggable
                        onDragStart={(e) => { setDragging(id); e.dataTransfer.effectAllowed = 'move' }}
                        onDragEnd={() => setDragging(undefined)}
                        onDragOver={(e) => { if (dragging) e.preventDefault() }}
                        onDrop={(e) => { e.preventDefault(); if (dragging && dragging !== id) move(dragging, id) }}
                        className={`flex cursor-grab items-center gap-2.5 rounded-[12px] border border-line bg-surface py-1.5 pr-1.5 pl-3 active:cursor-grabbing ${dragging === id ? 'opacity-40' : ''}`}>
                        <DotsSixVertical size={16} weight="bold" className="text-muted" aria-hidden="true" />
                        <Icon size={16} weight="bold" className="text-accent" aria-hidden="true" />
                        <span className="flex-1 text-[14px] font-medium">{title}</span>
                        <select aria-label={`Largura de ${title}`} title="Largura no cartão" value={c.width?.[id] ?? ''}
                          onPointerDown={(e) => e.stopPropagation()} draggable={false} onDragStart={(e) => e.preventDefault()}
                          onChange={(e) => set((x) => {
                            const w = { ...x.width, [id]: (e.target.value || undefined) as 'half' | 'full' | undefined }
                            if (!w[id]) delete w[id]
                            x.width = Object.keys(w).length ? w : undefined
                          })}
                          className="rounded-[10px] border border-line bg-bg py-1.5 pr-2 pl-2.5 text-[16px] text-ink sm:text-[13px]">
                          <option value="">Largura do estilo</option>
                          <option value="half">Metade</option>
                          <option value="full">Inteira</option>
                        </select>
                        <button type="button" className={`${iconBtn} disabled:opacity-30`} disabled={i === 0} onClick={() => move(id, rows[i - 1].id)} aria-label={`Subir ${title}`} title="Subir">
                          <CaretUp size={15} weight="bold" />
                        </button>
                        <button type="button" className={`${iconBtn} disabled:opacity-30`} disabled={i === rows.length - 1} onClick={() => move(id, rows[i + 1].id)} aria-label={`Descer ${title}`} title="Descer">
                          <CaretDown size={15} weight="bold" />
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </section>
          )}

          {full && opened.has('conecta') && (
            <Section icon={<Target size={17} weight="bold" />} title="VorenMe Conecta" id="conecta" highlight
              description={c.connect ? 'Objetivo, ações do visitante e serviços' : 'Transforme visitas em clientes'} badge={c.connect ? 'Ativo' : 'Novo'}>
              <ConnectEditor c={c} set={set} cardId={card.id} />
            </Section>
          )}

          {full && opened.has('local') && (
            <Section icon={<MapPin size={17} weight="bold" />} title="Localização" id="local" description="Rota no Maps, Waze e Uber, horário e avaliação" badge={c.address || c.review ? 'Ativo' : undefined}>
              <div className="grid gap-4">
<AddressFinder value={c.address} onChange={(a) => set((x) => { x.address = a })} />
                {c.address && (
                  <div className="grid gap-2">
                    <span className="text-[13px] font-medium text-ink">Horário de funcionamento</span>
                    {(c.address.hours ?? []).map((h, i) => (
                      <div key={i} className="flex gap-2">
                        <input aria-label="Dias" placeholder="Seg a Sex" className={`${input} min-w-0`} value={h.days} onChange={(e) => set((x) => { x.address!.hours![i].days = e.target.value })} />
                        <input aria-label="Horário" placeholder="9h às 18h" className={`${input} min-w-0`} value={h.time} onChange={(e) => set((x) => { x.address!.hours![i].time = e.target.value })} />
                        <button type="button" className={`${iconBtn} hover:text-red-500`} aria-label="Remover horário" title="Remover horário"
                          onClick={() => set((x) => { x.address!.hours!.splice(i, 1); if (!x.address!.hours!.length) delete x.address!.hours })}>
                          <Trash size={16} />
                        </button>
                      </div>
                    ))}
                    {(c.address.hours?.length ?? 0) < 7 && (
                      <button type="button" className={`${secondary} justify-self-start`} onClick={() => set((x) => { (x.address!.hours ??= []).push({ days: '', time: '' }) })}>
                        <Plus size={15} weight="bold" aria-hidden="true" /> Adicionar horário
                      </button>
                    )}
                  </div>
                )}
                <Field label="Link de avaliação do Google (opcional)" hint="No Google: Perfil da Empresa → Pedir avaliações → copiar link.">
                  <input type="url" className={input} value={c.review?.url ?? ''} placeholder="https://g.page/r/..."
                    onChange={(e) => set((x) => { x.review = e.target.value ? { url: e.target.value } : undefined })} />
                </Field>
              </div>
            </Section>
          )}

          {full && opened.has('pix') && (
            <Section icon={<CurrencyDollar size={17} weight="bold" />} title="Pix" id="pix" description="O cliente copia sua chave ou o Pix copia e cola" badge={c.pix ? 'Ativo' : undefined}>
              <div className="grid gap-4 @md:grid-cols-2">
                <div className="@md:col-span-2">
                  <Field label="Chave Pix" hint="CPF, CNPJ, e-mail, celular (+55...) ou chave aleatória.">
                    <input className={input} value={c.pix?.key ?? ''} maxLength={77}
                      onChange={(e) => set((x) => {
                        const key = e.target.value
                        x.pix = key ? { name: `${x.name.first} ${x.name.last}`.trim().slice(0, 25), city: (x.location ?? '').slice(0, 15), ...x.pix, key } : undefined
                      })} />
                  </Field>
                </div>
                {c.pix && <>
                  <Field label="Nome do recebedor" hint="Como aparece no banco. Até 25 letras.">
                    <input className={input} value={c.pix.name} maxLength={25} onChange={(e) => set((x) => { x.pix!.name = e.target.value })} />
                  </Field>
                  <Field label="Cidade" hint="Até 15 letras.">
                    <input className={input} value={c.pix.city} maxLength={15} onChange={(e) => set((x) => { x.pix!.city = e.target.value })} />
                  </Field>
                </>}
              </div>
            </Section>
          )}

          {full && opened.has('chamada') && (
            <Section icon={<Megaphone size={17} weight="bold" />} title="Chamada principal" id="chamada" description="O convite para trabalhar com você">
              <div className="grid gap-4">
                <Field label="Título"><input className={input} value={c.partnership.title} onChange={(e) => set((x) => { x.partnership.title = e.target.value })} /></Field>
                <Field label="Texto"><textarea rows={2} className={input} value={c.partnership.text} onChange={(e) => set((x) => { x.partnership.text = e.target.value })} /></Field>
                <Tags label="Etiquetas (opcional)" placeholder="Ex: Reels, UGC, Convênios..." value={c.partnership.formats ?? []}
                  onChange={(v) => set((x) => { x.partnership.formats = v.length ? v : undefined })} />
              </div>
            </Section>
          )}

          {full && opened.has('cupons') && (
            <Section icon={<Ticket size={17} weight="bold" />} title="Cupons de desconto" id="cupons" description="Códigos que o visitante copia com um toque" badge={count(c.coupons?.length, 'cupom', 'cupons')}>
              <div className="grid gap-3">
                {(c.coupons ?? []).map((k, i) => (
                  <div key={i} className="grid gap-2 rounded-[14px] border border-line p-3 @md:grid-cols-2">
                    <input aria-label="Marca" placeholder="Marca" className={input} value={k.brand} onChange={(e) => set((x) => { x.coupons![i].brand = e.target.value })} />
                    <input aria-label="Código do cupom" placeholder="CÓDIGO" className={`${input} font-mono uppercase`} value={k.code}
                      onChange={(e) => set((x) => { x.coupons![i].code = e.target.value.toUpperCase().replace(/\s/g, '') })} />
                    <input aria-label="Desconto" placeholder="Ex: 15% OFF, Frete grátis" className={input} value={k.discount ?? ''} onChange={(e) => set((x) => { x.coupons![i].discount = e.target.value || undefined })} />
                    <div className="flex gap-2">
                      <input aria-label="Link da loja" type="url" placeholder="Link da loja (opcional)" className={`${input} min-w-0`} value={k.url ?? ''} onChange={(e) => set((x) => { x.coupons![i].url = e.target.value || undefined })} />
                      <button type="button" className={`${iconBtn} hover:text-red-500`} onClick={() => set((x) => { x.coupons!.splice(i, 1) })} aria-label="Remover cupom" title="Remover cupom">
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                <button type="button" className={`${secondary} justify-self-start`} onClick={() => set((x) => { (x.coupons ??= []).push({ brand: '', code: '' }) })}>
                  <Plus size={15} weight="bold" aria-hidden="true" /> Adicionar cupom
                </button>
              </div>
            </Section>
          )}

          {full && opened.has('destaque') && (
            <Section icon={<Star size={17} weight="bold" />} title="Destaque" id="destaque" description="Um vídeo, post ou projeto em evidência" badge={c.featured ? 'Ativo' : undefined}>
              {!c.featured ? (
                <div className="grid justify-items-start gap-3">
                  <p className="text-sm text-muted">Um vídeo, post ou projeto em evidência, com imagem grande.</p>
                  <button type="button" className={secondary}
                    onClick={() => set((x) => { x.featured = { title: '', platform: 'youtube', url: '', kind: 'video', image: { src: '', alt: '' } } })}>
                    <Plus size={15} weight="bold" aria-hidden="true" /> Adicionar destaque
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 @md:grid-cols-2">
                  <div className="@md:col-span-2">
                    <Field label="Título"><input className={input} value={c.featured.title} onChange={(e) => set((x) => { x.featured!.title = e.target.value })} /></Field>
                  </div>
                  <Field label="Link"><input type="url" placeholder="https://" className={input} value={c.featured.url} onChange={(e) => set((x) => { x.featured!.url = e.target.value })} /></Field>
                  <Field label="Onde está">
                    <select className={input} value={c.featured.platform} onChange={(e) => set((x) => { x.featured!.platform = e.target.value as Platform })}>
                      {PLATFORMS.map((p) => <option key={p} value={p}>{platformMeta[p].name}</option>)}
                    </select>
                  </Field>
                  <div className="grid content-start gap-2 @md:col-span-2">
                    <span className="text-[13px] font-medium">Imagem</span>
                    <ImagePicker value={c.featured.image.src} onChange={(v) => set((x) => { x.featured!.image = { ...x.featured!.image, src: v, focal: undefined, zoom: undefined, fit: undefined } })} onError={setError}
                      thumbClass="h-14 w-[100px] rounded-[8px]" fallback={<ImageIcon size={20} aria-hidden="true" />} />
                    <PhotoHint spec={FEATURED_SPEC} />
                    {c.featured.image.src && <PhotoFrame src={c.featured.image.src} value={c.featured.image} spec={FEATURED_SPEC}
                      onChange={(f) => set((x) => { x.featured!.image = { ...x.featured!.image, ...f } })} />}
                  </div>
                  <fieldset className="grid gap-2 @md:col-span-2">
                    <legend className="mb-2 text-[13px] font-medium">Tipo</legend>
                    <div className="grid grid-cols-3 rounded-[12px] border border-line bg-bg p-1">
                      {KINDS.map((k) => (
                        <label key={k.id} className={`press cursor-pointer rounded-[9px] py-2 text-center text-sm font-medium ${c.featured!.kind === k.id ? 'bg-surface-2 text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
                          <input type="radio" name="kind" className="sr-only" checked={c.featured!.kind === k.id} onChange={() => set((x) => { x.featured!.kind = k.id })} />
                          {k.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <button type="button" className={`${secondary} justify-self-start hover:text-red-500`} onClick={() => set((x) => { x.featured = undefined })}>
                    <Trash size={15} aria-hidden="true" /> Remover destaque
                  </button>
                </div>
              )}
            </Section>
          )}

          {full && opened.has('extra') && (
            <Section icon={<Sparkle size={17} weight="bold" />} title={c.now?.title || 'Bloco extra'} id="extra" description="Um bloco livre com o que quiser" badge={c.now ? 'Ativo' : undefined}>
              {!c.now ? (
                <div className="grid justify-items-start gap-3">
                  <p className="text-sm text-muted">O que está fazendo agora, especialidades, convênios aceitos...</p>
                  <button type="button" className={secondary} onClick={() => set((x) => { x.now = { title: 'Agora', text: '' } })}>
                    <Plus size={15} weight="bold" aria-hidden="true" /> Adicionar bloco
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  <Field label="Título do bloco"><input className={input} value={c.now.title} placeholder="Ex: Agora, Especialidades, Convênios" onChange={(e) => set((x) => { x.now!.title = e.target.value })} /></Field>
                  <Field label="Texto"><textarea rows={2} className={input} value={c.now.text} onChange={(e) => set((x) => { x.now!.text = e.target.value })} /></Field>
                  <Field label="Link (opcional)" hint="Mostra um botão Ver mais.">
                    <input type="url" placeholder="https://" className={input} value={c.now.url ?? ''} onChange={(e) => set((x) => { x.now!.url = e.target.value || undefined })} />
                  </Field>
                  <Tags label="Itens (opcional)" placeholder="Ex: Ansiedade, Unimed, Corrida..." value={c.now.interests ?? []}
                    onChange={(v) => set((x) => { x.now!.interests = v.length ? v : undefined })} />
                  <button type="button" className={`${secondary} justify-self-start hover:text-red-500`} onClick={() => set((x) => { x.now = undefined })}>
                    <Trash size={15} aria-hidden="true" /> Remover bloco
                  </button>
                </div>
              )}
            </Section>
          )}

          {full && opened.has('marcas') && (
            <Section icon={<ListBullets size={17} weight="bold" />} title="Marcas parceiras" id="marcas" description="Só marcas com quem já trabalhou de verdade" badge={count(c.brands?.length, 'marca', 'marcas')}>
              <div className="grid gap-3">
                {(c.brands ?? []).map((b, i) => (
                  <div key={i} className="grid gap-2 rounded-[14px] border border-line p-3 @lg:grid-cols-[auto_1fr_1.3fr_auto] @lg:items-center">
                    <Thumb src={b.logo} className="hidden size-10 rounded-[10px] @lg:grid" fallback={<ListBullets size={16} aria-hidden="true" />} />
                    <input aria-label="Nome da marca" placeholder="Nome" className={input} value={b.name} onChange={(e) => set((x) => { x.brands![i].name = e.target.value })} />
                    <input aria-label="Logo (link)" type="url" placeholder="Logo (link, opcional)" className={input} value={b.logo ?? ''} onChange={(e) => set((x) => { x.brands![i].logo = e.target.value || undefined })} />
                    <button type="button" className={`${iconBtn} hover:text-red-500`} onClick={() => set((x) => { x.brands!.splice(i, 1) })} aria-label="Remover marca" title="Remover marca">
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
                <button type="button" className={`${secondary} justify-self-start`} onClick={() => set((x) => { (x.brands ??= []).push({ name: '' }) })}>
                  <Plus size={15} weight="bold" aria-hidden="true" /> Adicionar marca
                </button>
              </div>
            </Section>
          )}

          {!full && (
            <div className="flex items-center gap-3">
              <button type="button" className={secondary} disabled={step === 0} onClick={() => toStep(step - 1)}>
                <ArrowLeft size={15} aria-hidden="true" /> Voltar
              </button>
              <span className="flex-1 text-center text-[13px] text-muted">
                {step === STEPS.length - 1 ? 'Pronto para ir ao ar.' : <>A seguir: <b className="font-medium text-ink">{STEPS[step + 1][0]}</b></>}
              </span>
              <button type="button" onClick={() => (step === STEPS.length - 1 ? finish() : toStep(step + 1))}
                className="press inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg hover:brightness-110">
                {step === STEPS.length - 1 ? <><Check size={15} weight="bold" aria-hidden="true" /> Concluir</> : <>Continuar <ArrowRight size={15} weight="bold" aria-hidden="true" /></>}
              </button>
            </div>
          )}

          {/* Avançado: o que é raro mudar ou pode quebrar algo (link, QR) fica guardado aqui. */}
          <details id="avancado" hidden={!full} className="group scroll-mt-36 rounded-[20px] border border-dashed border-line px-5 py-4 sm:px-6">
            <summary className="flex cursor-pointer list-none items-center gap-2.5 [&::-webkit-details-marker]:hidden">
              <GearSix size={16} className="text-muted" aria-hidden="true" />
              <span className="text-sm font-medium text-muted">Configurações avançadas</span>
              <span className="ml-auto text-[12px] text-muted group-open:hidden">Link, @, Google</span>
            </summary>
            <div className="@container mt-5 grid gap-6">
              <div className="grid gap-4 @md:grid-cols-2">
                <Field label="Link do cartão" hint={slug !== saved.slug
                  ? (SLUG.test(slug) ? 'Ainda não salvo: aperte Enter ou saia do campo.' : 'Use de 3 a 31 caracteres: letras minúsculas, números, ponto, hífen ou _.')
                  : 'Mudar o link faz o link e os QR codes antigos pararem de funcionar.'}>
                  <div className="flex items-center rounded-[12px] bg-[#f2f2f4] focus-within:bg-white focus-within:ring-2 focus-within:ring-accent/40">
                    <span className="pl-3.5 text-[15px] text-muted">/</span>
                    <input value={slug} autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      onChange={(e) => setSlug(toSlug(e.target.value))}
                      onBlur={() => slug !== saved.slug && SLUG.test(slug) && save()}
                      className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 pl-0.5 text-[16px] text-ink outline-none sm:text-[15px]" />
                  </div>
                </Field>
                <Field label="@ exibido no cartão">
                  <input className={input} value={c.username} onChange={(e) => set((x) => { x.username = e.target.value })} />
                </Field>
                <Field label="Descrição da foto" hint="Lida por leitores de tela.">
                  <input className={input} value={c.photo.alt} onChange={(e) => set((x) => { x.photo.alt = e.target.value })} />
                </Field>
                {c.featured && (
                  <Field label="Descrição da imagem do destaque" hint="Lida por leitores de tela.">
                    <input className={input} value={c.featured.image.alt} onChange={(e) => set((x) => { x.featured!.image.alt = e.target.value })} />
                  </Field>
                )}
              </div>

              <div id="compartilhar" className="grid scroll-mt-36 gap-4">
                <p className="flex items-center gap-2 text-[13px] font-medium"><ShareNetwork size={15} aria-hidden="true" /> Como o link aparece no Google e no WhatsApp</p>
                <Field label="Título da página"><input className={input} value={c.seo.title} onChange={(e) => set((x) => { x.seo.title = e.target.value })} /></Field>
                <Field label="Descrição"><input className={input} value={c.seo.description} onChange={(e) => set((x) => { x.seo.description = e.target.value })} /></Field>
              </div>

              <details className="group/j" onToggle={(e) => e.currentTarget.open && setJson(JSON.stringify(config, null, 2))}>
                <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-medium text-muted [&::-webkit-details-marker]:hidden">
                  <Code size={15} aria-hidden="true" /> Edição técnica (JSON)
                </summary>
                <textarea rows={18} spellCheck={false} className={`${input} mt-3 font-mono text-[13px] leading-relaxed`} value={json} onChange={(e) => setJson(e.target.value)} />
                <button type="button" className={`${secondary} mt-3`} onClick={applyJson}>Aplicar JSON</button>
              </details>
            </div>
          </details>
        </fieldset>

        {/* Um único preview: coluna lateral no desktop, tela cheia no celular quando aberto. */}
        <aside className={preview ? 'fixed inset-0 z-30 overflow-auto overscroll-contain bg-[#f5f5f7] p-4 pt-16 pb-[max(1rem,env(safe-area-inset-bottom))] lg:static lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0' : 'hidden lg:block'}>
          {preview && (
            <button type="button" onClick={() => setPreview(false)} className={`${iconBtn} fixed top-[max(1rem,env(safe-area-inset-top))] right-4 bg-surface lg:hidden`} aria-label="Fechar prévia">
              <X size={17} />
            </button>
          )}
          <DevicePreview frame={frame} src={`/${saved.slug}?preview`} pulse={pulse} onDevice={(d) => setMobileView(d === 'celular')}
            toolbar={selText ? <TextInspector label={TEXT_LABELS.find(([id]) => id === selText)![1]} l={lay[selText]} size={sel?.size} accent={c.accent} mobile={mobileView}
                onPos={(p) => setLayout(selText, p, mobileView)} onBoth={(p) => setBoth(selText, p)} onClose={() => select(null)} />
              : selExtra ? <ExtraInspector x={selExtra} accent={c.accent} first={c.extras![0] === selExtra} last={c.extras!.at(-1) === selExtra}
                onChange={(p) => setExtra(selExtra.id, p)} onLayer={(d) => layer(selExtra.id, d)} onRemove={() => removeExtra(selExtra.id)} onClose={() => select(null)}
                onCopy={() => { const { id: _, ...rest } = selExtra; addExtra({ ...rest, x: Math.min(100, rest.x + 5), y: Math.min(100, rest.y + 5) }) }} />
              : <AddBar disabled={c.style === 'simples'} full={(c.extras?.length ?? 0) >= MAX_EXTRAS} onAdd={addExtra} onError={setError} />} />
        </aside>
        {!preview && (
          <button type="button" onClick={() => setPreview(true)}
            className="press fixed right-4 bottom-[calc(1rem+var(--banner-h,0px)+env(safe-area-inset-bottom))] z-20 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-fg shadow-2xl lg:hidden">
            <Eye size={17} weight="bold" aria-hidden="true" /> Ver prévia
          </button>
        )}
      </div>
    </form>
  )
}
