import { Envelope, WhatsappLogo } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { creator } from '../config/creator'
import { connectPrimary, emailHref, fullName, whatsappHref } from '../config/derived'
import { CHANNEL_TARGET } from '../lib/links'
import { CHANNEL_ICON } from './icons'
import { responsive } from '../lib/img'
import { ExternalLink } from './ui/ExternalLink'

/** Sticky contact bar on mobile; appears once the hero CTAs scroll out of view. */
export function MobileDock() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const target = document.getElementById('hero-cta')
    if (!target) return
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(target)
    return () => io.disconnect()
  }, [])

  if (!connectPrimary && !whatsappHref && !emailHref) return null
  const MainIcon = connectPrimary ? CHANNEL_ICON[connectPrimary.action.channel] : WhatsappLogo
  const avatar = responsive(creator.photo.src, [96, 160])

  return (
    <div data-show={show} className="dock fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <nav
        aria-label={creator.labels.whatsapp}
        className="flex items-center gap-2 rounded-[var(--radius)] border border-line-strong bg-surface/85 p-2 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.55)] backdrop-blur-xl"
      >
        <img
          src={avatar.src}
          srcSet={avatar.srcSet}
          sizes="44px"
          alt=""
          loading="lazy"
          className="size-11 shrink-0 rounded-full bg-surface-2 object-cover"
          style={{ objectPosition: creator.photo.focal }}
        />
        <span className="sr-only">{fullName}</span>
        {(connectPrimary || whatsappHref) && (
          <ExternalLink
            href={connectPrimary?.href ?? whatsappHref}
            {...(connectPrimary && { 'data-track': CHANNEL_TARGET[connectPrimary.action.channel], 'data-action': connectPrimary.action.id })}
            className="press flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[var(--radius-ctl)] bg-accent px-3 text-[15px] font-semibold text-accent-fg"
          >
            <MainIcon size={20} weight="bold" aria-hidden="true" className="shrink-0" />
            <span className="truncate">{connectPrimary?.action.label ?? creator.labels.whatsapp}</span>
          </ExternalLink>
        )}
        {emailHref && (
          <a
            href={emailHref}
            aria-label={creator.labels.email}
            className="press grid size-12 shrink-0 place-items-center rounded-full border border-line-strong"
          >
            <Envelope size={20} aria-hidden="true" />
          </a>
        )}
      </nav>
    </div>
  )
}
