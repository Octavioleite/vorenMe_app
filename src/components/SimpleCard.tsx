import { ArrowUpRight, Envelope, MapPin, UserPlus, WhatsappLogo } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { creator } from '../config/creator'
import { emailHref, initials, whatsappHref } from '../config/derived'
import { platformMeta } from './icons'
import { Footer } from './Footer'
import { ConnectTile } from './tiles/ConnectTile'
import { LocalTile } from './tiles/LocalTile'
import { PixTile } from './tiles/PixTile'
import { TopBar } from './TopBar'
import { ExternalLink } from './ui/ExternalLink'
import { SaveContact } from './ui/SaveContact'
import { SmartImage } from './ui/SmartImage'

const i = (n: number) => ({ '--i': n }) as CSSProperties
const row = 'press flex min-h-[56px] items-center gap-3 rounded-[var(--radius-ctl)] px-4 text-[15px] font-semibold'

/** Estilo "simples": link-in-bio de uma coluna. Foto redonda, nome e um botão por contato, sem blocos. */
export function SimpleCard() {
  const { name, niche, bio, photo, location, availability, socials, whatsapp, email, partnership, labels } = creator
  return (
    <div className="mx-auto max-w-[480px] px-4">
      <TopBar />
      <main className="pb-10 text-center">
        <div className="deal relative mx-auto size-28 overflow-hidden rounded-full bg-surface-2 ring-4 ring-surface">
          <SmartImage photo={photo} widths={[240, 360]} sizes="112px" priority fallback={initials} />
        </div>
        <h1 className="rise display mt-5 text-[32px] leading-tight font-semibold tracking-[-0.035em]" style={i(1)}>
          {name.first} {name.last}
        </h1>
        <p className="rise mt-1 text-[15px] text-muted" style={i(2)}>
          {niche}
          {location && <span className="ml-2 inline-flex items-center gap-1"><MapPin size={14} aria-hidden="true" />{location}</span>}
        </p>
        <p className="rise mx-auto mt-4 max-w-[38ch] text-[16px] leading-relaxed text-ink/85" style={i(3)}>{bio}</p>
        {availability && (
          <p className="rise mt-4 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-[13px] font-medium" style={i(3)}>
            <span aria-hidden="true" className={`relative size-2 rounded-full bg-accent ${availability.open ? 'pulse' : 'opacity-40'}`} />
            {availability.label}
          </p>
        )}

        <ConnectTile className="mt-7 text-left" />

        <ul className="mt-7 grid gap-2.5 text-left">
          {whatsappHref && whatsapp && (
            <li className="rise" style={i(4)}>
              <ExternalLink href={whatsappHref} className={`${row} shine bg-accent text-accent-fg hover:brightness-110`}>
                <WhatsappLogo size={22} aria-hidden="true" />
                <span className="flex-1">{labels.whatsapp}</span>
                <ArrowUpRight size={17} className="nudge" aria-hidden="true" />
              </ExternalLink>
            </li>
          )}
          {socials.map((s, n) => {
            const { name: pname, Icon } = platformMeta[s.platform]
            return (
              <li key={s.url} className="rise" style={i(5 + n)}>
                <ExternalLink href={s.url} className={`${row} border border-line bg-surface hover:border-line-strong hover:bg-surface-2`}>
                  <Icon size={22} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{s.label ?? pname}<span className="ml-2 font-normal text-muted">{s.handle}</span></span>
                  <ArrowUpRight size={17} className="nudge text-muted" aria-hidden="true" />
                </ExternalLink>
              </li>
            )
          })}
          {emailHref && email && (
            <li className="rise" style={i(5 + socials.length)}>
              <a href={emailHref} className={`${row} border border-line bg-surface hover:border-line-strong hover:bg-surface-2`}>
                <Envelope size={22} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{labels.email}<span className="ml-2 font-normal text-muted">{email.address}</span></span>
              </a>
            </li>
          )}
          <li className="rise" style={i(6 + socials.length)}>
            <SaveContact className={`${row} justify-center border border-line-strong hover:bg-surface-2`}>
              <UserPlus size={20} weight="bold" aria-hidden="true" />
              {labels.saveContact}
            </SaveContact>
          </li>
        </ul>

        <div className="mt-6 grid gap-3 text-left">
          <LocalTile />
          <PixTile />
        </div>

        {partnership.formats && partnership.formats.length > 0 && (
          <ul className="mt-8 flex flex-wrap justify-center gap-1.5" aria-label="Serviços">
            {partnership.formats.map((f) => (
              <li key={f} className="tag rounded-full border border-line px-3 py-1 text-[13px] text-ink/80">{f}</li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  )
}
