import { Headset } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { api, session } from './api'

interface Status { active: boolean; viewer: 'owner' | 'support'; by?: string; startedAt?: string; expiresAt?: string }
const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '')

/** Faixa fixa enquanto o suporte está na conta (como o AnyDesk): o cliente vê quem e desde quando, e pode encerrar.
 *  Na aba do admin aparece a versão "você está na conta de fulano". Confere a cada 20s e ao voltar para a aba. */
export function SupportBanner({ onEnded }: { onEnded: () => void }) {
  const [s, setS] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => document.visibilityState === 'visible' && api<Status>('/auth/support').then(setS, () => {})
    check()
    const t = setInterval(check, 20_000)
    addEventListener('visibilitychange', check)
    return () => { clearInterval(t); removeEventListener('visibilitychange', check) }
  }, [])

  // Publica a altura da faixa (--banner-h) para botões fixos embaixo (ex.: "Ver prévia") subirem junto.
  const active = !!s?.active
  useEffect(() => {
    const el = bar.current
    const root = document.documentElement.style
    if (!el) return
    const ro = new ResizeObserver(() => root.setProperty('--banner-h', `${el.offsetHeight}px`))
    ro.observe(el)
    return () => { ro.disconnect(); root.removeProperty('--banner-h') }
  }, [active])

  if (!s?.active) return null
  const mine = s.viewer === 'support'
  const end = async () => {
    setBusy(true)
    await api('/auth/support/end', 'POST').catch(() => {})
    setBusy(false)
    if (mine) { session.set(null); onEnded() } else setS({ ...s, active: false })
  }
  return (
    <div ref={bar} role="status" aria-live="polite"
      className="print-hide fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-[#d92d20] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[14px] text-white shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.4)]">
      <span className="flex min-w-0 items-center gap-2 font-medium [overflow-wrap:anywhere]">
        <Headset size={18} weight="fill" aria-hidden="true" className="animate-pulse" />
        {mine
          ? <>Modo suporte: você está na conta de <b>{session.get()?.user.email}</b>. O cliente está vendo este aviso. Expira às {time(s.expiresAt)}.</>
          : <>{s.by} (suporte VorenMe) está acessando sua conta desde as {time(s.startedAt)}.</>}
      </span>
      <button type="button" disabled={busy} onClick={end}
        className="press rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-[#d92d20] hover:bg-white/90 disabled:opacity-60">
        {mine ? 'Sair do modo suporte' : 'Encerrar acesso'}
      </button>
    </div>
  )
}

/** Aba de suporte sem sessão (encerrada, expirada ou revogada pelo cliente). */
export function SupportEnded() {
  return (
    <main className="mx-auto grid max-w-md gap-3 px-4 pt-24 text-center">
      <h1 className="text-[26px] font-semibold tracking-tight">Acesso de suporte encerrado</h1>
      <p className="text-muted">A sessão terminou ou foi encerrada pelo cliente. Pode fechar esta aba.</p>
      <a href="/admin" className="text-sm font-semibold text-accent hover:underline">Voltar para o admin</a>
    </main>
  )
}
