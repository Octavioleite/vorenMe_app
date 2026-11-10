import { ArrowLeft, Check, MagnifyingGlass, WarningCircle, WhatsappLogo } from '@phosphor-icons/react'
import { useCopy } from '../lib/share'
import { lazy, Suspense, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { api } from '../painel/api'
import { Errors, Field, ask, input, primary, secondary } from '../painel/ui'
import { ActivityList, Badge, METHOD, PaymentRows, STATUS, ago, date, fmt, navigate, ymd, type Activity, type Fail, type Payment } from './Admin'
import { toggleCard } from './Cards'
import type { Origin } from '../lib/track'

/** "instagram · ads · black-friday": de onde a pessoa veio ao se cadastrar. */
export const originText = (o: Origin | null) => (o ? [o.source, o.medium, o.campaign].filter(Boolean).join(' · ') : '—')

interface Row {
  id: string; name: string | null; email: string; createAt: string; active: boolean; emailVerified: boolean
  paidUntil: string | null; activeUntil: string; offlineAt: string; status: string; subscribed: boolean; lastSeenAt: string | null
  origin: Origin | null
}
interface Detail extends Row {
  asaasCustomerId: string | null; asaasSubscriptionId: string | null; freeMonths: number; referrals: number
  referrer: { id: string; name: string | null; email: string } | null
  cards: { id: string; slug: string; template: string; createAt: string; views30: number; disabledAt: string | null; disabledReason: string | null }[]
  activity: Activity[]
  notes: { id: number; text: string; by: string; createAt: string }[]
  payments: Payment[]
  emails: { key: string; createAt: string }[]
}

const link = (href: string) => ({ href, onClick: (e: { preventDefault: () => void }) => { e.preventDefault(); navigate(href) } })

/** /admin/usuarios — busca e filtro ficam na URL. */
export function Users({ fail }: { fail: Fail }) {
  const q = new URLSearchParams(location.search)
  const [term, setTerm] = useState(q.get('q') ?? '')
  const [data, setData] = useState<{ users: (Row & { cards: number })[]; total: number; page: number; pageSize: number } | null>(null)
  const [error, setError] = useState('')
  const status = q.get('status') ?? ''

  useEffect(() => { api<NonNullable<typeof data>>(`/admin/users?${q}`).then(setData, (e) => fail(e, setError)) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (patch: Record<string, string>) => {
    const next = new URLSearchParams(location.search)
    for (const [k, v] of Object.entries({ page: '', ...patch })) v ? next.set(k, v) : next.delete(k)
    navigate(`/admin/usuarios${next.size ? `?${next}` : ''}`)
  }
  const search = (e: FormEvent) => { e.preventDefault(); go({ q: term.trim() }) }
  const pill = (on: boolean) => `press shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-medium ${on ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="rise grid gap-5">
      <h1 className="text-[40px] leading-[1.05] font-semibold tracking-[-0.045em]">Usuários</h1>
      <form onSubmit={search} className="flex gap-2">
        <input type="search" className={`${input} max-w-md`} placeholder="Nome, e-mail ou link do cartão" aria-label="Buscar usuário"
          value={term} onChange={(e) => setTerm(e.target.value)} />
        <button type="submit" className={secondary} aria-label="Buscar"><MagnifyingGlass size={16} aria-hidden="true" /></button>
      </form>
      <div role="group" aria-label="Status" className="flex max-w-full gap-1 justify-self-start overflow-x-auto rounded-full bg-[#f5f5f7] p-1 [scrollbar-width:none]">
        <button type="button" aria-pressed={!status} className={pill(!status)} onClick={() => go({ status: '' })}>Todos</button>
        {[...Object.entries(STATUS).map(([k, v]) => [k, v.label]), ['assinante', 'Assinatura Asaas'], ['sumido', 'Pagantes sumidos']].map(([k, label]) => (
          <button key={k} type="button" aria-pressed={status === k} className={pill(status === k)} onClick={() => go({ status: k })}>{label}</button>
        ))}
      </div>

      <Errors text={error} />
      {!data ? !error && <p className="text-sm text-muted">Carregando...</p> : (
        <section className="tile overflow-x-auto p-2 sm:p-3">
          <p className="px-3 pt-2 pb-1 text-[13px] text-muted">{fmt(data.total)} usuário(s)</p>
          {data.users.length === 0 ? <p className="p-3 text-sm text-muted">Ninguém encontrado.</p> : (
            <table className="w-full text-left text-[14px]">
              <thead className="text-[12px] text-muted">
                <tr><th className="px-3 py-2 font-medium">Usuário</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Válido até</th><th className="px-3 py-2 font-medium">Último acesso</th><th className="px-3 py-2 font-medium">Cartões</th><th className="px-3 py-2 font-medium">Origem</th><th className="px-3 py-2 font-medium">Cadastro</th></tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="border-t border-line hover:bg-[#f9f9fb]">
                    <td className="max-w-[320px] px-3 py-2.5">
                      <a {...link(`/admin/usuarios/${u.id}`)} className="block truncate font-medium hover:underline">{u.name || u.email}</a>
                      {u.name && <span className="block truncate text-[13px] text-muted">{u.email}</span>}
                    </td>
                    <td className="px-3 py-2.5"><Badge status={u.status} />{u.subscribed && <span className="ml-1.5 text-[12px] text-muted">Asaas</span>}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{date(u.activeUntil)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted">{ago(u.lastSeenAt)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{u.cards}</td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 text-muted" title={originText(u.origin)}>{originText(u.origin)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted">{date(u.createAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 p-3 text-[13px]">
              <button type="button" className={secondary} disabled={data.page <= 1} onClick={() => go({ ...Object.fromEntries(q), page: String(data.page - 1) })}>Anterior</button>
              <span className="text-muted">{data.page} de {pages}</span>
              <button type="button" className={secondary} disabled={data.page >= pages} onClick={() => go({ ...Object.fromEntries(q), page: String(data.page + 1) })}>Próxima</button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

const Stats = lazy(() => import('../painel/Stats').then((m) => ({ default: m.Stats })))

const PRICE = 9.99 // mesmo valor de PRICE em vorenMe_api/src/service/billing.service.js
const plus = (base: string, { months = 0, days = 0 }) => {
  const d = new Date(Math.max(Date.now(), new Date(base).getTime()))
  d.setMonth(d.getMonth() + months)
  d.setDate(d.getDate() + days)
  return ymd(d)
}

/** /admin/usuarios/:id */
export function UserDetail({ id, me, fail }: { id: string; me: string; fail: Fail }) {
  const [u, setU] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ amount: String(PRICE), method: 'pix', until: '', note: '' })
  const [formError, setFormError] = useState('')
  const [cardId, setCardId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')

  const load = () => api<Detail>(`/admin/users/${id}`).then((d) => {
    setU(d)
    setForm((f) => ({ ...f, until: f.until || plus(d.activeUntil, { months: 1 }) }))
  }, (e) => fail(e, setError))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<unknown>, onError = setError) => {
    setBusy(true)
    onError('')
    try { await fn(); await load(); return true } catch (e) { fail(e, onError); return false } finally { setBusy(false) }
  }

  if (!u) return error ? <Errors text={error} /> : <p className="text-sm text-muted">Carregando...</p>

  const courtesy = form.method === 'cortesia'
  const shortcut = (label: string, p: { months?: number; days?: number }) => (
    <button key={label} type="button" className="press rounded-full border border-line px-3 py-1.5 text-[13px] font-medium hover:bg-[#f5f5f7]"
      onClick={() => setForm((f) => ({ ...f, until: plus(u.activeUntil, p), ...(!courtesy && p.months && { amount: (PRICE * p.months).toFixed(2) }) }))}>{label}</button>
  )
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const amount = courtesy ? 0 : Number(form.amount.replace(',', '.'))
    run(() => api(`/admin/users/${u.id}/payments`, 'POST', { ...form, amount }), setFormError)
      .then((ok) => ok && setForm((f) => ({ ...f, note: '' })))
  }
  const undo = async (p: Payment) => {
    if (await ask({ title: 'Desfazer lançamento?', text: `${METHOD[p.method]} de ${p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Se ele for o último, o acesso volta para a data anterior.`, confirm: 'Desfazer', danger: true }))
      run(() => api(`/admin/payments/${p.id}`, 'DELETE'))
  }
  const toggleActive = async () => {
    const off = u.active
    if (await ask(off
      ? { title: 'Desativar conta?', text: 'A pessoa não consegue mais entrar e os cartões saem do ar na hora. Dá para reativar depois.', confirm: 'Desativar', danger: true }
      : { title: 'Reativar conta?', text: 'Login e cartões voltam a funcionar (respeitando a data de validade).', confirm: 'Reativar' }))
      run(() => api(`/admin/users/${u.id}/active`, 'PUT', { active: !off }))
  }
  // Abre a aba antes do await: navegador não bloqueia como pop-up.
  const support = async () => {
    if (!(await ask({ title: `Acessar a conta de ${u.email}?`, text: 'Abre o painel dessa pessoa numa aba nova por até 1 hora. Ela vê um aviso de que o suporte está na conta e pode encerrar. Senha, exclusão da conta e assinatura ficam bloqueadas.', confirm: 'Acessar como suporte' }))) return
    const tab = window.open('about:blank', '_blank')
    run(async () => {
      try {
        const s = await api<object>(`/admin/users/${u.id}/support`, 'POST')
        if (tab) tab.location.href = `/painel#suporte=${encodeURIComponent(JSON.stringify(s))}`
      } catch (e) { tab?.close(); throw e }
    })
  }
  const cancelSub = async () => {
    if (await ask({ title: 'Cancelar assinatura no Asaas?', text: 'As próximas faturas deixam de ser geradas. O acesso já pago continua valendo. A pessoa não recebe e-mail.', confirm: 'Cancelar assinatura', danger: true }))
      run(() => api(`/admin/users/${u.id}/cancel-subscription`, 'POST'))
  }

  const toggleVerified = async () => {
    if (await ask(u.emailVerified
      ? { title: 'Desmarcar e-mail confirmado?', text: 'A pessoa volta a ver o aviso para confirmar o e-mail.', confirm: 'Desmarcar', danger: true }
      : { title: 'Marcar e-mail como confirmado?', text: `Use quando tiver certeza de que ${u.email} é da pessoa.`, confirm: 'Confirmar e-mail' }))
      run(() => api(`/admin/users/${u.id}/email-verified`, 'PUT', { verified: !u.emailVerified }))
  }

  const paid = u.payments.filter((p) => !p.refundedAt && p.amount > 0)
  const days = Math.floor((Date.now() - new Date(u.createAt).getTime()) / 864e5)
  const facts: [string, ReactNode][] = [
    ['Total pago', `${paid.reduce((a, p) => a + p.amount, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em ${paid.length} pagamento(s)`],
    ['Cliente há', `${days} dia(s)`],
    ['Último acesso', u.lastSeenAt ? `${ago(u.lastSeenAt)} (${date(u.lastSeenAt)})` : 'nunca registrado'],
    ['Visitas em 30 dias', `${fmt(u.cards.reduce((a, c) => a + c.views30, 0))} em ${u.cards.length} cartão(ões)`],
    ['Cadastro', date(u.createAt)],
    ['Origem', u.origin ? `${originText(u.origin)}${u.origin.content ? ` · anúncio ${u.origin.content}` : ''}${u.origin.ref ? ` (via ${u.origin.ref})` : ''} · entrou por ${u.origin.page}` : 'desconhecida (antes do rastreio)'],
    ['Válido até', date(u.activeUntil)],
    ['Sai do ar em', date(u.offlineAt)],
    ['E-mail confirmado', <span className="flex items-center gap-2">{u.emailVerified ? 'Sim' : 'Não'}
      <button type="button" disabled={busy} onClick={toggleVerified} className="text-[13px] font-semibold text-accent hover:underline">{u.emailVerified ? 'desmarcar' : 'marcar como confirmado'}</button></span>],
    ['Assinatura Asaas', u.asaasSubscriptionId ?? 'Não'],
    ['Cliente Asaas', u.asaasCustomerId ?? '—'],
    ['Indicado por', u.referrer ? <a {...link(`/admin/usuarios/${u.referrer.id}`)} className="font-medium hover:underline">{u.referrer.name || u.referrer.email}</a> : '—'],
    ['Indicações', `${u.referrals} · ${u.freeMonths} mês(es) grátis a usar`],
  ]

  return (
    <div className="rise grid gap-6">
      <a {...link('/admin/usuarios')} className="press inline-flex items-center gap-1.5 justify-self-start text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={15} aria-hidden="true" /> Usuários
      </a>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[34px] leading-[1.05] font-semibold tracking-[-0.04em]">{u.name || u.email}</h1>
            <Badge status={u.status} />
          </div>
          <p className="text-muted">{u.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {u.active && <button type="button" className={primary} disabled={busy} onClick={support}>Acessar como suporte</button>}
          {u.subscribed && <button type="button" className={secondary} disabled={busy} onClick={cancelSub}>Cancelar assinatura Asaas</button>}
          {u.id !== me && (
            <button type="button" disabled={busy} onClick={toggleActive}
              className={u.active ? `${secondary} text-red-600` : primary}>{u.active ? 'Desativar conta' : 'Reativar conta'}</button>
          )}
        </div>
      </header>
      <Errors text={error} />

      <dl className="tile grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        {facts.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[12px] font-medium text-muted">{k}</dt>
            <dd className="mt-0.5 truncate text-[15px] tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <form onSubmit={submit} className="tile grid content-start gap-4 p-5 sm:p-6">
          <div>
            <h2 className="text-[16px] font-semibold">Registrar pagamento</h2>
            <p className="text-[13px] text-muted">Pagou direto para você, ou cortesia (dias/meses grátis, sem entrar na receita).</p>
          </div>
          {u.subscribed && (
            <p className="flex items-start gap-2 rounded-[12px] bg-amber-500/12 px-3.5 py-2.5 text-[13px] text-amber-800">
              <WarningCircle size={17} weight="bold" className="mt-px shrink-0" aria-hidden="true" />
              Tem assinatura ativa no Asaas: as faturas continuam sendo geradas. Se a pessoa passou a pagar por fora, cancele a assinatura.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Forma">
              <select className={input} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {Object.entries(METHOD).filter(([k]) => k !== 'asaas').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Valor (R$)">
              <input className={input} inputMode="decimal" required={!courtesy} disabled={courtesy}
                value={courtesy ? '0' : form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
          </div>
          <Field label="Acesso liberado até" hint={`Hoje vale até ${date(u.activeUntil)}. Os atalhos somam a partir daí.`}>
            <input type="date" className={input} required min={ymd(new Date(Date.now() + 864e5))} value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {shortcut('+7 dias', { days: 7 })}{shortcut('+1 mês', { months: 1 })}{shortcut('+3 meses', { months: 3 })}{shortcut('+12 meses', { months: 12 })}
          </div>
          <Field label="Observação">
            <input className={input} maxLength={200} placeholder="Ex.: Pix recebido no dia 10" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <Errors text={formError} />
          <button type="submit" className={`${primary} justify-self-start`} disabled={busy}>{courtesy ? 'Dar cortesia' : 'Registrar pagamento'}</button>
        </form>

        <section className="tile grid content-start gap-3 p-5 sm:p-6">
          <h2 className="text-[16px] font-semibold">Pagamentos</h2>
          <PaymentRows rows={u.payments} onUndo={undo} />
        </section>
      </div>

      <PaymentLink user={u} fail={fail} />

      {u.cards.length > 0 && (
        <section className="grid gap-4" aria-label="Estatísticas dos cartões">
          <div role="group" aria-label="Cartão" className="flex max-w-full gap-1 justify-self-start overflow-x-auto rounded-full bg-[#f5f5f7] p-1 [scrollbar-width:none]">
            {u.cards.map((c) => {
              const on = (cardId ?? u.cards[0].id) === c.id
              return <button key={c.id} type="button" aria-pressed={on} onClick={() => setCardId(c.id)}
                className={`press shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-medium ${on ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>/{c.slug}</button>
            })}
          </div>
          <Suspense fallback={<p className="text-sm text-muted">Carregando estatísticas...</p>}>
            <Stats key={cardId ?? u.cards[0].id} cardId={cardId ?? u.cards[0].id} admin onAuthLost={() => fail(new Error(), setError)} />
          </Suspense>
        </section>
      )}

      <section className="tile grid content-start gap-3 p-5 sm:p-6">
        <div>
          <h2 className="text-[16px] font-semibold">Anotações internas</h2>
          <p className="text-[13px] text-muted">Só a equipe vê. Ex.: "pediu reembolso", "prefere WhatsApp", "combinou pagar dia 10".</p>
        </div>
        <form className="grid gap-2" onSubmit={(e) => {
          e.preventDefault()
          run(() => api(`/admin/users/${u.id}/notes`, 'POST', { text: note }), setNoteError).then((ok) => ok && setNote(''))
        }}>
          <textarea className={`${input} min-h-20`} maxLength={2000} required aria-label="Nova anotação" placeholder="Escreva uma anotação..."
            value={note} onChange={(e) => setNote(e.target.value)} />
          <Errors text={noteError} />
          <button type="submit" className={`${secondary} justify-self-start`} disabled={busy || !note.trim()}>Salvar anotação</button>
        </form>
        {u.notes.length > 0 && (
          <ul className="grid gap-3">
            {u.notes.map((n) => (
              <li key={n.id} className="grid gap-1 rounded-[12px] bg-[#f5f5f7] p-3.5">
                <p className="text-[14px] whitespace-pre-wrap">{n.text}</p>
                <span className="flex flex-wrap justify-between gap-2 text-[12px] text-muted">
                  <span>{n.by} · {new Date(n.createAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <button type="button" disabled={busy} className="font-semibold text-red-600 hover:underline"
                    onClick={async () => { if (await ask({ title: 'Apagar anotação?', text: n.text.slice(0, 140), confirm: 'Apagar', danger: true })) run(() => api(`/admin/notes/${n.id}`, 'DELETE')) }}>Apagar</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tile grid content-start gap-3 p-5 sm:p-6">
        <h2 className="text-[16px] font-semibold">Histórico da conta</h2>
        <p className="-mt-2 text-[13px] text-muted">Ações do admin e cancelamentos, do mais recente ao mais antigo.</p>
        <ActivityList rows={u.activity} />
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="tile grid content-start gap-3 p-5 sm:p-6">
          <h2 className="text-[16px] font-semibold">Cartões</h2>
          {u.cards.length === 0 ? <p className="text-sm text-muted">Nenhum cartão.</p> : (
            <ul className="grid gap-1">
              {u.cards.map((c) => (
                <li key={c.id} className="grid gap-0.5 text-[14px]">
                  <span className="flex justify-between gap-3">
                    <a href={`/${c.slug}`} target="_blank" rel="noreferrer" className="truncate font-medium hover:underline">/{c.slug} <span className="font-normal text-muted">· {c.template}</span></a>
                    <span className="shrink-0 text-muted tabular-nums">{fmt(c.views30)} visitas/30d</span>
                  </span>
                  <span className="flex flex-wrap gap-2 text-[13px]">
                    {c.disabledAt && <span className="font-medium text-red-600">Fora do ar (moderação){c.disabledReason && `: ${c.disabledReason}`}</span>}
                    <button type="button" disabled={busy} onClick={() => run(() => toggleCard(c))} className={`font-semibold hover:underline ${c.disabledAt ? 'text-accent' : 'text-red-600'}`}>
                      {c.disabledAt ? 'Recolocar no ar' : 'Tirar do ar'}</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="tile grid content-start gap-3 p-5 sm:p-6">
          <h2 className="text-[16px] font-semibold">Últimos e-mails enviados</h2>
          {u.emails.length === 0 ? <p className="text-sm text-muted">Nenhum lembrete registrado.</p> : (
            <ul className="grid gap-1 text-[14px]">
              {u.emails.map((m) => <li key={m.key} className="flex justify-between gap-3"><span className="truncate font-mono text-[13px]">{m.key}</span><span className="shrink-0 text-muted">{date(m.createAt)}</span></li>)}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

/** Gera uma cobrança avulsa no Asaas e mostra o link para mandar ao cliente. Pago, o webhook libera os meses. */
function PaymentLink({ user, fail }: { user: Detail; fail: Fail }) {
  const [months, setMonths] = useState(1)
  const [amount, setAmount] = useState('')
  const [doc, setDoc] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState<{ invoiceUrl: string; value: number; dueDate: string } | null>(null)
  const { copy, copied } = useCopy()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setLink(await api('/admin/users/' + user.id + '/payment-link', 'POST', { months, amount: amount.replace(',', '.') || undefined, cpfCnpj: doc }))
    } catch (err) { fail(err, setError) } finally { setBusy(false) }
  }
  const msg = link && `Olá! Segue o link para pagamento do VorenMe (${link.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}): ${link.invoiceUrl}`

  return (
    <form onSubmit={submit} className="tile grid content-start gap-4 p-5 sm:p-6">
      <div>
        <h2 className="text-[16px] font-semibold">Link de pagamento</h2>
        <p className="text-[13px] text-muted">Cobrança avulsa no Asaas (Pix, boleto ou cartão). Quando o cliente pagar, o acesso é liberado sozinho pelos meses escolhidos.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Meses">
          <select className={input} value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m} {m === 1 ? 'mês' : 'meses'}</option>)}
          </select>
        </Field>
        <Field label="Valor (R$, opcional)" hint="Vazio = preço normal.">
          <input className={input} inputMode="decimal" placeholder={(PRICE * months).toFixed(2).replace('.', ',')} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        {!user.asaasCustomerId && (
          <Field label="CPF ou CNPJ" hint="O Asaas exige para criar o cliente.">
            <input className={input} inputMode="numeric" required value={doc} onChange={(e) => setDoc(e.target.value)} />
          </Field>
        )}
      </div>
      <Errors text={error} />
      <button type="submit" className={`${primary} justify-self-start`} disabled={busy}>{busy ? 'Gerando...' : 'Gerar link'}</button>
      {link && msg && (
        <div className="grid gap-2 rounded-[12px] bg-accent/8 p-3 sm:flex sm:items-center">
          <input readOnly aria-label="Link de pagamento" className={`${input} min-w-0 flex-1 bg-white font-mono text-[13px]`} value={link.invoiceUrl} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className={secondary} onClick={() => copy(link.invoiceUrl)}>{copied ? <><Check size={15} weight="bold" aria-hidden="true" /> Copiado</> : 'Copiar'}</button>
          <a className={secondary} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(msg)}`}><WhatsappLogo size={16} aria-hidden="true" /> WhatsApp</a>
          <span className="text-[12px] text-muted sm:ml-1">Vence {date(`${link.dueDate}T12:00:00-03:00`)}</span>
        </div>
      )}
    </form>
  )
}
