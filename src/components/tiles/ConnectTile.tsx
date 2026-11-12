import { ArrowUpRight, CheckCircle, X } from '@phosphor-icons/react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { creator } from '../../config/creator'
import { fullName } from '../../config/derived'
import type { ConnectAction, ConnectService, Goal } from '../../config/types'
import { CHANNEL_TARGET, actionHref } from '../../lib/links'
import { CHANNEL_ICON } from '../icons'
import { ExternalLink } from '../ui/ExternalLink'

/** Título do bloco quando o dono não escreve um. */
export const GOAL_TITLE: Record<Goal, string> = {
  clientes: 'Como posso te ajudar?', orcamento: 'Peça seu orçamento', agendamento: 'Agende seu horário',
  parcerias: 'Vamos trabalhar juntos?', vendas: 'Confira e peça o seu', contatos: 'Vamos nos conectar',
}

const inPreview = window.parent !== window && new URLSearchParams(location.search).has('preview')
const field = 'w-full rounded-[var(--radius-ctl)] border border-line-strong bg-surface-2/60 px-3.5 py-3 text-[16px] text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30'

/** Atributos que o rastreamento lê (lib/track.ts). */
const trackAttrs = (a: ConnectAction, s?: ConnectService) => ({ 'data-track': CHANNEL_TARGET[a.channel], 'data-action': a.id, 'data-interest': s?.id })

/** Botão de uma ação: link (WhatsApp, telefone, e-mail, site) ou abre o formulário. */
function ActionButton({ action, service, className, children, onForm }: {
  action: ConnectAction; service?: ConnectService; className: string; children: ReactNode; onForm: (a: ConnectAction, s?: ConnectService) => void
}) {
  if (action.channel === 'form') {
    return <button type="button" {...trackAttrs(action, service)} onClick={() => onForm(action, service)} className={className}>{children}</button>
  }
  const href = actionHref(action, creator, service)
  if (!href) return null
  return <ExternalLink href={href} {...trackAttrs(action, service)} className={className}>{children}</ExternalLink>
}

/** Conecta: a ação principal em destaque, as outras abaixo e os serviços, cada um levando à sua ação. */
export function ConnectTile({ className = '' }: { className?: string }) {
  const k = creator.connect
  const [form, setForm] = useState<{ action: ConnectAction; service?: ConnectService } | null>(null)
  if (!k || !k.actions.length) return null
  const [main, ...rest] = k.actions
  const byId = new Map(k.actions.map((a) => [a.id, a]))
  const services = (k.services ?? []).filter((s) => byId.has(s.action))
  const onForm = (action: ConnectAction, service?: ConnectService) => setForm({ action, service })
  const MainIcon = CHANNEL_ICON[main.channel]

  return (
    <section id="conecta" aria-labelledby="conecta-title" data-reveal data-track-section="conecta" className={`tile t-connect p-6 md:p-8 ${className}`}>
      <h2 id="conecta-title" className="display text-[28px] leading-[1.05] font-semibold tracking-[-0.035em] text-balance md:text-[34px]">
        {k.title || GOAL_TITLE[k.goal]}
      </h2>
      {k.audience && <p className="mt-2 text-[15px] text-muted">{k.audience}</p>}

      <ActionButton action={main} onForm={onForm}
        className="press shine mt-6 flex min-h-[60px] w-full items-center gap-3 rounded-[var(--radius-ctl)] bg-accent px-5 text-left text-[16px] font-semibold text-accent-fg hover:brightness-110">
        <MainIcon size={22} weight="bold" aria-hidden="true" className="shrink-0" />
        <span className="flex-1">{main.label}</span>
        <ArrowUpRight size={18} className="nudge shrink-0" aria-hidden="true" />
      </ActionButton>

      {rest.length > 0 && (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {rest.map((a) => {
            const Icon = CHANNEL_ICON[a.channel]
            return (
              <li key={a.id}>
                <ActionButton action={a} onForm={onForm}
                  className="press flex min-h-[52px] w-full items-center gap-3 rounded-[var(--radius-ctl)] border border-line-strong px-4 text-left text-[15px] font-semibold hover:bg-surface-2">
                  <Icon size={20} aria-hidden="true" className="shrink-0" />
                  <span className="flex-1">{a.label}</span>
                </ActionButton>
              </li>
            )
          })}
        </ul>
      )}

      {services.length > 0 && (
        <div className="mt-7">
          <h3 className="text-[13px] font-medium text-muted">Escolha o que você procura</h3>
          <ul className="mt-2 grid gap-2">
            {services.map((s) => {
              const a = byId.get(s.action)!
              return (
                <li key={s.id}>
                  <ActionButton action={a} service={s} onForm={onForm}
                    className="press flex w-full items-center gap-3 rounded-[var(--radius-ctl)] bg-surface-2/60 px-4 py-3 text-left hover:bg-surface-2">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{s.name}</span>
                      {s.description && <span className="block text-[13px] text-muted">{s.description}</span>}
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold text-accent">{a.label}</span>
                    <ArrowUpRight size={16} className="nudge shrink-0 text-accent" aria-hidden="true" />
                  </ActionButton>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {form && <LeadDialog key={`${form.action.id}-${form.service?.id ?? ''}`} {...form} onClose={() => setForm(null)} />}
    </section>
  )
}

type Status = { state: 'idle' | 'sending' | 'sent' } | { state: 'error'; message: string }

/** Formulário de contato (diálogo nativo: foco preso, Esc fecha). Sem cadastro; consentimento obrigatório. */
function LeadDialog({ action, service, onClose }: { action: ConnectAction; service?: ConnectService; onClose: () => void }) {
  const [status, setStatus] = useState<Status>({ state: 'idle' })
  const opened = useRef(false)
  const mount = (d: HTMLDialogElement | null) => {
    if (d && !opened.current) { opened.current = true; d.showModal() }
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (inPreview || status.state === 'sending') return
    const f = new FormData(e.currentTarget)
    setStatus({ state: 'sending' })
    try {
      const slug = location.pathname.split('/')[1]
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/v1/public/cards/${encodeURIComponent(slug)}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action.id, interest: service?.id, name: f.get('name'), contact: f.get('contact'),
          message: f.get('message'), consent: f.get('consent') === 'on', website: f.get('website'),
        }),
      })
      if (res.ok) return setStatus({ state: 'sent' })
      const json = await res.json().catch(() => ({}))
      setStatus({ state: 'error', message: json.errors?.join(' ') ?? json.message ?? 'Não foi possível enviar. Tente novamente.' })
    } catch {
      setStatus({ state: 'error', message: 'Sem conexão. Confira sua internet e tente de novo.' })
    }
  }

  return (
    <dialog ref={mount} className="qr-dialog" aria-labelledby="lead-title" onClose={onClose} onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
      <div className="w-[420px] max-w-full rounded-[var(--radius)] border border-line bg-surface p-6 text-left text-ink shadow-[var(--card-shadow)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="lead-title" className="text-xl font-semibold tracking-[-0.03em]">{action.label}</h2>
            <p className="mt-0.5 text-sm text-muted">{service ? `${service.name} · ` : ''}{fullName} responde pelo contato que você deixar.</p>
          </div>
          <button type="button" onClick={(e) => e.currentTarget.closest('dialog')!.close()} aria-label={creator.labels.close}
            className="press -mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-2">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {status.state === 'sent' ? (
          <div role="status" className="mt-6 grid justify-items-center gap-3 py-4 text-center">
            <CheckCircle size={44} weight="fill" className="text-accent" aria-hidden="true" />
            <p className="text-[17px] font-semibold">Contato enviado!</p>
            <p className="text-sm text-muted">{fullName} recebeu seus dados e vai falar com você.</p>
            <button type="button" onClick={(e) => e.currentTarget.closest('dialog')!.close()}
              className="press mt-2 h-12 w-full rounded-[var(--radius-ctl)] border border-line-strong font-semibold hover:bg-surface-2">{creator.labels.close}</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 grid gap-3">
            <label className="grid gap-1.5 text-[14px] font-medium">
              Seu nome
              <input name="name" required minLength={2} maxLength={80} autoComplete="name" className={field} />
            </label>
            <label className="grid gap-1.5 text-[14px] font-medium">
              WhatsApp ou e-mail
              <input name="contact" required maxLength={120} autoComplete="tel" placeholder="(11) 98765-4321" className={field} />
            </label>
            <label className="grid gap-1.5 text-[14px] font-medium">
              Mensagem <span className="font-normal text-muted">(opcional)</span>
              <textarea name="message" rows={3} maxLength={500} className={field} />
            </label>
            {/* Isca para robôs: invisível para pessoas e leitores de tela. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
              <label>Site<input name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>
            <label className="flex items-start gap-2.5 text-[13px] leading-snug text-muted">
              <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]" />
              <span>Autorizo enviar meu nome e contato para {fullName} responder a este pedido. Os dados ficam guardados no VorenMe só para isso, por até 12 meses, e não são compartilhados.</span>
            </label>
            {status.state === 'error' && <p role="alert" className="rounded-[var(--radius-ctl)] bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">{status.message}</p>}
            {inPreview && <p className="text-[13px] text-muted">Na prévia do painel o formulário não envia.</p>}
            <button type="submit" disabled={status.state === 'sending' || inPreview}
              className="press mt-1 h-12 rounded-[var(--radius-ctl)] bg-accent font-semibold text-accent-fg hover:brightness-110 disabled:opacity-50">
              {status.state === 'sending' ? 'Enviando...' : 'Enviar contato'}
            </button>
          </form>
        )}
      </div>
    </dialog>
  )
}
