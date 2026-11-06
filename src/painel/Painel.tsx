import { SignOut } from '@phosphor-icons/react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { api, ApiError, session, type Card } from './api'
import { Auth } from './Auth'

// Só quem já entrou paga por Cards/Editor: o login carrega sozinho.
const Cards = lazy(() => import('./Cards').then((m) => ({ default: m.Cards })))
const Editor = lazy(() => import('./Editor').then((m) => ({ default: m.Editor })))
import { Errors, Logo, errorText, iconBtn, transition } from './ui'

/** Rotas: /painel (lista) · /painel/:id/editar (editor). Recarregar a página mantém onde a pessoa estava. */
const idFromUrl = () => location.pathname.match(/^\/painel\/([^/]+)\/editar\/?$/)?.[1] ?? null
const go = (id: string | null) => history.pushState(null, '', id ? `/painel/${encodeURIComponent(id)}/editar` : '/painel')

export function Painel() {
  const [user, setUser] = useState(() => session.get()?.user ?? null)
  const [editingId, setEditingId] = useState(idFromUrl)
  const [editing, setEditing] = useState<Card | null>(null)
  const [loadError, setLoadError] = useState('')

  const logout = () => {
    session.set(null)
    transition(() => { setUser(null); open(null) }, 'page')
  }
  const open = (card: Card | null) => {
    go(card ? String(card.id) : null)
    setEditing(card)
    setEditingId(card ? String(card.id) : null)
  }

  // Voltar/avançar do navegador.
  useEffect(() => {
    const onPop = () => { setEditingId(idFromUrl()); setEditing(null) }
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

  if (!user) return <Auth onDone={(s) => transition(() => { session.set(s); setUser(s.user) }, 'page')} />

  return (
    <div className="mx-auto max-w-[1280px] has-[[data-device=computador]]:max-w-[1760px] px-4 pb-16 sm:px-6 lg:px-10">
      {!editingId && (
        <header className="flex h-[72px] items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{user.name || user.email}</span>
            <button type="button" className={iconBtn} onClick={logout} aria-label="Sair" title="Sair">
              <SignOut size={17} />
            </button>
          </div>
        </header>
      )}
      <div className={editingId ? '' : 'pt-6'}>
        <Suspense fallback={<p className="pt-4 text-sm text-muted">Carregando...</p>}>
        {editing ? (
          <Editor key={editing.id} card={editing} onBack={() => open(null)} onAuthLost={logout} />
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
          <Cards onEdit={open} onAuthLost={logout} />
        )}
        </Suspense>
      </div>
    </div>
  )
}
