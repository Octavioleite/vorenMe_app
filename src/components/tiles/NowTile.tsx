import { ArrowUpRight } from '@phosphor-icons/react'
import { creator } from '../../config/creator'
import { ExternalLink } from '../ui/ExternalLink'

/** Notebook page: dot grid, an accent margin rule, interests as hashtags. Informational, so it stays still. */
export function NowTile({ className = '' }: { className?: string }) {
  const now = creator.now
  if (!now) return null
  return (
    <section aria-labelledby="now-title" data-reveal className={`tile dots flex flex-col p-6 ${className}`}>
      <h2 id="now-title" className="text-[13px] font-medium text-muted">
        {now.title}
      </h2>
      <p className="mt-3 border-l-[3px] border-accent pl-4 text-xl leading-[1.3] font-medium tracking-[-0.025em] text-balance">{now.text}</p>
      {now.url && (
        <ExternalLink href={now.url} className="press mt-3 inline-flex items-center gap-1 pl-[19px] text-sm font-semibold text-accent hover:underline">
          Ver mais
          <ArrowUpRight size={15} className="nudge" aria-hidden="true" />
        </ExternalLink>
      )}
      {now.interests && now.interests.length > 0 && (
        <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5 pt-6" aria-label="Interesses">
          {now.interests.map((t) => (
            <li key={t} className="text-[14px] font-medium text-ink/80">
              <span aria-hidden="true" className="mr-0.5 text-accent">
                #
              </span>
              {t}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
