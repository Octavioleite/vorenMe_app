import { ArrowUpRight } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { creator } from '../../config/creator'
import { platformMeta } from '../icons'
import { ExternalLink } from '../ui/ExternalLink'

export function SocialTiles({ className = '' }: { className?: string }) {
  const { socials, labels } = creator
  return (
    <section aria-labelledby="socials-title" className={className}>
      <h2 id="socials-title" className="sr-only">
        {labels.socials}
      </h2>
      <ul className="socials-grid grid grid-cols-2 gap-3">
        {socials.map((s, idx) => {
          const { name, Icon, brand } = platformMeta[s.platform]
          const label = s.label ?? name
          return (
            <li key={s.url} data-reveal style={{ '--i': idx, '--brand': brand } as CSSProperties} className="min-w-0">
              <ExternalLink
                href={s.url}
                aria-label={`${label}: ${s.handle}${s.followers ? `, ${s.followers} ${labels.followers}` : ''}`}
                className="tile wash group flex h-full min-h-[116px] flex-col justify-between p-4 md:min-h-[132px] md:p-5"
              >
                <Icon size={150} weight="fill" className="watermark" aria-hidden="true" />
                <span className="flex items-start justify-between">
                  <Icon size={28} className="transition-colors duration-300 group-hover:text-(--brand)" aria-hidden="true" />
                  <ArrowUpRight size={18} className="nudge text-muted" aria-hidden="true" />
                </span>
                <span className="mt-6 block min-w-0">
                  <span className="block text-[15px] leading-tight font-semibold">{label}</span>
                  <span className="mt-1 block truncate text-[13px] text-muted">{s.handle}</span>
                  {s.followers && (
                    <span className="mt-0.5 block text-[13px] text-muted tabular-nums">
                      {s.followers} {labels.followers}
                    </span>
                  )}
                </span>
              </ExternalLink>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
