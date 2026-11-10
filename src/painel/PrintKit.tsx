import { ArrowLeft, ArrowSquareOut, Check, DownloadSimple, Minus, Plus, Printer } from '@phosphor-icons/react'
import { useEffect, useState, type CSSProperties } from 'react'
import { encode } from 'uqr'
import { QrCode } from '../components/QrCode'
import { accentForeground } from '../lib/color'
import { tagged } from '../lib/track'
import { api, ApiError, type Card } from './api'
import { Errors, errorText, input, primary, secondary } from './ui'

/** Tamanhos reais em mm. A impressão sai na medida com "Tamanho real / 100%". */
const FORMATS = {
  cartao: { label: 'Cartão de visita', size: '9 × 5 cm', use: 'Para entregar em mãos', w: 90, h: 50 },
  adesivo: { label: 'Adesivo de balcão', size: '10 × 10 cm', use: 'Balcão, caixa e vitrine', w: 100, h: 100 },
  mesa: { label: 'Display de mesa', size: 'A6, 10,5 × 14,8 cm', use: 'Mesas e recepção', w: 105, h: 148 },
  story: { label: 'Story do Instagram', size: '1080 × 1920 px', use: 'Imagem para postar', w: 54, h: 96 },
} as const
type Format = keyof typeof FORMATS

const THEMES = { cor: 'Cor do cartão', claro: 'Claro', escuro: 'Escuro' } as const
type Theme = keyof typeof THEMES

const CALLS = ['Aponte a câmera do celular', 'Fale com a gente no WhatsApp', 'Pague com Pix aqui', 'Avalie a gente no Google', 'Siga nossas redes']

const cardUrl = (slug: string) => tagged(`${location.origin}/${slug}`, 'qr')

/** Cores da peça. "Cor do cartão" usa o destaque; claro e escuro mantêm o destaque só no texto de apoio. */
function palette(theme: Theme, accent: string) {
  if (theme === 'cor') return { bg: accent, fg: accentForeground(accent), sub: accentForeground(accent), soft: 0.82 }
  if (theme === 'escuro') return { bg: '#161618', fg: '#f5f5f7', sub: accent, soft: 0.7 }
  return { bg: '#ffffff', fg: '#161618', sub: accent, soft: 0.65 }
}

interface PieceProps { card: Card; format: Format; theme: Theme; call: string }

/** Uma peça desenhada em mm. A mesma vale para a prévia e para o papel. */
function Piece({ card, format, theme, call }: PieceProps) {
  const c = card.config
  const f = FORMATS[format]
  const url = cardUrl(card.slug)
  const p = palette(theme, c.accent)
  const name = `${c.name.first} ${c.name.last}`.trim()
  const short = `${location.host}/${card.slug}`
  const box: CSSProperties = { width: `${f.w}mm`, height: `${f.h}mm`, background: p.bg, color: p.fg }
  const qr = (w: string) => (
    <div className="rounded-[3mm] bg-white p-[2.5mm] text-[#161618]">
      <div style={{ width: w }}><QrCode value={url} label={`QR code para ${url}`} className="block w-full" /></div>
    </div>
  )

  if (format === 'cartao') {
    return (
      <div className="print-piece grid grid-cols-[1fr_auto] items-center gap-[4mm] overflow-hidden p-[5mm]" style={box}>
        <div className="min-w-0">
          <p className="text-[13pt] leading-[1.1] font-semibold tracking-[-0.02em]">{name}</p>
          <p className="mt-[1mm] text-[7.5pt]" style={{ opacity: p.soft }}>{c.niche}</p>
          <div className="mt-[4mm] grid gap-[0.6mm] text-[7pt]">
            {c.whatsapp?.display && <span>{c.whatsapp.display}</span>}
            {c.email?.address && <span className="truncate">{c.email.address}</span>}
            <span className="font-semibold" style={{ color: p.sub }}>{short}</span>
          </div>
        </div>
        {qr('24mm')}
      </div>
    )
  }

  const big = format === 'mesa'
  return (
    <div className="print-piece flex flex-col items-center justify-between overflow-hidden text-center" style={{ ...box, padding: big ? '9mm 7mm' : format === 'story' ? '7mm 5mm' : '6mm' }}>
      <div>
        <p className={`${big ? 'text-[17pt]' : format === 'story' ? 'text-[11pt]' : 'text-[13pt]'} leading-[1.1] font-semibold tracking-[-0.02em]`}>{name}</p>
        <p className={`mt-[1mm] ${big ? 'text-[9pt]' : 'text-[7pt]'}`} style={{ opacity: p.soft }}>{c.niche}</p>
      </div>
      {qr(big ? '56mm' : format === 'story' ? '30mm' : '44mm')}
      <div>
        <p className={`${big ? 'text-[12pt]' : format === 'story' ? 'text-[8pt]' : 'text-[9.5pt]'} leading-tight font-semibold`}>{call}</p>
        <p className={`mt-[1mm] ${big ? 'text-[8.5pt]' : 'text-[6.5pt]'} font-semibold`} style={{ color: p.sub }}>{short}</p>
      </div>
    </div>
  )
}

/** Story 1080×1920 desenhado num canvas, com o mesmo layout da prévia. */
function downloadStory(card: Card, theme: Theme, call: string) {
  const c = card.config
  const W = 1080, H = 1920
  const p = palette(theme, c.accent)
  const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H })
  const g = canvas.getContext('2d')!
  g.fillStyle = p.bg
  g.fillRect(0, 0, W, H)
  g.textAlign = 'center'
  g.fillStyle = p.fg
  g.font = '600 92px Geist, system-ui, sans-serif'
  g.fillText(`${c.name.first} ${c.name.last}`.trim(), W / 2, 330, W - 140)
  g.globalAlpha = p.soft
  g.font = '400 46px Geist, system-ui, sans-serif'
  g.fillText(c.niche, W / 2, 400, W - 140)
  g.globalAlpha = 1

  const box = 660, x0 = (W - box) / 2, y0 = (H - box) / 2
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.roundRect(x0, y0, box, box, 56)
  g.fill()
  const qr = encode(cardUrl(card.slug), { ecc: 'M', border: 0 })
  const pad = 56, cell = (box - pad * 2) / qr.size
  g.fillStyle = '#161618'
  qr.data.forEach((row, y) => row.forEach((on, x) => { if (on) g.fillRect(x0 + pad + x * cell, y0 + pad + y * cell, Math.ceil(cell), Math.ceil(cell)) }))

  g.fillStyle = p.fg
  g.font = '600 58px Geist, system-ui, sans-serif'
  g.fillText(call, W / 2, 1560, W - 140)
  g.fillStyle = p.sub
  g.font = '600 42px Geist, system-ui, sans-serif'
  g.fillText(`${location.host}/${card.slug}`, W / 2, 1640, W - 140)

  canvas.toBlob((blob) => {
    if (!blob) return
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `story-${card.slug}.png` })
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }, 'image/png')
}

/** Miniatura proporcional do formato, para escolher pela forma e não só pelo nome. */
const Shape = ({ f, on }: { f: Format; on: boolean }) => {
  const { w, h } = FORMATS[f]
  const k = 34 / Math.max(w, h)
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#f5f5f7]">
      <span className={`rounded-[3px] transition-colors ${on ? 'bg-accent' : 'bg-[#d1d1d6]'}`} style={{ width: w * k, height: h * k }} />
    </span>
  )
}

const label = 'text-[13px] font-semibold text-ink'

/** /painel/imprimir/:id */
export function PrintKit({ cardId, onBack, onAuthLost }: { cardId: string; onBack: () => void; onAuthLost: () => void }) {
  const [card, setCard] = useState<Card | null>(null)
  const [format, setFormat] = useState<Format>('adesivo')
  const [theme, setTheme] = useState<Theme>('cor')
  const [call, setCall] = useState(CALLS[0])
  const [custom, setCustom] = useState(false)
  const [copies, setCopies] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Card[]>('/cards').then((cs) => {
      const c = cs.find((x) => x.id === cardId)
      if (c) setCard(c)
      else setError('Cartão não encontrado. Ele pode ter sido excluído.')
    }, (e) => (e instanceof ApiError && e.status === 401 ? onAuthLost() : setError(errorText(e))))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isStory = format === 'story'
  const url = card ? cardUrl(card.slug) : ''

  return (
    <div className="rise grid gap-6">
      <button type="button" onClick={onBack} className="print-hide press inline-flex items-center gap-1.5 justify-self-start text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={15} aria-hidden="true" /> Trocar cartão
      </button>

      <header className="print-hide grid gap-1">
        <h1 className="text-[40px] leading-[1.05] font-semibold tracking-[-0.045em]">Kit de impressão</h1>
        <p className="text-[17px] text-muted">
          {card ? <>{`${card.config.name.first} ${card.config.name.last}`.trim()} <span className="text-[#c7c7cc]">/</span> {card.slug}</> : 'Carregando...'}
        </p>
      </header>

      <Errors text={error} />

      {!card && !error && (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]" aria-hidden="true">
          <div className="h-[520px] animate-pulse rounded-[24px] bg-[#f2f2f4]" />
          <div className="h-[520px] animate-pulse rounded-[24px] bg-[#f2f2f4]" />
        </div>
      )}

      {card && (
        <div className="print-hide grid items-start gap-4 lg:grid-cols-[380px_1fr]">
          {/* Controles */}
          <div className="tile grid gap-6 p-5 sm:p-6 lg:sticky lg:top-6">
            <fieldset className="grid gap-2">
              <legend className={`${label} mb-2`}>Formato</legend>
              {(Object.keys(FORMATS) as Format[]).map((k) => {
                const on = format === k
                return (
                  <label key={k} className={`press flex cursor-pointer items-center gap-3 rounded-[16px] border p-2.5 pr-3 transition-colors ${on ? 'border-accent bg-accent/6' : 'border-line hover:bg-[#f5f5f7]'}`}>
                    <input type="radio" name="format" className="sr-only" checked={on} onChange={() => setFormat(k)} />
                    <Shape f={k} on={on} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{FORMATS[k].label}</span>
                      <span className="block text-[13px] text-muted">{FORMATS[k].use}, {FORMATS[k].size}</span>
                    </span>
                    {on && <Check size={17} weight="bold" className="text-accent" aria-hidden="true" />}
                  </label>
                )
              })}
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className={`${label} mb-2`}>Cores</legend>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(THEMES) as Theme[]).map((t) => {
                  const p = palette(t, card.config.accent)
                  return (
                    <label key={t} className={`press grid cursor-pointer justify-items-center gap-1.5 rounded-[14px] border p-2.5 text-[13px] font-medium ${theme === t ? 'border-accent bg-accent/6' : 'border-line hover:bg-[#f5f5f7]'}`}>
                      <input type="radio" name="theme" className="sr-only" checked={theme === t} onChange={() => setTheme(t)} />
                      <span className="grid size-8 place-items-center rounded-full border border-line" style={{ background: p.bg }}>
                        <span className="size-3 rounded-[3px] bg-white ring-1 ring-black/10" />
                      </span>
                      {THEMES[t]}
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {format !== 'cartao' && (
              <div className="grid gap-2">
                <label htmlFor="call" className={label}>Frase de chamada</label>
                <select id="call" className={input} value={custom ? '__custom' : call}
                  onChange={(e) => { if (e.target.value === '__custom') { setCustom(true) } else { setCustom(false); setCall(e.target.value) } }}>
                  {CALLS.map((t) => <option key={t} value={t}>{t}</option>)}
                  <option value="__custom">Escrever a minha...</option>
                </select>
                {custom && (
                  <input className={input} maxLength={40} value={call} onChange={(e) => setCall(e.target.value)} aria-label="Sua frase de chamada" placeholder="Ex: Cardápio e pedidos aqui" />
                )}
                <span className="text-[12px] text-muted">Diga o que a pessoa ganha ao escanear.</span>
              </div>
            )}

            {!isStory && (
              <div className="flex items-center justify-between gap-3">
                <span className={label} id="copies-label">Cópias</span>
                <div className="flex items-center gap-1 rounded-full bg-[#f5f5f7] p-1" role="group" aria-labelledby="copies-label">
                  <button type="button" className="press grid size-8 place-items-center rounded-full hover:bg-white disabled:opacity-30" disabled={copies <= 1} onClick={() => setCopies((n) => n - 1)} aria-label="Menos uma cópia"><Minus size={14} weight="bold" /></button>
                  <span className="w-8 text-center text-[15px] font-semibold tabular-nums" aria-live="polite">{copies}</span>
                  <button type="button" className="press grid size-8 place-items-center rounded-full hover:bg-white disabled:opacity-30" disabled={copies >= 20} onClick={() => setCopies((n) => n + 1)} aria-label="Mais uma cópia"><Plus size={14} weight="bold" /></button>
                </div>
              </div>
            )}

            <div className="grid gap-2 border-t border-line pt-5">
              {isStory ? (
                <button type="button" className={primary} onClick={() => downloadStory(card, theme, call)}><DownloadSimple size={17} aria-hidden="true" /> Baixar imagem</button>
              ) : (
                <button type="button" className={primary} onClick={() => print()}><Printer size={17} aria-hidden="true" /> Imprimir ou salvar PDF</button>
              )}
              <a className={secondary} href={url} target="_blank" rel="noopener noreferrer"><ArrowSquareOut size={16} aria-hidden="true" /> Testar o link do QR</a>
            </div>
          </div>

          {/* Prévia */}
          <section aria-label="Prévia" className="grid gap-4">
            <div className="grid min-h-[420px] place-items-center overflow-hidden rounded-[24px] bg-[#ececef] p-6 sm:min-h-[560px] sm:p-10"
              style={{ backgroundImage: 'radial-gradient(rgb(0 0 0 / 0.06) 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
              <div key={`${format}-${theme}`} className="rise max-w-full overflow-hidden rounded-[6px] shadow-[0_24px_60px_-20px_rgb(40_40_50/0.35),0_2px_6px_rgb(40_40_50/0.08)]"
                style={isStory ? { borderRadius: 18, zoom: 1.6 } : undefined}>
                <Piece card={card} format={format} theme={theme} call={call} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <p className="rounded-[16px] bg-[#f5f5f7] p-4 text-[14px] leading-relaxed">
                {isStory
                  ? 'Poste nos Stories e use o adesivo de link do Instagram apontando para o seu cartão.'
                  : <>Na janela de impressão escolha <b>Tamanho real (100%)</b>. Papel couché ou adesivo vinil deixam o QR mais nítido.</>}
              </p>
              <p className="rounded-[16px] bg-[#f5f5f7] p-4 text-[14px] leading-relaxed">
                Escaneie com o celular antes de mandar para a gráfica. Quem vier pelo QR aparece como <b>QR code impresso</b> nas estatísticas.
              </p>
            </div>
          </section>
        </div>
      )}

      {/* Só isto vai para o papel. */}
      {card && !isStory && (
        <div id="print-area" className="hidden flex-wrap gap-[4mm] print:flex">
          {Array.from({ length: copies }, (_, i) => <Piece key={i} card={card} format={format} theme={theme} call={call} />)}
        </div>
      )}
    </div>
  )
}
