import { ArrowDown, ArrowLeft, ArrowUp, CalendarBlank, Lightbulb, X } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { api, ApiError, type Card } from './api'
import { Errors, errorText, input } from './ui'

interface Summary {
  from: string
  to: string
  days: number
  source: string | null
  views: number
  clicks: number
  previous: { views: number; clicks: number }
  byDay: { day: string; views: number; clicks: number }[]
  byHour: { hour: number; views: number }[]
  bySource: { source: string; count: number }[]
  byTarget: { target: string; count: number }[]
}

const SOURCE: Record<string, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', whatsapp: 'WhatsApp', qr: 'QR code impresso', google: 'Google',
  youtube: 'YouTube', x: 'X (Twitter)', linkedin: 'LinkedIn', compartilhado: 'Botão compartilhar', contato: 'Contato salvo',
  direto: 'Link direto', outro: 'Outros sites',
}
const TARGET: Record<string, string> = {
  whatsapp: 'WhatsApp', email: 'E-mail', site: 'Site', website: 'Site', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube',
  pinterest: 'Pinterest', spotify: 'Spotify', x: 'X (Twitter)', cupom: 'Cupom copiado', pix: 'Pix', maps: 'Google Maps', waze: 'Waze',
  uber: 'Uber', avaliar: 'Avaliar no Google', contato: 'Salvar contato', compartilhar: 'Compartilhar', link: 'Outros links',
}

/* Datas em YYYY-MM-DD no fuso de Brasília (o mesmo da API). */
const TZ = 'America/Sao_Paulo'
const ymd = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: TZ })
const today = () => ymd(new Date())
const addDays = (s: string, n: number) => ymd(new Date(new Date(`${s}T12:00:00-03:00`).getTime() + n * 864e5))
const nice = (s: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) =>
  new Date(`${s}T12:00:00-03:00`).toLocaleDateString('pt-BR', { timeZone: TZ, ...opts }).replace('.', '')
const fmt = (n: number) => n.toLocaleString('pt-BR')

const PRESETS = [
  { id: 'hoje', label: 'Hoje', days: 1 },
  { id: '7', label: '7 dias', days: 7 },
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '90 dias', days: 90 },
] as const
type Preset = (typeof PRESETS)[number]['id'] | 'custom'

/** Filtros ficam na URL (?periodo=30, ?de=&ate=, ?origem=): recarregar ou mandar o link mantém a mesma visão. */
function readFilters() {
  const q = new URLSearchParams(location.search)
  const de = q.get('de'), ate = q.get('ate')
  const preset = (de && ate ? 'custom' : PRESETS.find((p) => p.id === q.get('periodo'))?.id ?? '30') as Preset
  return { preset, from: de ?? addDays(today(), -29), to: ate ?? today(), source: q.get('origem') ?? '' }
}
function writeFilters(f: { preset: Preset; from: string; to: string; source: string }) {
  const q = new URLSearchParams()
  if (f.preset === 'custom') { q.set('de', f.from); q.set('ate', f.to) } else if (f.preset !== '30') q.set('periodo', f.preset)
  if (f.source) q.set('origem', f.source)
  history.replaceState(null, '', `${location.pathname}${q.size ? `?${q}` : ''}`)
}
const rangeOf = (f: { preset: Preset; from: string; to: string }) => {
  if (f.preset === 'custom') return { from: f.from, to: f.to }
  const days = PRESETS.find((p) => p.id === f.preset)!.days
  return { from: addDays(today(), -(days - 1)), to: today() }
}

function fillDays(rows: Summary['byDay'], from: string, days: number) {
  const map = new Map(rows.map((r) => [r.day, r]))
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(from, i)
    return map.get(day) ?? { day, views: 0, clicks: 0 }
  })
}

/** Variação contra o período anterior. Sem base (0 antes) não inventa porcentagem. */
function Delta({ now, before }: { now: number; before: number }) {
  if (before === 0) return <span className="text-[13px] text-muted">{now > 0 ? 'Primeiro período com dados' : 'Sem dados no período anterior'}</span>
  const pct = Math.round(((now - before) / before) * 100)
  const Icon = pct >= 0 ? ArrowUp : ArrowDown
  return (
    <span className="inline-flex items-center gap-1 text-[13px] text-muted">
      <Icon size={13} weight="bold" aria-hidden="true" className={pct >= 0 ? 'text-accent' : ''} />
      <span className="font-semibold text-ink tabular-nums">{pct > 0 ? '+' : ''}{pct}%</span> vs. período anterior
    </span>
  )
}

function Ranked({ title, rows, names, empty, active, onPick }: {
  title: string; rows: { key: string; count: number }[]; names: Record<string, string>; empty: string
  active?: string; onPick?: (key: string) => void
}) {
  const total = rows.reduce((a, r) => a + r.count, 0)
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <section className="tile grid content-start gap-4 p-5 sm:p-6">
      <div>
        <h2 className="text-[16px] font-semibold">{title}</h2>
        {onPick && rows.length > 0 && <p className="mt-0.5 text-[13px] text-muted">Toque numa origem para ver só ela.</p>}
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted">{empty}</p> : (
        <ol className="grid gap-1">
          {rows.slice(0, 8).map((r) => {
            const on = active === r.key
            const body = (
              <>
                <span className="flex justify-between gap-3 text-[14px]">
                  <span className={on ? 'font-semibold' : ''}>{names[r.key] ?? r.key}</span>
                  <span className="text-muted tabular-nums"><span className="font-semibold text-ink">{fmt(r.count)}</span> · {Math.round((r.count / total) * 100)}%</span>
                </span>
                <span className="mt-1.5 block h-1.5 rounded-full bg-accent/80" style={{ width: `${Math.max(3, (r.count / max) * 100)}%`, opacity: active && !on ? 0.35 : 1 }} />
              </>
            )
            return (
              <li key={r.key}>
                {onPick ? (
                  <button type="button" onClick={() => onPick(on ? '' : r.key)} aria-pressed={on}
                    className={`press block w-full rounded-[12px] px-3 py-2 text-left hover:bg-[#f5f5f7] ${on ? 'bg-[#f5f5f7]' : ''}`}>{body}</button>
                ) : <div className="px-3 py-2">{body}</div>}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

function Skeleton() {
  const block = 'animate-pulse rounded-[20px] bg-[#f2f2f4]'
  return (
    <div className="grid gap-3" aria-hidden="true">
      <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className={`${block} h-[124px]`} />)}</div>
      <div className={`${block} h-[300px]`} />
      <div className="grid gap-3 md:grid-cols-2"><div className={`${block} h-[260px]`} /><div className={`${block} h-[260px]`} /></div>
    </div>
  )
}

/** Frases curtas que respondem "e daí?" sem a pessoa precisar ler gráfico. */
function insights(d: Summary, series: Summary['byDay']) {
  const out: string[] = []
  const best = series.reduce((a, b) => (b.views > a.views ? b : a), series[0])
  if (best && best.views > 0 && d.days > 1) out.push(`Seu melhor dia foi ${nice(best.day, { weekday: 'long', day: 'numeric', month: 'long' })}, com ${fmt(best.views)} ${best.views === 1 ? 'visita' : 'visitas'}.`)
  const top = d.bySource[0]
  if (top && !d.source) out.push(`${SOURCE[top.source] ?? top.source} trouxe ${Math.round((top.count / Math.max(1, d.bySource.reduce((a, r) => a + r.count, 0))) * 100)}% das visitas.`)
  const btn = d.byTarget[0]
  if (btn) out.push(`O botão mais usado foi ${TARGET[btn.target] ?? btn.target} (${fmt(btn.count)} ${btn.count === 1 ? 'clique' : 'cliques'}).`)
  const peak = d.byHour.reduce((a, b) => (b.views > a.views ? b : a), { hour: -1, views: 0 })
  if (peak.views > 0) out.push(`O horário com mais visitas é entre ${peak.hour}h e ${(peak.hour + 1) % 24}h. Bom momento para postar.`)
  return out.slice(0, 3)
}

/** /painel/estatisticas/:id */
/** `admin`: lê pelas rotas /admin (cartão de qualquer usuário), sem o botão de trocar cartão. */
export function Stats({ cardId, onBack, onAuthLost, admin = false }: { cardId: string; onBack?: () => void; onAuthLost: () => void; admin?: boolean }) {
  const [card, setCard] = useState<Card | null>(null)
  const [filters, setFilters] = useState(readFilters)
  const [draft, setDraft] = useState({ from: filters.from, to: filters.to })
  const [metric, setMetric] = useState<'views' | 'clicks'>('views')
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState('')
  const [rangeError, setRangeError] = useState('')

  const fail = (e: unknown) => (e instanceof ApiError && e.status === 401 ? onAuthLost() : setError(errorText(e)))

  useEffect(() => {
    if (admin) return void api<Card>(`/admin/cards/${cardId}`).then(setCard, fail)
    api<Card[]>('/cards').then((cs) => {
      const c = cs.find((x) => x.id === cardId)
      if (c) setCard(c)
      else setError('Cartão não encontrado. Ele pode ter sido excluído.')
    }, fail)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const range = rangeOf(filters)
  useEffect(() => {
    writeFilters(filters)
    setData(null)
    setError('')
    const q = new URLSearchParams({ from: range.from, to: range.to, ...(filters.source && { source: filters.source }) })
    api<Summary>(`${admin ? '/admin' : ''}/cards/${cardId}/stats?${q}`).then(setData, fail)
  }, [cardId, filters.preset, range.from, range.to, filters.source]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch }))
  const applyCustom = () => {
    if (!draft.from || !draft.to) return setRangeError('Escolha as duas datas.')
    if (draft.from > draft.to) return setRangeError('A data inicial precisa ser antes da final.')
    setRangeError('')
    set({ preset: 'custom', from: draft.from, to: draft.to })
  }

  const series = useMemo(() => (data ? fillDays(data.byDay, data.from, data.days) : []), [data])
  const peak = Math.max(1, ...series.map((d) => d[metric]))
  const hours = useMemo(() => Array.from({ length: 24 }, (_, h) => data?.byHour.find((x) => x.hour === h)?.views ?? 0), [data])
  const hourPeak = Math.max(1, ...hours)
  const rate = data && data.views ? Math.round((data.clicks / data.views) * 1000) / 10 : 0
  const prevRate = data && data.previous.views ? Math.round((data.previous.clicks / data.previous.views) * 1000) / 10 : 0
  const periodLabel = data ? (data.days === 1 ? nice(data.from, { day: 'numeric', month: 'long' }) : `${nice(data.from)} a ${nice(data.to)}`) : ''
  const showCustom = filters.preset === 'custom'
  const tick = series.length > 1 ? [series[0], series[Math.floor((series.length - 1) / 2)], series[series.length - 1]] : series
  const tip = insights(data ?? ({ byHour: [], bySource: [], byTarget: [] } as unknown as Summary), series)

  const pill = (on: boolean) => `press shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-medium ${on ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`

  return (
    <div className="rise grid gap-6">
      {onBack && (
        <button type="button" onClick={onBack} className="press inline-flex items-center gap-1.5 justify-self-start text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={15} aria-hidden="true" /> Trocar cartão
      </button>
      )}

      <header className="grid gap-1">
        <h1 className="text-[40px] leading-[1.05] font-semibold tracking-[-0.045em]">Estatísticas</h1>
        <p className="text-[17px] text-muted">
          {card ? <>{`${card.config.name.first} ${card.config.name.last}`.trim()} <span className="text-[#c7c7cc]">/</span> {card.slug}</> : 'Carregando...'}
        </p>
      </header>

      {/* Filtros: uma faixa só, acima de tudo o que eles mudam. */}
      <section aria-label="Filtros" className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Período" className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-[#f5f5f7] p-1 [scrollbar-width:none]">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" aria-pressed={filters.preset === p.id} onClick={() => set({ preset: p.id })} className={pill(filters.preset === p.id)}>{p.label}</button>
            ))}
            <button type="button" aria-pressed={showCustom} onClick={() => set({ preset: 'custom', from: draft.from, to: draft.to })} className={`${pill(showCustom)} inline-flex items-center gap-1.5`}>
              <CalendarBlank size={15} aria-hidden="true" /> Personalizado
            </button>
          </div>
          <label className="relative">
            <span className="sr-only">Origem das visitas</span>
            <select className={`${input} w-auto rounded-full py-2 pr-9 text-[14px]`} value={filters.source} onChange={(e) => set({ source: e.target.value })}>
              <option value="">Todas as origens</option>
              {Object.entries(SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {filters.source && (
            <button type="button" onClick={() => set({ source: '' })}
              className="press inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-accent/20">
              Só {SOURCE[filters.source] ?? filters.source} <X size={13} weight="bold" aria-label="Limpar filtro de origem" />
            </button>
          )}
        </div>

        {showCustom && (
          <div className="tile flex flex-wrap items-end gap-3 p-4">
            <label className="grid gap-1.5">
              <span className="text-[13px] font-medium">De</span>
              <input type="date" className={`${input} w-auto`} value={draft.from} max={draft.to || today()} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[13px] font-medium">Até</span>
              <input type="date" className={`${input} w-auto`} value={draft.to} min={draft.from} max={today()} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
            </label>
            <button type="button" onClick={applyCustom} className="press rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg hover:brightness-110">Aplicar</button>
            <div className="flex flex-wrap gap-1.5">
              {[['Este mês', ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), today()],
                ['Mês passado', ymd(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)), ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 0))]].map(([label, from, to]) => (
                <button key={label} type="button" onClick={() => { setDraft({ from, to }); setRangeError(''); set({ preset: 'custom', from, to }) }}
                  className="press rounded-full border border-line px-3 py-1.5 text-[13px] font-medium hover:bg-[#f5f5f7]">{label}</button>
              ))}
            </div>
            {rangeError && <p className="w-full text-[13px] font-medium text-red-600" role="alert">{rangeError}</p>}
          </div>
        )}
      </section>

      <Errors text={error} />
      {!data && !error && <Skeleton />}

      {data && (
        <>
          <p className="-mt-2 text-[14px] text-muted">
            Mostrando <span className="font-medium text-ink">{periodLabel}</span>{data.source && <> de <span className="font-medium text-ink">{SOURCE[data.source]}</span></>}, comparado aos {data.days} {data.days === 1 ? 'dia anterior' : 'dias anteriores'}.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Visitas', hint: 'Vezes que o cartão foi aberto', value: fmt(data.views), now: data.views, before: data.previous.views },
              { label: 'Cliques', hint: 'Toques em botões e links', value: fmt(data.clicks), now: data.clicks, before: data.previous.clicks },
              { label: 'Taxa de clique', hint: 'De cada 100 visitas, quantas clicaram', value: `${rate.toLocaleString('pt-BR')}%`, now: rate, before: prevRate },
            ].map((k) => (
              <div key={k.label} className="tile grid gap-2 p-5">
                <p className="text-[14px] font-medium">{k.label}</p>
                <p className="text-[40px] leading-none font-semibold tracking-[-0.04em] tabular-nums">{k.value}</p>
                <Delta now={k.now} before={k.before} />
                <p className="text-[12px] text-muted">{k.hint}</p>
              </div>
            ))}
          </div>

          {data.views === 0 ? (
            <section className="tile grid justify-items-start gap-3 p-6 sm:p-8">
              <h2 className="text-[20px] font-semibold tracking-tight">Ainda sem visitas {data.source ? 'dessa origem ' : ''}nesse período</h2>
              <p className="max-w-[60ch] text-[15px] text-muted">Os números aparecem assim que alguém abrir seu cartão. Para começar:</p>
              <ul className="grid gap-1.5 text-[15px]">
                <li>Coloque o link na bio do Instagram com <code className="rounded bg-[#f2f2f4] px-1.5 py-0.5 text-[13px]">?s=ig</code> no final.</li>
                <li>Mande o link nos seus grupos e contatos do WhatsApp.</li>
                <li>Imprima o QR code na aba Imprimir e deixe no balcão.</li>
              </ul>
            </section>
          ) : (
            <>
              {tip.length > 0 && (
                <section aria-label="Resumo" className="grid gap-2 rounded-[20px] bg-accent/8 p-5 sm:p-6">
                  <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Lightbulb size={18} weight="fill" className="text-accent" aria-hidden="true" /> Resumo do período</h2>
                  <ul className="grid gap-1 text-[15px] leading-relaxed">{tip.map((t) => <li key={t}>{t}</li>)}</ul>
                </section>
              )}

              <section className="tile p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-[16px] font-semibold">{metric === 'views' ? 'Visitas' : 'Cliques'} por dia</h2>
                  <div role="group" aria-label="Métrica do gráfico" className="flex gap-1 rounded-full bg-[#f5f5f7] p-1">
                    <button type="button" aria-pressed={metric === 'views'} onClick={() => setMetric('views')} className={pill(metric === 'views')}>Visitas</button>
                    <button type="button" aria-pressed={metric === 'clicks'} onClick={() => setMetric('clicks')} className={pill(metric === 'clicks')}>Cliques</button>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-[auto_1fr] gap-x-3">
                  <div className="flex h-48 flex-col justify-between text-right text-[12px] text-muted tabular-nums" aria-hidden="true">
                    <span>{fmt(peak)}</span><span>{fmt(Math.round(peak / 2))}</span><span>0</span>
                  </div>
                  <div className="relative h-48">
                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
                      {[0, 1, 2].map((i) => <span key={i} className="border-t border-dashed border-line" />)}
                    </div>
                    <div className={`relative flex h-full items-end ${series.length > 45 ? 'gap-px' : 'gap-[3px]'}`} role="img"
                      aria-label={`${metric === 'views' ? 'Visitas' : 'Cliques'} por dia, ${periodLabel}. Total ${fmt(data[metric])}.`}>
                      {series.map((d) => (
                        <div key={d.day} className="group relative flex h-full flex-1 items-end">
                          <div className="w-full rounded-t-[4px] bg-accent transition-[opacity,filter] group-hover:brightness-110"
                            style={{ height: d[metric] ? `${Math.max(3, (d[metric] / peak) * 100)}%` : '2px', opacity: d[metric] ? 1 : 0.2 }} />
                          <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-[10px] bg-[#1d1d1f] px-3 py-2 text-[12px] leading-snug whitespace-nowrap text-white shadow-lg group-hover:block">
                            <span className="block font-semibold">{nice(d.day, { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                            {fmt(d.views)} visitas, {fmt(d.clicks)} cliques
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <span />
                  <div className="mt-2 flex justify-between text-[12px] text-muted">{tick.map((d, i) => <span key={i}>{nice(d.day)}</span>)}</div>
                </div>
                <details className="mt-4 text-[14px]">
                  <summary className="cursor-pointer font-medium text-muted hover:text-ink">Ver em tabela</summary>
                  <div className="mt-3 max-h-64 overflow-auto rounded-[12px] border border-line">
                    <table className="w-full text-left tabular-nums">
                      <thead className="sticky top-0 bg-white text-[13px] text-muted"><tr><th className="px-3 py-2 font-medium">Dia</th><th className="px-3 py-2 font-medium">Visitas</th><th className="px-3 py-2 font-medium">Cliques</th></tr></thead>
                      <tbody>{series.filter((d) => d.views || d.clicks).reverse().map((d) => (
                        <tr key={d.day} className="border-t border-line"><td className="px-3 py-1.5">{nice(d.day, { weekday: 'short', day: '2-digit', month: 'short' })}</td><td className="px-3 py-1.5">{fmt(d.views)}</td><td className="px-3 py-1.5">{fmt(d.clicks)}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </details>
              </section>

              <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
                <Ranked title="De onde vieram" names={SOURCE} empty="Nenhuma visita ainda." active={filters.source}
                  onPick={(k) => set({ source: k })} rows={data.bySource.map((r) => ({ key: r.source, count: r.count }))} />
                <Ranked title="O que mais clicaram" names={TARGET} empty="Nenhum clique nesse período."
                  rows={data.byTarget.map((r) => ({ key: r.target, count: r.count }))} />
              </div>

              <section className="tile p-5 sm:p-6">
                <h2 className="text-[16px] font-semibold">Horários de pico</h2>
                <p className="mt-0.5 text-[13px] text-muted">Visitas por hora do dia, no horário de Brasília.</p>
                <div className="mt-5 flex h-24 items-end gap-[3px]" role="img" aria-label="Visitas por hora do dia">
                  {hours.map((v, h) => (
                    <div key={h} className="group relative flex h-full flex-1 items-end">
                      <div className="w-full rounded-t-[4px] bg-accent" style={{ height: v ? `${Math.max(4, (v / hourPeak) * 100)}%` : '2px', opacity: v ? 0.35 + 0.65 * (v / hourPeak) : 0.15 }} />
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-[10px] bg-[#1d1d1f] px-2.5 py-1.5 text-[12px] whitespace-nowrap text-white group-hover:block">
                        {h}h: {fmt(v)} {v === 1 ? 'visita' : 'visitas'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[12px] text-muted"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
