import { creator } from '../../config/creator'
import { ExternalLink } from '../ui/ExternalLink'

/** Credits, not a card: a hairline and logos. Rendered only when real collaborations are listed. Logos only, no captions. */
export function BrandsTile({ className = '' }: { className?: string }) {
  const brands = creator.brands ?? []
  if (brands.length === 0) return null
  return (
    <section aria-labelledby="brands-title" data-reveal className={`border-t border-line px-1 pt-6 ${className}`}>
      <h2 id="brands-title" className="text-[13px] font-medium text-muted">
        {creator.labels.brands}
      </h2>
      <ul className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-5">
        {brands.map((b) => {
          const mark = b.logo ? (
            <img src={b.logo} alt={b.name} loading="lazy" className="h-6 w-auto opacity-70 grayscale transition-opacity hover:opacity-100 dark:invert" />
          ) : (
            <span className="text-xl font-semibold tracking-[-0.03em] text-muted">{b.name}</span>
          )
          return (
            <li key={b.name}>
              {b.url ? (
                <ExternalLink href={b.url} className="press block">
                  {mark}
                </ExternalLink>
              ) : (
                mark
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
