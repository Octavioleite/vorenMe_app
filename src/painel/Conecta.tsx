import { ArrowDown, ArrowRight, CheckCircle, TrendDown, TrendUp, Info, Lightbulb, Plus, Target, Trash, WhatsappLogo, Envelope } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import type { ConnectConfig } from '../config/types'
import { api, ApiError, type Card } from './api'
import { CHANNEL_LABEL } from './ConnectEditor'
import { forSave } from './forSave'
import { Errors, Field, ask, errorText, input, primary, secondary } from './ui'

interface Summary {
  visitors: number; sectionViewers: number; actionClickers: number; whatsappIntents: number; leads: number; conversions: number
  actions: { id: string; eligible: number; clickers: number; clicks: number }[]
  services: { id: string; clickers: number; clicks: number }[]
  previous: { visitors: number; actionClickers: number; leads: number; conversions: number }
  recommendations: { ready: boolean; minVisitors: number; items: Rec[]; early: string[]; tips: string[] }
}
type Fix = { kind: 'edit' | 'primary' | 'service-first'; id?: string; label: string }
interface Rec { id: string; title: string; text: string; evidence: string; fix?: Fix }
interface Lead { id: string; action: string | null; interest: string | null; name: string; contact: string; message: string | null; createAt: string }
interface Conversion { id: string; action: string | null; leadId: string | null; note: string | null; value: string | null; occurredAt: string }

const fmt = (n: number) => n.toLocaleString('pt-BR')
const rate = (a: number, b: number) => (b ? `${(Math.round((a / b) * 1000) / 10).toLocaleString('pt-BR')}%` : '–')
const money = (v: string | null) => (v === null ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
const when = (s: string) => new Date(s).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')
/** Variação contra o período anterior (mesmo tamanho). null = sem base para comparar. */
const change = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 100) : null)
function Delta({ now, before, what = '' }: { now: number; before: number; what?: string }) {
  const d = change(now, before)
  if (d === null) return before === 0 && now > 0 ? <p className="text-[12px] font-medium text-accent">Novo neste período</p> : null
  if (d === 0) return <p className="text-[12px] text-muted">Igual ao período anterior</p>
  const up = d > 0
  const Icon = up ? TrendUp : TrendDown
  return (
    <p className={`inline-flex items-center gap-1 text-[12px] font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      <Icon size={14} weight="bold" aria-hidden="true" /> {what}{up ? 'subiu' : 'caiu'} {Math.abs(d).toLocaleString('pt-BR')}% vs. período anterior
    </p>
  )
}
const todayYmd = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

/** Bloco do Conecta em Estatísticas (/painel/estatisticas/:id), no mesmo período dos filtros de cima. */
export function Conecta({ card, range, onAuthLost }: { card: Card; range: { from: string; to: string }; onAuthLost: () => void }) {
  // Cópia local: as recomendações podem mudar a ordem das ações/serviços e salvar o cartão.
  const [config, setConfig] = useState(card.config)
  const k: ConnectConfig | undefined = config.connect
  const [applied, setApplied] = useState('')
  const [data, setData] = useState<Summary | null>(null)
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [conversions, setConversions] = useState<Conversion[] | null>(null)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<{ leadId?: string; action?: string; note?: string } | null>(null)
  const fail = (e: unknown) => (e instanceof ApiError && e.status === 401 ? onAuthLost() : setError(errorText(e)))
  const base = `/cards/${card.id}`

  /** Botão da recomendação: muda a ordem e salva o cartão (ou abre o editor no Conecta). */
  const apply = async (fix: Fix) => {
    if (fix.kind === 'edit' || !k) return void (location.href = `/painel/${card.id}/editar#conecta`)
    if (!(await ask({ title: `${fix.label}?`, text: 'O cartão no ar muda agora. Depois de alguns dias, compare o novo período com este.', confirm: 'Aplicar' }))) return
    const next = structuredClone(config)
    const list: { id: string }[] = fix.kind === 'primary' ? next.connect!.actions : (next.connect!.services ?? [])
    const i = list.findIndex((x) => x.id === fix.id)
    if (i > 0) list.unshift(...list.splice(i, 1))
    try {
      await api(`/cards/${card.id}`, 'PUT', { config: forSave(next) })
      setConfig(next)
      setApplied(fix.label)
      loadSummary()
    } catch (e) { fail(e) }
  }
  const loadSummary = () => {
    setData(null)
    api<Summary>(`${base}/conecta?${new URLSearchParams(range)}`).then(setData, fail)
  }
  useEffect(loadSummary, [card.id, range.from, range.to]) // eslint-disable-line react-hooks/exhaustive-deps
  // Setinha flutuante "VorenMe Conecta ↓": some quando o bloco aparece na tela (IntersectionObserver, sem ouvir scroll).
  const [seen, setSeen] = useState(true)
  useEffect(() => {
    const el = document.getElementById('conecta')
    if (!el) return
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting || e.boundingClientRect.top < 0), { rootMargin: '0px 0px -15% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const down = () => document.getElementById('conecta')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  // Atalho "Ver Conecta" (cartões, editor): /painel/estatisticas/:id#conecta já desce até aqui.
  useEffect(() => {
    if (location.hash !== '#conecta') return
    const t = setTimeout(() => document.getElementById('conecta')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 400) // depois dos gráficos
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    api<Lead[]>(`${base}/leads`).then(setLeads, fail)
    api<Conversion[]>(`${base}/conversions`).then(setConversions, fail)
  }, [card.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const actionLabel = (id: string | null) => (id ? k?.actions.find((a) => a.id === id)?.label ?? 'Ação removida' : '')
  const serviceName = (id: string | null) => (id ? k?.services?.find((s) => s.id === id)?.name ?? '' : '')

  const removeLead = async (l: Lead) => {
    if (!(await ask({ title: 'Excluir este contato?', text: `Os dados de ${l.name} serão apagados de vez. Conversões já registradas continuam.`, confirm: 'Excluir', danger: true }))) return
    api(`${base}/leads/${l.id}`, 'DELETE').then(() => { setLeads((ls) => ls!.filter((x) => x.id !== l.id)); loadSummary() }, fail)
  }
  const removeConversion = async (c: Conversion) => {
    if (!(await ask({ title: 'Excluir esta conversão?', text: 'Ela sai do histórico e da contagem.', confirm: 'Excluir', danger: true }))) return
    api(`${base}/conversions/${c.id}`, 'DELETE').then(() => { setConversions((cs) => cs!.filter((x) => x.id !== c.id)); loadSummary() }, fail)
  }

  const actions = data ? [...data.actions].sort((a, b) => b.clickers - a.clickers) : []
  const services = data ? [...data.services].sort((a, b) => b.clickers - a.clickers) : []
  const actionClicks = actions.reduce((n, a) => n + a.clicks, 0)

  return (
    <section id="conecta" aria-labelledby="conecta-h" className="grid scroll-mt-6 gap-3">
      {!seen && (
        <button type="button" onClick={down}
          className="press fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent py-3 pr-4 pl-5 text-sm font-semibold text-accent-fg shadow-[0_14px_34px_-12px_rgb(17_17_19/0.55)] hover:brightness-110">
          <Target size={16} weight="bold" aria-hidden="true" /> Ver VorenMe Conecta
          <ArrowDown size={16} weight="bold" className="motion-safe:animate-bounce" aria-hidden="true" />
        </button>
      )}
      <header className="mt-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="conecta-h" className="flex items-center gap-2 text-[26px] font-semibold tracking-[-0.03em]"><Target size={24} weight="bold" className="text-accent" aria-hidden="true" /> VorenMe Conecta</h2>
          <p className="text-[15px] text-muted">Quem clicou nas suas ações, os contatos que chegaram e as vendas que você registrou.</p>
        </div>
        <a href={`/painel/${card.id}/editar`} className={secondary}>{k ? 'Editar ações' : 'Ativar no editor'}</a>
      </header>

      <Errors text={error} />
      {!k && (
        <p className="tile p-5 text-[15px] text-muted">O Conecta está desligado neste cartão. Ative no editor (seção VorenMe Conecta) para escolher o objetivo, as ações do visitante e os serviços.</p>
      )}

      {!data && !error && <div className="h-[124px] animate-pulse rounded-[20px] bg-[#f2f2f4]" aria-hidden="true" />}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Visitantes únicos', value: fmt(data.visitors), hint: 'Pessoas diferentes por dia, somadas no período', delta: <Delta now={data.visitors} before={data.previous.visitors} /> },
              { label: 'Cliques nas ações', value: fmt(actionClicks), hint: `${fmt(data.actionClickers)} ${data.actionClickers === 1 ? 'pessoa clicou' : 'pessoas clicaram'} · ${fmt(data.whatsappIntents)} no WhatsApp`,
                delta: data.visitors > 0 && data.previous.visitors > 0 ? <Delta what="taxa de clique " now={data.actionClickers / data.visitors} before={data.previous.actionClickers / data.previous.visitors} /> : null },
              { label: 'Contatos capturados', value: fmt(data.leads), hint: 'Formulários enviados com autorização', delta: <Delta now={data.leads} before={data.previous.leads} /> },
              { label: 'Conversões registradas', value: fmt(data.conversions), hint: 'Vendas ou fechamentos que você anotou', delta: <Delta now={data.conversions} before={data.previous.conversions} /> },
            ].map((t) => (
              <div key={t.label} className="tile grid gap-2 p-5">
                <p className="text-[14px] font-medium">{t.label}</p>
                <p className="text-[34px] leading-none font-semibold tracking-[-0.04em] tabular-nums">{t.value}</p>
                <p className="text-[12px] text-muted">{t.hint}</p>
                {t.delta}
              </div>
            ))}
          </div>

          <section className="tile grid gap-4 p-5 sm:p-6">
            <h3 className="text-[16px] font-semibold">Desempenho por ação</h3>
            {actions.length === 0 ? (
              <p className="text-sm text-muted">{k ? 'Nenhuma visita com o Conecta ligado neste período.' : 'Sem dados.'}</p>
            ) : (
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[14px] tabular-nums">
                  <thead className="text-[13px] text-muted">
                    <tr><th className="px-2 py-2 font-medium">Ação</th><th className="px-2 py-2 font-medium">Viram</th><th className="px-2 py-2 font-medium">Clicaram</th><th className="px-2 py-2 font-medium">Taxa de clique</th><th className="px-2 py-2 font-medium">Cliques</th></tr>
                  </thead>
                  <tbody>
                    {actions.map((a) => {
                      const cfg = k?.actions.find((x) => x.id === a.id)
                      return (
                        <tr key={a.id} className="border-t border-line">
                          <td className="px-2 py-2.5">
                            <span className="font-medium">{cfg?.label ?? 'Ação removida'}</span>
                            {cfg && <span className="block text-[12px] text-muted">{CHANNEL_LABEL[cfg.channel]}{k!.actions[0].id === a.id ? ' · principal' : ''}</span>}
                          </td>
                          <td className="px-2 py-2.5">{fmt(a.eligible)}</td>
                          <td className="px-2 py-2.5">{fmt(a.clickers)}</td>
                          <td className="px-2 py-2.5 font-semibold">{rate(a.clickers, a.eligible)}</td>
                          <td className="px-2 py-2.5 text-muted">{fmt(a.clicks)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {services.length > 0 && (
              <div>
                <h4 className="text-[14px] font-semibold">Serviços mais procurados</h4>
                <ol className="mt-2 grid gap-1 text-[14px]">
                  {services.slice(0, 8).map((s) => (
                    <li key={s.id} className="flex justify-between gap-3"><span>{serviceName(s.id) || 'Serviço removido'}</span><span className="text-muted tabular-nums"><b className="font-semibold text-ink">{fmt(s.clickers)}</b> {s.clickers === 1 ? 'pessoa' : 'pessoas'}</span></li>
                  ))}
                </ol>
              </div>
            )}
            <details className="text-[13px] text-muted">
              <summary className="flex cursor-pointer items-center gap-1.5 font-medium hover:text-ink"><Info size={15} aria-hidden="true" /> Como calculamos</summary>
              <ul className="mt-2 grid list-disc gap-1 pl-5 leading-relaxed">
                <li><b className="text-ink">Visitante único:</b> a mesma pessoa conta uma vez por dia. Usamos um código anônimo, sem cookie, que muda todo dia; não dá para saber quem é. Quem volta em outro dia conta de novo.</li>
                <li><b className="text-ink">Viram:</b> visitantes únicos que abriram o cartão enquanto a ação estava nele.</li>
                <li><b className="text-ink">Taxa de clique</b> = visitantes únicos que clicaram na ação ÷ visitantes únicos que viram a ação, no período escolhido acima. Vários cliques da mesma pessoa no mesmo dia contam uma vez (a coluna Cliques mostra o total bruto).</li>
                <li className="flex gap-1"><WhatsappLogo size={14} className="mt-0.5 shrink-0" aria-hidden="true" /><span>Clique no WhatsApp é <b className="text-ink">intenção de contato</b>: não sabemos se a pessoa mandou a mensagem. Venda só conta quando você registra uma conversão.</span></li>
                <li>Contagem anônima começou com o Conecta: visitas anteriores aparecem só no total de visitas lá em cima.</li>
              </ul>
            </details>
          </section>

          <section aria-label="Recomendações" className="grid gap-2 rounded-[20px] bg-accent/8 p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold"><Lightbulb size={18} weight="fill" className="text-accent" aria-hidden="true" /> Recomendações</h3>
            {applied && <p role="status" className="flex items-center gap-1.5 text-[14px] font-medium text-emerald-700"><CheckCircle size={16} weight="fill" aria-hidden="true" /> Feito: {applied}. Já está no seu cartão.</p>}
            {!data.recommendations.ready ? (
              <>
                <p className="text-[14px] text-muted">
                  {k ? `Ainda não há dados suficientes para uma conclusão confiável: ${fmt(data.visitors)} de ${data.recommendations.minVisitors} visitantes únicos no período. Enquanto isso:` : 'Para começar:'}
                </p>
                {data.recommendations.early.length > 0 && (
                  <div className="grid gap-1 rounded-[14px] bg-surface/70 p-3.5">
                    <p className="text-[13px] font-semibold">Primeiros sinais <span className="font-normal text-muted">(ainda poucos dados, não tire conclusões)</span></p>
                    <ul className="grid list-disc gap-0.5 pl-5 text-[14px] leading-relaxed">{data.recommendations.early.map((t) => <li key={t}>{t}</li>)}</ul>
                  </div>
                )}
                <ul className="grid list-disc gap-1 pl-5 text-[15px] leading-relaxed">{data.recommendations.tips.map((t) => <li key={t}>{t}</li>)}</ul>
              </>
            ) : data.recommendations.items.length === 0 ? (
              <p className="text-[15px]">Nada fora do comum neste período. Suas ações estão recebendo cliques de forma equilibrada.</p>
            ) : (
              <ul className="grid gap-3">
                {data.recommendations.items.map((r) => (
                  <li key={r.id} className="grid gap-0.5">
                    <p className="text-[15px] font-semibold">{r.title}</p>
                    <p className="text-[14px] leading-relaxed">{r.text}</p>
                    <p className="text-[13px] text-muted">Com base em: {r.evidence}</p>
                    {r.fix && (
                      <button type="button" onClick={() => apply(r.fix!)} className={`${primary} mt-1.5 justify-self-start py-2 text-left text-[13px] whitespace-normal`}>
                        {r.fix.label} <ArrowRight size={14} weight="bold" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {data.recommendations.ready && <p className="text-[12px] text-muted">São observações dos seus números, não garantia de resultado. Ao mudar algo, compare um período com o outro.</p>}
          </section>
        </>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="tile grid content-start gap-3 p-5 sm:p-6">
          <h3 className="text-[16px] font-semibold">Contatos recebidos</h3>
          {leads === null ? <p className="text-sm text-muted">Carregando...</p> : leads.length === 0 ? (
            <p className="text-sm text-muted">{k?.actions.some((a) => a.channel === 'form') ? 'Nenhum contato ainda. Eles aparecem aqui quando alguém enviar o formulário do seu cartão.' : 'Adicione uma ação com formulário no Conecta para receber contatos aqui.'}</p>
          ) : (
            <ul className="grid gap-2">
              {leads.map((l) => {
                const isMail = l.contact.includes('@')
                const href = isMail ? `mailto:${l.contact}` : `https://wa.me/${l.contact.length <= 11 ? `55${l.contact}` : l.contact}`
                const converted = conversions?.some((c) => c.leadId === l.id)
                return (
                  <li key={l.id} className="grid gap-1.5 rounded-[14px] border border-line p-3.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="font-semibold">{l.name}</p>
                      <p className="text-[12px] text-muted">{when(l.createAt)}</p>
                    </div>
                    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 justify-self-start text-[14px] font-medium text-accent hover:underline">
                      {isMail ? <Envelope size={15} aria-hidden="true" /> : <WhatsappLogo size={15} aria-hidden="true" />} {l.contact}
                    </a>
                    {(l.action || l.interest) && <p className="text-[13px] text-muted">{[actionLabel(l.action), serviceName(l.interest)].filter(Boolean).join(' · ')}</p>}
                    {l.message && <p className="text-[14px] whitespace-pre-line">{l.message}</p>}
                    <div className="mt-1 flex flex-wrap gap-2">
                      {converted ? (
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent"><CheckCircle size={15} weight="fill" aria-hidden="true" /> Virou cliente</span>
                      ) : (
                        <button type="button" className={`${secondary} py-1.5 text-[13px]`} onClick={() => setDraft({ leadId: l.id, action: l.action ?? undefined, note: l.name })}>
                          <CheckCircle size={14} aria-hidden="true" /> Virou cliente
                        </button>
                      )}
                      <button type="button" className={`${secondary} py-1.5 text-[13px] hover:text-red-500`} onClick={() => removeLead(l)}>
                        <Trash size={14} aria-hidden="true" /> Excluir
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="text-[12px] text-muted">Use os dados só para responder a quem pediu contato. Contatos são apagados automaticamente após 12 meses.</p>
        </section>

        <section className="tile grid content-start gap-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[16px] font-semibold">Conversões registradas</h3>
            {!draft && <button type="button" className={`${secondary} py-1.5 text-[13px]`} onClick={() => setDraft({})}><Plus size={14} weight="bold" aria-hidden="true" /> Registrar</button>}
          </div>
          <p className="text-[13px] text-muted">Anote aqui quando um contato virar venda, agendamento ou contrato. É o único jeito de o painel saber disso.</p>
          {draft && (
            <ConversionForm key={draft.leadId ?? 'new'} draft={draft} k={k} onCancel={() => setDraft(null)}
              onSave={(body) => api<Conversion>(`${base}/conversions`, 'POST', body).then((c) => {
                setConversions((cs) => [c, ...(cs ?? [])].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)))
                setDraft(null)
                loadSummary()
              })} />
          )}
          {conversions === null ? <p className="text-sm text-muted">Carregando...</p> : conversions.length === 0 ? (
            !draft && <p className="text-sm text-muted">Nenhuma conversão registrada ainda.</p>
          ) : (
            <ul className="grid gap-1">
              {conversions.map((c) => (
                <li key={c.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{c.note || 'Conversão'}{c.value !== null && <span className="ml-2 font-semibold text-accent">{money(c.value)}</span>}</p>
                    <p className="text-[12px] text-muted">{when(c.occurredAt)}{c.action ? ` · ${actionLabel(c.action)}` : ''}{c.leadId ? ' · do formulário' : ''}</p>
                  </div>
                  <button type="button" className="press grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-[#f2f2f4] hover:text-red-500"
                    aria-label={`Excluir conversão ${c.note ?? ''}`} title="Excluir" onClick={() => removeConversion(c)}><Trash size={15} /></button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  )
}

function ConversionForm({ draft, k, onSave, onCancel }: {
  draft: { leadId?: string; action?: string; note?: string }; k?: ConnectConfig
  onSave: (body: object) => Promise<void>; onCancel: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    try {
      await onSave({ leadId: draft.leadId, date: f.get('date'), action: f.get('action') || undefined, note: f.get('note'), value: String(f.get('value') ?? '').replace(',', '.') || undefined })
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} noValidate className="grid gap-3 rounded-[14px] border border-line p-3.5 @container">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Data"><input type="date" name="date" required max={todayYmd()} defaultValue={todayYmd()} className={input} /></Field>
        <Field label="Valor (opcional)"><input name="value" inputMode="decimal" placeholder="R$ 0,00" className={input} /></Field>
        <Field label="Veio de qual ação? (opcional)">
          <select name="action" defaultValue={draft.action ?? ''} className={input}>
            <option value="">Não sei / outra</option>
            {k?.actions.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </Field>
        <Field label="Descrição"><input name="note" maxLength={200} defaultValue={draft.note} placeholder="Ex: Clareamento, Maria" className={input} /></Field>
      </div>
      <Errors text={error} />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primary}>{busy ? 'Salvando...' : 'Salvar conversão'}</button>
        <button type="button" onClick={onCancel} className={secondary}>Cancelar</button>
      </div>
    </form>
  )
}
