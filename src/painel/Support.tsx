import { Check, Copy, Headset, WhatsappLogo, X } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { iconBtn, primary } from './ui'

export const SUPPORT_PHONE = '5561981386671'
export const SUPPORT_EMAIL = 'vorentech@gmail.com' // mesmo do MAIL_FROM da API
const PHONE_LABEL = '(61) 98138-6671'
const WHATSAPP_URL = `https://wa.me/${SUPPORT_PHONE}`

/** Linha de contato: rótulo, valor (link) e copiar. Copiar cobre quem não tem app de e-mail no computador. */
function ContactRow({ label, value, href, copy }: { label: string; value: string; href: string; copy: string }) {
  const [done, setDone] = useState(false)
  const onCopy = async () => {
    await navigator.clipboard.writeText(copy)
    setDone(true)
    setTimeout(() => setDone(false), 1600)
  }
  return (
    <li className="flex min-w-0 items-center gap-3 py-3 pr-2 pl-4">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-muted">{label}</p>
        <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
          className="block truncate text-[15px] font-semibold hover:text-accent">
          {value}
        </a>
      </div>
      <button type="button" onClick={onCopy} className={`${iconBtn} size-9 bg-transparent hover:bg-white`}
        aria-label={done ? `${label} copiado` : `Copiar ${label.toLowerCase()}`} title={done ? 'Copiado' : 'Copiar'}>
        {done ? <Check size={16} weight="bold" className="text-accent" /> : <Copy size={16} />}
      </button>
    </li>
  )
}

/** Botão do cabeçalho: abre os canais de contato com o suporte. */
export function SupportButton() {
  const dialog = useRef<HTMLDialogElement>(null)
  const cta = useRef<HTMLAnchorElement>(null)
  // showModal() focaria o X; o foco vai para a ação principal.
  const open = () => { dialog.current?.showModal(); cta.current?.focus() }
  return (
    <>
      <button type="button" onClick={open} aria-haspopup="dialog" aria-label="Suporte" title="Suporte"
        className="press inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#f2f2f4] px-3 text-[14px] font-medium text-muted hover:bg-[#e8e8ec] hover:text-ink sm:px-4">
        <Headset size={18} aria-hidden="true" />
        <span className="hidden sm:inline" aria-hidden="true">Suporte</span>
      </button>

      <dialog ref={dialog} className="qr-dialog w-[400px]" aria-labelledby="support-title" aria-describedby="support-text"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
        <div className="tile p-6 sm:p-7">
          <div className="flex items-start justify-between">
            <span className="grid size-11 place-items-center rounded-full bg-accent/12 text-accent">
              <Headset size={22} weight="bold" aria-hidden="true" />
            </span>
            <button type="button" className={`${iconBtn} -mt-1 -mr-1 size-9`} onClick={() => dialog.current?.close()} aria-label="Fechar">
              <X size={16} />
            </button>
          </div>

          <h2 id="support-title" className="mt-4 text-[20px] font-semibold tracking-[-0.02em]">Fale com a VorenMe</h2>
          <p id="support-text" className="mt-1.5 text-sm leading-relaxed text-muted">
            Dúvidas sobre o cartão, a conta ou a assinatura. Uma pessoa do time responde.
          </p>

          <a href={WHATSAPP_URL} target="_blank" ref={cta} rel="noreferrer" className={`${primary} mt-6 h-12 w-full text-[15px]`}>
            <WhatsappLogo size={20} weight="bold" aria-hidden="true" /> Conversar no WhatsApp
          </a>

          <ul className="mt-3 divide-y divide-black/6 rounded-[16px] bg-[#f5f5f7]">
            <ContactRow label="WhatsApp" value={PHONE_LABEL} href={WHATSAPP_URL} copy={PHONE_LABEL} />
            <ContactRow label="E-mail" value={SUPPORT_EMAIL} href={`mailto:${SUPPORT_EMAIL}`} copy={SUPPORT_EMAIL} />
          </ul>
        </div>
      </dialog>
    </>
  )
}
