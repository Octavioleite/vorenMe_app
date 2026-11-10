import { CheckCircle, EnvelopeSimple, WarningCircle, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { api, session, type User } from './api'
import { errorText } from './ui'

/** Link do e-mail (/painel?verificar=<token>): confirma com ou sem login e mostra o resultado num aviso no topo. */
export function VerifyLink({ onVerified }: { onVerified: (u: User) => void }) {
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    const q = new URLSearchParams(location.search)
    const token = q.get('verificar')
    if (!token) return
    q.delete('verificar')
    history.replaceState(null, '', `${location.pathname}${q.size ? `?${q}` : ''}`)
    api<User>('/auth/verify-email', 'POST', { token }).then(
      (u) => {
        if (session.get()?.user.id === u.id) onVerified(u)
        setNotice({ ok: true, text: session.get() ? 'E-mail confirmado. Obrigado!' : 'E-mail confirmado. Agora é só entrar.' })
      },
      (e) => setNotice({ ok: false, text: errorText(e) }),
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!notice) return null
  const Icon = notice.ok ? CheckCircle : WarningCircle
  return (
    <div role="status" className="rise fixed inset-x-4 top-4 z-50 mx-auto flex max-w-[480px] items-center gap-3 rounded-[16px] bg-white p-4 shadow-[0_12px_40px_-12px_rgb(40_40_50/0.35)] ring-1 ring-black/5">
      <Icon size={22} weight="fill" className={notice.ok ? 'shrink-0 text-accent' : 'shrink-0 text-red-600'} aria-hidden="true" />
      <p className="flex-1 text-[15px] font-medium">{notice.text}</p>
      <button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso" className="grid size-8 place-items-center rounded-full text-muted hover:bg-[#f5f5f7] hover:text-ink"><X size={15} /></button>
    </div>
  )
}

/** Faixa no painel enquanto o e-mail não foi confirmado. */
export function VerifyBanner({ user }: { user: User }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | string>('idle')
  if (user.emailVerified !== false) return null
  const resend = async () => {
    setState('sending')
    try {
      await api('/auth/resend-verification', 'POST')
      setState('sent')
    } catch (e) {
      setState(errorText(e))
    }
  }
  return (
    <div className="rise mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] bg-accent/8 px-4 py-3">
      <EnvelopeSimple size={20} className="shrink-0 text-accent" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[14px]">
        <span className="font-semibold">Confirme seu e-mail.</span> Enviamos um link para <span className="font-medium">{user.email}</span>. É por ele que você recupera a senha.
      </p>
      {state === 'sent' ? (
        <span className="text-[13px] font-semibold">Enviado! Confira também o spam.</span>
      ) : (
        <button type="button" onClick={resend} disabled={state === 'sending'} className="press text-[13px] font-semibold text-accent hover:underline disabled:opacity-50">
          {state === 'sending' ? 'Enviando...' : 'Reenviar e-mail'}
        </button>
      )}
      {state !== 'idle' && state !== 'sending' && state !== 'sent' && <p className="w-full text-[13px] text-red-600">{state}</p>}
    </div>
  )
}
