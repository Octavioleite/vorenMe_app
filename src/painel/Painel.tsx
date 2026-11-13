import { CaretDown, SignOut, WarningCircle } from '@phosphor-icons/react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { api, ApiError, session, supportTab, type Card } from './api'
import { SupportBanner, SupportEnded } from './SupportBanner'
import { Auth } from './Auth'
import { Billing } from './Billing'
import { Profile } from './Profile'
import { CardPicker } from './CardPicker'
import { VerifyBanner, VerifyLink } from './VerifyEmail'
import { SupportButton } from './Support'

// Só quem já entrou paga por Cards/Editor: o login carrega sozinho.
const Cards = lazy(() => import('./Cards').then((m) => ({ default: m.Cards })))
const Editor = lazy(() => import('./Editor').then((m) => ({ default: m.Editor })))
const Stats = lazy(() => import('./Stats').then((m) => ({ default: m.Stats })))
const PrintKit = lazy(() => import('./PrintKit').then((m) => ({ default: m.PrintKit })))
import { Errors, errorText, transition, primary } from './ui'

/** Rotas: /painel (cartões) · /painel/estatisticas[/:id] · /painel/imprimir[/:id] · /painel/assinatura · /painel/perfil · /painel/:id/editar.
 *  Recarregar mantém onde a pessoa estava. */
const idFromUrl = () => location.pathname.match(/^\/painel\/([^/]+)\/editar\/?$/)?.[1] ?? null
const go = (id: string | null) => history.pushState(null, '', id ? `/painel/${encodeURIComponent(id)}/editar` : '/painel')

const TABS = [
  { path: '/painel', label: 'Cartões' },
  { path: '/painel/estatisticas', label: 'Estatísticas' },
  { path: '/painel/imprimir', label: 'Imprimir' },
  { path: '/painel/assinatura', label: 'Assinatura' },
  { path: '/painel/perfil', label: 'Perfil' },
] as const
type Tab = (typeof TABS)[number]['path']
// Hick: só as 3 tarefas do dia a dia ficam na barra. Jakob: conta e assinatura moram no menu do avatar, como em qualquer app.
const MAIN = TABS.slice(0, 3)
const ACCOUNT = TABS.slice(3)
const path = () => location.pathname.replace(/\/$/, '')
const tabFromUrl = (): Tab => TABS.find((t) => t.path !== '/painel' && (path() === t.path || path().startsWith(`${t.path}/`)))?.path ?? '/painel'
/** Cartão escolhido em Estatísticas/Imprimir: /painel/imprimir/<id>. */
const subFromUrl = () => path().match(/^\/painel\/(?:estatisticas|imprimir)\/([^/]+)$/)?.[1] ?? null

export function Painel() {
  const [user, setUser] = useState(() => session.get()?.user ?? null)
  const [editingId, setEditingId] = useState(idFromUrl)
  const [editing, setEditing] = useState<Card | null>(null)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState(tabFromUrl)
  const [sub, setSub] = useState(subFromUrl)
  const goTab = (t: Tab, id: string | null = null) => {
    history.pushState(null, '', id ? `${t}/${encodeURIComponent(id)}` : t)
    transition(() => { setTab(t); setSub(id) })
  }

  const logout = () => {
    session.set(null)
    transition(() => { setUser(null); open(null) }, 'page')
  }
  const [fresh, setFresh] = useState(false) // acabou de criar: editor em etapas
  const [focus, setFocus] = useState<string>() // seção do editor para abrir (atalho vindo de Cartões)
  const open = (card: Card | null, isNew = false, section?: string) => {
    go(card ? String(card.id) : null)
    setFresh(isNew)
    setFocus(section)
    setEditing(card)
    setEditingId(card ? String(card.id) : null)
    if (!card) setTab('/painel')
  }

  // Voltar/avançar do navegador.
  useEffect(() => {
    const onPop = () => { setFresh(false); setEditingId(idFromUrl()); setEditing(null); setTab(tabFromUrl()); setSub(subFromUrl()) }
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  // Entrou direto por /painel/:id/editar (ou recarregou): busca o cartão.
  useEffect(() => {
    if (!user || !editingId || editing) return
    setLoadError('')
    api<Card[]>('/cards').then(
      (cards) => {
        const card = cards.find((c) => String(c.id) === editingId)
        if (card) setEditing(card)
        else setLoadError('Cartão não encontrado. Ele pode ter sido excluído.')
      },
      (e) => (e instanceof ApiError && e.status === 401 ? logout() : setLoadError(errorText(e))),
    )
  }, [user, editingId, editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const setSessionUser = (u: NonNullable<typeof user>) => { session.set({ ...session.get()!, user: u }); setUser(u) }
  const verifyLink = <VerifyLink onVerified={(u) => setSessionUser({ ...user!, ...u })} />

  if (!user && supportTab()) return <SupportEnded />
  if (!user) return <>{verifyLink}<Auth onDone={(s) => transition(() => { session.set(s); setUser(s.user) }, 'page')} /></>

  return (
    <div className="mx-auto max-w-[1280px] has-[[data-device=computador]]:max-w-[1760px] px-4 pb-24 sm:px-6 lg:px-10">
      <SupportBanner onEnded={() => setUser(null)} />
      {!editingId && (
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 sm:h-[72px] sm:flex-nowrap sm:py-0">
          {/* Celular: logo e conta na 1ª linha, abas inteiras na 2ª. sm+: tudo numa linha. */}
          <a href="/" className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]">
            <img src="/favicon.png" alt="" width={30} height={30} className="rounded-full" />
            <span>VorenMe</span>
          </a>
          <nav aria-label="Painel" className="print-hide order-last grid w-full min-w-0 grid-cols-3 gap-1 rounded-full bg-[#f5f5f7] p-1 sm:order-none sm:flex sm:w-auto sm:overflow-x-auto [scrollbar-width:none]">
            {MAIN.map((t) => (
              <a key={t.path} href={t.path} aria-current={tab === t.path ? 'page' : undefined}
                onClick={(e) => { e.preventDefault(); goTab(t.path) }}
                className={`press shrink-0 rounded-full px-2 py-2 text-center text-[14px] font-medium sm:px-4 sm:py-1.5 ${tab === t.path ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
                {t.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <SupportButton />
            <details className="relative">
              <summary aria-label="Conta" className={`press flex cursor-pointer list-none items-center gap-2 rounded-full bg-[#f5f5f7] py-1 pr-1 pl-1 text-[14px] sm:pr-3 [&::-webkit-details-marker]:hidden ${ACCOUNT.some((t) => t.path === tab) ? 'ring-2 ring-accent/30' : ''}`}>
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-accent text-[13px] font-semibold text-accent-fg">
                  {(user.name || user.email).trim()[0]?.toUpperCase()}
                </span>
                <span className="hidden max-w-[160px] truncate font-medium sm:inline">{user.name || user.email}</span>
                <CaretDown size={14} weight="bold" className="hidden text-muted sm:block" aria-hidden="true" />
              </summary>
              <div className="absolute top-12 right-0 z-20 grid w-56 gap-1 rounded-[20px] bg-white p-2 text-[15px] shadow-[0_18px_40px_-16px_rgb(18_18_20/0.35)]"
                onClick={(e) => (e.target as HTMLElement).closest('a,button') && e.currentTarget.parentElement?.removeAttribute('open')}>
                <p className="truncate px-3 pt-1.5 pb-2 text-[13px] text-muted">{user.email}</p>
                {ACCOUNT.map((t) => (
                  <a key={t.path} href={t.path} aria-current={tab === t.path ? 'page' : undefined}
                    onClick={(e) => { e.preventDefault(); goTab(t.path) }}
                    className="rounded-xl px-3 py-2.5 font-medium hover:bg-[#f2f2f4] aria-[current=page]:bg-[#f2f2f4]">
                    {t.label}
                  </a>
                ))}
                <button type="button" onClick={logout} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left font-medium text-muted hover:bg-[#f2f2f4] hover:text-ink">
                  <SignOut size={17} aria-hidden="true" /> Sair
                </button>
              </div>
            </details>
          </div>
        </header>
      )}
      {verifyLink}
      <div className={editingId ? '' : 'pt-6'}>
        {!editingId && <VerifyBanner user={user} />}
        {!editingId && tab !== '/painel/assinatura' && <PlanBanner onSubscribe={() => goTab('/painel/assinatura')} />}
        <Suspense fallback={<p className="pt-4 text-sm text-muted">Carregando...</p>}>
        {editing ? (
          <Editor key={editing.id} card={editing} wizard={fresh} focus={focus} published={user.published ?? !!user.emailVerified} onBack={() => open(null)} onAuthLost={logout} />
        ) : editingId ? (
          <div className="grid justify-items-start gap-4 pt-10">
            {loadError ? (
              <>
                <Errors text={loadError} />
                <button type="button" className="text-sm font-semibold text-accent hover:underline" onClick={() => open(null)}>Voltar para seus cartões</button>
              </>
            ) : (
              <p className="text-sm text-muted">Carregando cartão...</p>
            )}
          </div>
        ) : (
          tab === '/painel/estatisticas' ? (sub
            ? <Stats key={sub} cardId={sub} onBack={() => goTab(tab)} onAuthLost={logout} />
            : <CardPicker title="Estatísticas" text="Escolha o cartão para ver visitas, cliques e de onde as pessoas vieram." onPick={(id) => goTab(tab, id)} onAuthLost={logout} />)
          : tab === '/painel/imprimir' ? (sub
            ? <PrintKit key={sub} cardId={sub} onBack={() => goTab(tab)} onAuthLost={logout} />
            : <CardPicker title="Kit de impressão" text="Escolha o cartão para gerar o QR code do balcão, da mesa e do cartão de visita." onPick={(id) => goTab(tab, id)} onAuthLost={logout} />)
          : tab === '/painel/assinatura' ? <Billing />
          : tab === '/painel/perfil' ? <Profile user={user} onChange={setSessionUser} onDeleted={logout} />
          : <Cards name={user.name} published={user.published ?? !!user.emailVerified} onEdit={open} onAuthLost={logout} />
        )}
        </Suspense>
      </div>
    </div>
  )
}

/** Plano vencido: aviso fixo no painel. Sem ele a pessoa só descobria ao tentar salvar. */
function PlanBanner({ onSubscribe }: { onSubscribe: () => void }) {
  const [b, setB] = useState<{ active: boolean; offlineAt: string } | null>(null)
  useEffect(() => { api<{ active: boolean; offlineAt: string }>('/billing').then(setB, () => {}) }, [])
  if (!b || b.active) return null
  const online = new Date(b.offlineAt) > new Date()
  return (
    <div role="alert" className="mb-6 flex flex-col gap-4 rounded-[20px] border border-amber-500/30 bg-amber-500/10 p-5 sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-700"><WarningCircle size={22} weight="bold" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-ink">Seu plano está vencido. Você não consegue editar nem salvar seus cartões.</p>
        <p className="mt-1 text-[14px] text-muted">
          {online
            ? `Seus cartões continuam no ar até ${new Date(b.offlineAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}. Assine para não perder nada.`
            : 'Seus cartões saíram do ar. Assine para eles voltarem.'}
        </p>
      </div>
      <button type="button" onClick={onSubscribe} className={`${primary} shrink-0`}>Assinar agora</button>
    </div>
  )
}
