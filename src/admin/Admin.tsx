import { SignOut } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { api, ApiError, session } from '../painel/api'
import { Auth } from '../painel/Auth'
import { Errors, errorText, secondary, transition } from '../painel/ui'
import { Cards } from './Cards'
import { Site } from './Site'
import { UserDetail, Users } from './Users'

/* Formatação compartilhada com Users.tsx. */
const TZ = 'America/Sao_Paulo'
export const fmt = (n: number) => n.toLocaleString('pt-BR')
export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const ago = (iso: string | null) => {
  if (!iso) return 'nunca'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
  return d < 1 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`
}
export const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '') : '—')
export const ymd = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: TZ })

export const STATUS: Record<string, { label: string; cls: string }> = {
  pagante: { label: 'Pagante', cls: 'bg-emerald-500/12 text-emerald-700' },
  trial: { label: 'Em teste', cls: 'bg-accent/12 text-accent' },
  basico: { label: 'Vencido (básico)', cls: 'bg-amber-500/15 text-amber-700' },
  offline: { label: 'Fora do ar', cls: 'bg-red-500/12 text-red-600' },
  desativado: { label: 'Desativado', cls: 'bg-[#e8e8ec] text-muted' },
}
export const METHOD: Record<string, string> = {
  asaas: 'Asaas', pix: 'Pix', dinheiro: 'Dinheiro', transferencia: 'Transferência', cartao: 'Cartão (maquininha)', cortesia: 'Cortesia',
}
export function Badge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: 'bg-[#f2f2f4] text-muted' }
  return <span className={`inline-block shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${s.cls}`}>{s.label}</span>
}

/** Rotas: /admin · /admin/usuarios?q=&status=&page= · /admin/usuarios/:id · /admin/cartoes · /admin/site */
const route = () => {
  const p = location.pathname.replace(/\/$/, '')
  const id = p.match(/^\/admin\/usuarios\/([^/]+)$/)?.[1]
  if (id) return { view: 'user' as const, id }
  return { view: p === '/admin/usuarios' ? ('users' as const) : p === '/admin/cartoes' ? ('cards' as const) : p === '/admin/site' ? ('site' as const) : ('home' as const), id: null }
}
export const navigate = (url: string) => {
  history.pushState(null, '', url)
  dispatchEvent(new PopStateEvent('popstate'))
}

export function Admin() {
  const [user, setUser] = useState(() => session.get()?.user ?? null)
  const [r, setR] = useState(route)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    const onPop = () => transition(() => setR(route()))
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  const logout = () => { session.set(null); setUser(null); setDenied(false) }
  // 401 depois do refresh = sessão perdida; 403 = conta sem acesso de admin.
  const fail = (e: unknown, setError: (s: string) => void) =>
    e instanceof ApiError && e.status === 401 ? logout() : e instanceof ApiError && e.status === 403 ? setDenied(true) : setError(errorText(e))

  if (!user) return <Auth onDone={(s) => { session.set(s); setUser(s.user) }} />

  if (denied) return (
    <main className="mx-auto grid max-w-md gap-4 px-4 pt-24 text-center">
      <h1 className="text-[28px] font-semibold tracking-tight">Sem acesso</h1>
      <p className="text-muted">A conta {user.email} não é administradora.</p>
      <div className="flex justify-center gap-2">
        <a href="/painel" className={secondary}>Ir para o painel</a>
        <button type="button" className={secondary} onClick={logout}>Trocar de conta</button>
      </div>
    </main>
  )

  const tab = (href: string, label: string, on: boolean) => (
    <a href={href} aria-current={on ? 'page' : undefined} onClick={(e) => { e.preventDefault(); navigate(href) }}
      className={`press shrink-0 rounded-full px-4 py-1.5 text-[14px] font-medium ${on ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>{label}</a>
  )

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-6 lg:px-10">
      <header className="flex h-[72px] items-center justify-between gap-3">
        <span className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]">
          <img src="/favicon.png" alt="" width={30} height={30} className="rounded-full" />
          <span className="hidden sm:inline">VorenMe <span className="text-muted">admin</span></span>
        </span>
        <nav aria-label="Admin" className="flex min-w-0 gap-1 overflow-x-auto rounded-full bg-[#f5f5f7] p-1">
          {tab('/admin', 'Visão geral', r.view === 'home')}
          {tab('/admin/usuarios', 'Usuários', r.view === 'users' || r.view === 'user')}
          {tab('/admin/cartoes', 'Cartões', r.view === 'cards')}
          {tab('/admin/site', 'Site', r.view === 'site')}
        </nav>
        <button type="button" onClick={logout} aria-label="Sair" className="press grid size-10 place-items-center rounded-full bg-[#f2f2f4] text-muted hover:text-ink">
          <SignOut size={17} aria-hidden="true" />
        </button>
      </header>
      <div className="pt-6">
        {r.view === 'user' ? <UserDetail key={r.id} id={r.id!} me={user.id} fail={fail} />
          : r.view === 'users' ? <Users key={location.search} fail={fail} />
          : r.view === 'cards' ? <Cards key={location.search} fail={fail} />
          : r.view === 'site' ? <Site fail={fail} />
          : <Overview fail={fail} />}
      </div>
    </div>
  )
}

export type Fail = (e: unknown, setError: (s: string) => void) => void

interface OverviewData {
  users: Record<'total' | 'new30' | 'desativado' | 'pagante' | 'trial' | 'basico' | 'offline' | 'assinantes' | 'indicados' | 'sumido' | 'trialEnded', number>
  funnel: Record<'signed' | 'verified' | 'withCard' | 'withViews' | 'paid', number>
  activity: Activity[]
  idleDays: number
  conversion: number | null
  payingUsers: number
  revenueByMonth: { month: string; total: number; count: number; cancels: number }[]
  signupsByDay: { day: string; count: number }[]
  cards: number
  views30: number
  topCards: { slug: string; userId: string; views: number }[]
  recentPayments: Payment[]
}
export interface Activity { id: number; userId: string | null; actor: string; action: string; data: Record<string, unknown> | null; createAt: string }

const ACTION: Record<string, (d: Record<string, any>) => string> = {
  'subscription.cancel': (d) => `Cancelou a assinatura${d.reason ? ` (${d.reason})` : ''}`,
  'payment.add': (d) => `Lançou ${d.method === 'cortesia' ? 'cortesia' : brl(d.amount)} até ${date(d.until)}`,
  'payment.undo': (d) => `Desfez lançamento de ${brl(d.amount)}`,
  'payment.link': (d) => `Gerou link de ${brl(d.amount)} (${d.months} mês/meses)`,
  'user.active': (d) => (d.active ? 'Reativou a conta' : 'Desativou a conta'),
  'user.verify': (d) => (d.verified ? 'Marcou e-mail como confirmado' : 'Desmarcou e-mail confirmado'),
  'support.start': () => 'Entrou na conta como suporte',
  'support.end': () => 'Encerrou o acesso do suporte',
  'card.disable': (d) => `${d.disabled ? 'Tirou do ar' : 'Recolocou no ar'} /${d.slug}${d.reason ? ` (${d.reason})` : ''}`,
}
/** Linha do tempo: quem fez o quê. `showUser` liga cada linha ao usuário afetado. */
export function ActivityList({ rows, showUser }: { rows: Activity[]; showUser?: boolean }) {
  if (!rows.length) return <p className="text-sm text-muted">Nada registrado ainda.</p>
  return (
    <ul className="grid gap-2 text-[14px]">
      {rows.map((a) => (
        <li key={a.id} className="grid gap-0.5 border-t border-line pt-2 first:border-0 first:pt-0">
          <span>{ACTION[a.action]?.(a.data ?? {}) ?? a.action}
            {showUser && a.userId && <> · <a href={`/admin/usuarios/${a.userId}`} onClick={(e) => { e.preventDefault(); navigate(`/admin/usuarios/${a.userId}`) }} className="font-medium hover:underline">ver usuário</a></>}
          </span>
          <span className="text-[12px] text-muted">{a.actor === 'usuario' ? 'pelo próprio usuário' : a.actor} · {new Date(a.createAt).toLocaleString('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' })}</span>
        </li>
      ))}
    </ul>
  )
}

/** Baixa um CSV gerado pela API (vem dentro do JSON: o download leva o token como qualquer chamada). */
export async function download(kind: 'usuarios' | 'pagamentos') {
  const { filename, csv } = await api<{ filename: string; csv: string }>(`/admin/export/${kind}`)
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename })
  a.click()
  URL.revokeObjectURL(a.href)
}

export interface Payment {
  id: string; userId: string; amount: number; method: string; asaasId: string | null; until: string
  note: string | null; createdBy: string | null; refundedAt: string | null; createAt: string
  user?: { id: string; name: string | null; email: string }
}

export function Kpi({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const body = (
    <>
      <span className="text-[13px] font-medium text-muted">{label}</span>
      <span className="text-[30px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{value}</span>
      {sub && <span className="text-[13px] text-muted">{sub}</span>}
    </>
  )
  const cls = 'tile grid content-start gap-2 p-5'
  return href
    ? <a href={href} onClick={(e) => { e.preventDefault(); navigate(href) }} className={`${cls} press hover:ring-2 hover:ring-accent/20`}>{body}</a>
    : <div className={cls}>{body}</div>
}

/** Barras verticais simples (mesmo desenho do Stats do painel). */
export function Bars({ title, rows, total }: { title: string; rows: { key: string; label: string; value: number; tip: string }[]; total: string }) {
  const peak = Math.max(1, ...rows.map((r) => r.value))
  return (
    <section className="tile p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <span className="text-[13px] text-muted">{total}</span>
      </div>
      <div className="mt-5 flex h-40 items-end gap-[3px]" role="img" aria-label={`${title}. ${total}.`}>
        {rows.map((r) => (
          <div key={r.key} className="group relative flex h-full flex-1 items-end">
            <div className="w-full rounded-t-[4px] bg-accent group-hover:brightness-110"
              style={{ height: r.value ? `${Math.max(3, (r.value / peak) * 100)}%` : '2px', opacity: r.value ? 1 : 0.2 }} />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-[10px] bg-[#1d1d1f] px-3 py-2 text-[12px] whitespace-nowrap text-white shadow-lg group-hover:block">
              <span className="block font-semibold">{r.label}</span>{r.tip}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-muted">
        <span>{rows[0]?.label}</span><span>{rows.at(-1)?.label}</span>
      </div>
    </section>
  )
}

export function PaymentRows({ rows, showUser, onUndo }: { rows: Payment[]; showUser?: boolean; onUndo?: (p: Payment) => void }) {
  if (!rows.length) return <p className="text-sm text-muted">Nenhum pagamento ainda.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[14px] tabular-nums">
        <thead className="text-[12px] text-muted">
          <tr>
            <th className="py-2 pr-3 font-medium">Data</th>
            {showUser && <th className="py-2 pr-3 font-medium">Usuário</th>}
            <th className="py-2 pr-3 font-medium">Valor</th><th className="py-2 pr-3 font-medium">Forma</th>
            <th className="py-2 pr-3 font-medium">Libera até</th><th className="py-2 pr-3 font-medium">Obs.</th>
            {onUndo && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className={`border-t border-line ${p.refundedAt ? 'text-muted line-through' : ''}`}>
              <td className="py-2.5 pr-3 whitespace-nowrap">{date(p.createAt)}</td>
              {showUser && (
                <td className="max-w-[220px] truncate py-2.5 pr-3">
                  <a href={`/admin/usuarios/${p.userId}`} onClick={(e) => { e.preventDefault(); navigate(`/admin/usuarios/${p.userId}`) }} className="font-medium hover:underline">
                    {p.user?.name || p.user?.email}
                  </a>
                </td>
              )}
              <td className="py-2.5 pr-3 font-semibold whitespace-nowrap">{brl(p.amount)}</td>
              <td className="py-2.5 pr-3 whitespace-nowrap">{METHOD[p.method] ?? p.method}</td>
              <td className="py-2.5 pr-3 whitespace-nowrap">{date(p.until)}</td>
              <td className="max-w-[240px] truncate py-2.5 pr-3 text-muted" title={[p.note, p.createdBy && `por ${p.createdBy}`].filter(Boolean).join(' · ')}>
                {p.refundedAt ? 'Desfeito/estornado' : p.note || (p.createdBy ? `por ${p.createdBy}` : '')}
              </td>
              {onUndo && (
                <td className="py-2.5 text-right">
                  {!p.asaasId && !p.refundedAt && <button type="button" onClick={() => onUndo(p)} className="text-[13px] font-semibold text-red-600 hover:underline">Desfazer</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const monthLabel = (ym: string) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
export const dayLabel = (d: string) => new Date(`${d}T12:00:00-03:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')

function Overview({ fail }: { fail: Fail }) {
  const [d, setD] = useState<OverviewData | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<OverviewData>('/admin/overview').then(setD, (e) => fail(e, setError)) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <Errors text={error} />
  if (!d) return <p className="text-sm text-muted">Carregando...</p>

  const u = d.users
  const [prev, cur] = d.revenueByMonth.slice(-2)
  const signups = d.signupsByDay.reduce((a, x) => a + x.count, 0)
  const list = (status: string) => `/admin/usuarios?status=${status}`
  const cancels30 = cur.cancels
  const f = d.funnel
  const steps = [['Cadastrou', f.signed], ['Confirmou o e-mail', f.verified], ['Criou cartão', f.withCard], ['Cartão recebeu visita', f.withViews], ['Pagou', f.paid]] as const
  const exp = (kind: 'usuarios' | 'pagamentos') => download(kind).catch((e) => fail(e, setError))
  return (
    <div className="rise grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[40px] leading-[1.05] font-semibold tracking-[-0.045em]">Visão geral</h1>
        <div className="flex gap-2">
          <button type="button" className={secondary} onClick={() => exp('usuarios')}>Exportar usuários (CSV)</button>
          <button type="button" className={secondary} onClick={() => exp('pagamentos')}>Exportar pagamentos (CSV)</button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores">
        <Kpi label="Receita no mês" value={brl(cur.total)} sub={`Mês passado: ${brl(prev.total)}`} />
        <Kpi label="Usuários" value={fmt(u.total)} sub={`+${fmt(u.new30)} nos últimos 30 dias`} href="/admin/usuarios" />
        <Kpi label="Conversão do teste" value={d.conversion === null ? '—' : `${Math.round(d.conversion * 100)}%`} sub={`${fmt(d.payingUsers)} já pagaram de ${fmt(u.trialEnded)} com teste encerrado`} />
        <Kpi label="Assinaturas Asaas" value={fmt(u.assinantes)} sub={`${fmt(u.indicados)} vieram por indicação`} href={list('assinante')} />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Usuários por status">
        <Kpi label="Pagantes" value={fmt(u.pagante)} href={list('pagante')} />
        <Kpi label="Em teste" value={fmt(u.trial)} href={list('trial')} />
        <Kpi label="Vencidos (básico)" value={fmt(u.basico)} href={list('basico')} />
        <Kpi label="Fora do ar" value={fmt(u.offline)} href={list('offline')} />
        <Kpi label="Desativados" value={fmt(u.desativado)} href={list('desativado')} />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3" aria-label="Retenção">
        <Kpi label="Cancelamentos no mês" value={fmt(cancels30)} sub={`Mês passado: ${fmt(prev.cancels)} · taxa ${u.assinantes + cancels30 ? Math.round((cancels30 / (u.assinantes + cancels30)) * 100) : 0}% das assinaturas`} />
        <Kpi label={`Pagantes sumidos (${d.idleDays}+ dias)`} value={fmt(u.sumido)} sub="Pagam mas não entram no painel: risco de cancelar" href={list('sumido')} />
        <Kpi label="Faturas em atraso" value="Ver lista" sub="Direto do Asaas, com o link para cobrar" href="#atraso" />
      </section>

      <section className="tile grid gap-4 p-5 sm:p-6" aria-label="Funil de ativação">
        <div>
          <h2 className="text-[16px] font-semibold">Funil de ativação</h2>
          <p className="text-[13px] text-muted">Todos os cadastros. Cada etapa mostra quantos chegaram até ela e quantos se perderam na anterior.</p>
        </div>
        <ol className="grid gap-2">
          {steps.map(([label, n], i) => {
            const before = i ? steps[i - 1][1] : n
            return (
              <li key={label} className="grid gap-1">
                <span className="flex justify-between gap-3 text-[14px]">
                  <span className="font-medium">{label}</span>
                  <span className="text-muted tabular-nums"><span className="font-semibold text-ink">{fmt(n)}</span> · {f.signed ? Math.round((n / f.signed) * 100) : 0}%{i > 0 && before > n && <span className="text-red-600"> · −{fmt(before - n)}</span>}</span>
                </span>
                <span className="block h-2 rounded-full bg-accent/80" style={{ width: `${Math.max(2, f.signed ? (n / f.signed) * 100 : 0)}%` }} />
              </li>
            )
          })}
        </ol>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <Bars title="Receita por mês" total={`${brl(d.revenueByMonth.reduce((a, x) => a + x.total, 0))} em 12 meses`}
          rows={d.revenueByMonth.map((m) => ({ key: m.month, label: monthLabel(m.month), value: m.total, tip: `${brl(m.total)} · ${m.count} pagamento(s) · ${m.cancels} cancelamento(s)` }))} />
        <Bars title="Cadastros por dia" total={`${fmt(signups)} em 30 dias`}
          rows={d.signupsByDay.map((x) => ({ key: x.day, label: dayLabel(x.day), value: x.count, tip: `${x.count} cadastro(s)` }))} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <section className="tile grid content-start gap-3 p-5 sm:p-6">
          <h2 className="text-[16px] font-semibold">Últimos pagamentos</h2>
          <PaymentRows rows={d.recentPayments} showUser />
        </section>
        <section className="tile grid content-start gap-3 p-5 sm:p-6">
          <div>
            <h2 className="text-[16px] font-semibold">Cartões mais vistos</h2>
            <p className="text-[13px] text-muted">{fmt(d.cards)} cartões · {fmt(d.views30)} visitas em 30 dias</p>
          </div>
          {d.topCards.length === 0 ? <p className="text-sm text-muted">Sem visitas no período.</p> : (
            <ol className="grid gap-1">
              {d.topCards.map((c) => (
                <li key={c.slug} className="flex justify-between gap-3 text-[14px]">
                  <a href={`/admin/usuarios/${c.userId}`} onClick={(e) => { e.preventDefault(); navigate(`/admin/usuarios/${c.userId}`) }} className="truncate font-medium hover:underline">/{c.slug}</a>
                  <span className="text-muted tabular-nums">{fmt(c.views)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Overdue fail={fail} />
        <section className="tile grid content-start gap-3 p-5 sm:p-6">
          <h2 className="text-[16px] font-semibold">Ações recentes do admin</h2>
          <ActivityList rows={d.activity} showUser />
        </section>
      </div>
    </div>
  )
}

interface OverdueData { configured: boolean; invoices: { id: string; value: number; dueDate: string; invoiceUrl: string; description: string | null; user: { id: string; name: string | null; email: string } | null }[] }

/** Faturas vencidas no Asaas. Carrega à parte: se o Asaas estiver fora, o resto da visão geral não quebra. */
function Overdue({ fail }: { fail: Fail }) {
  const [d, setD] = useState<OverdueData | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<OverdueData>('/admin/overdue').then(setD, (e) => fail(e, setError)) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section id="atraso" className="tile grid scroll-mt-6 content-start gap-3 p-5 sm:p-6">
      <h2 className="text-[16px] font-semibold">Faturas em atraso</h2>
      <Errors text={error} />
      {!d ? !error && <p className="text-sm text-muted">Consultando o Asaas...</p>
        : !d.configured ? <p className="text-sm text-muted">Asaas não configurado nesta API.</p>
        : d.invoices.length === 0 ? <p className="text-sm text-muted">Nenhuma fatura em atraso.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] tabular-nums">
            <thead className="text-[12px] text-muted"><tr><th className="py-2 pr-3 font-medium">Venceu</th><th className="py-2 pr-3 font-medium">Usuário</th><th className="py-2 pr-3 font-medium">Valor</th><th /></tr></thead>
            <tbody>
              {d.invoices.map((i) => (
                <tr key={i.id} className="border-t border-line">
                  <td className="py-2.5 pr-3 whitespace-nowrap">{date(`${i.dueDate}T12:00:00-03:00`)}</td>
                  <td className="max-w-[240px] truncate py-2.5 pr-3">
                    {i.user ? <a href={`/admin/usuarios/${i.user.id}`} onClick={(e) => { e.preventDefault(); navigate(`/admin/usuarios/${i.user!.id}`) }} className="font-medium hover:underline">{i.user.name || i.user.email}</a>
                      : <span className="text-muted">Cliente fora do VorenMe</span>}
                  </td>
                  <td className="py-2.5 pr-3 font-semibold whitespace-nowrap">{brl(i.value)}</td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <a href={i.invoiceUrl} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-accent hover:underline">Abrir fatura</a>
                    {i.user && <> · <a target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-accent hover:underline"
                      href={`https://wa.me/?text=${encodeURIComponent(`Olá! Sua fatura do VorenMe de ${brl(i.value)} está em aberto. Para pagar: ${i.invoiceUrl}`)}`}>WhatsApp</a></>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
