import { ArrowUpRight, Check, Copy, Envelope, WhatsappLogo } from '@phosphor-icons/react'
import { creator } from '../../config/creator'
import { emailHref, whatsappHref } from '../../config/derived'
import { useCopy } from '../../lib/share'
import { ExternalLink } from '../ui/ExternalLink'

export function PartnershipTile({ className = '' }: { className?: string }) {
  const { partnership, availability, whatsapp, email, labels } = creator
  const { copy, copied, canCopy } = useCopy()

  return (
    <section
      aria-labelledby="partnership-title"
      data-reveal
      className={`tile pship on-accent relative overflow-hidden !border-transparent bg-accent p-6 text-accent-fg md:p-8 ${className}`}
    >
      <div className="relative">
        {availability && (
          <p className="flex items-center gap-2.5 text-[13px] font-semibold">
            <span aria-hidden="true" className={`relative size-2 rounded-full bg-current ${availability.open ? 'pulse' : 'opacity-40'}`} />
            {availability.label}
          </p>
        )}
        <h2
          id="partnership-title"
          className="display mt-5 max-w-[13ch] text-[38px] leading-[0.95] font-semibold tracking-[-0.045em] text-balance md:text-[52px]"
        >
          {partnership.title}
        </h2>
        <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed opacity-85">{partnership.text}</p>
        {partnership.formats && partnership.formats.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Formatos">
            {partnership.formats.map((f) => (
              <li key={f} className="tag rounded-full border border-current/25 px-3 py-1 text-[13px] font-medium">
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="pship-contacts mt-8 grid max-w-[520px] gap-2">
          {whatsappHref && whatsapp && (
            <ExternalLink
              href={whatsappHref}
              className="press shine flex min-h-[60px] items-center gap-3 rounded-[var(--radius-ctl)] bg-accent-fg px-4 py-2.5 text-accent hover:opacity-90"
            >
              <WhatsappLogo size={24} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] leading-tight font-semibold">{labels.whatsapp}</span>
                <span className="block truncate text-[13px] opacity-80">{whatsapp.display ?? `+${whatsapp.number}`}</span>
              </span>
              <ArrowUpRight size={18} className="nudge shrink-0" aria-hidden="true" />
            </ExternalLink>
          )}
          {emailHref && email && (
            <div className="flex min-w-0 gap-2">
              <a
                href={emailHref}
                className="press flex min-h-[60px] min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-ctl)] border border-current/25 px-4 py-2.5 hover:bg-accent-fg/10"
              >
                <Envelope size={24} aria-hidden="true" className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-tight font-semibold">{labels.email}</span>
                  <span className="block truncate text-[13px] opacity-80">{email.address}</span>
                </span>
              </a>
              {canCopy && (
                <button
                  type="button"
                  onClick={() => copy(email.address)}
                  aria-label={labels.copyEmail}
                  title={labels.copyEmail}
                  className="press grid w-[60px] shrink-0 place-items-center rounded-[var(--radius-ctl)] border border-current/25 hover:bg-accent-fg/10"
                >
                  {copied ? <Check size={20} weight="bold" aria-hidden="true" /> : <Copy size={20} aria-hidden="true" />}
                </button>
              )}
            </div>
          )}
        </div>
        <p aria-live="polite" className="sr-only">
          {copied ? labels.copied : ''}
        </p>
      </div>
    </section>
  )
}
