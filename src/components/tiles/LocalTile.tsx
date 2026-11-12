import { ArrowUpRight, Clock, MapPin, Star } from '@phosphor-icons/react'
import { creator } from '../../config/creator'
import { placeLinks } from '../../lib/places'
import { ExternalLink } from '../ui/ExternalLink'

const pill = 'press inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-[14px] font-semibold hover:border-line-strong hover:bg-surface-2'

/** Negócio local: endereço com rota (Maps, Waze, Uber), horário e "Avalie no Google". Some se nada estiver preenchido. */
export function LocalTile({ className = '' }: { className?: string }) {
  const { address, review } = creator
  if (!address && !review) return null
  const links = address && placeLinks(address.text, address.geo)
  return (
    <section aria-labelledby="local-title" data-reveal className={`tile p-6 ${className}`}>
      <h2 id="local-title" className="mb-4 flex items-center gap-2 text-[13px] font-medium text-muted">
        <MapPin size={16} aria-hidden="true" />
        {address ? 'Onde estamos' : 'Avaliações'}
      </h2>
      {address && (
        <>
          <p className="text-[17px] leading-snug font-semibold">{address.text}</p>
          {address.hours && address.hours.length > 0 && (
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[14px]">
              <Clock size={16} className="col-span-2 mb-1 text-muted" aria-label="Horário de funcionamento" />
              {address.hours.map((h) => (
                <div key={h.days} className="contents">
                  <dt className="text-muted">{h.days}</dt>
                  <dd className="font-medium tabular-nums">{h.time}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <ExternalLink href={links!.maps} className={pill}>Google Maps<ArrowUpRight size={14} aria-hidden="true" /></ExternalLink>
            <ExternalLink href={links!.waze} className={pill}>Waze<ArrowUpRight size={14} aria-hidden="true" /></ExternalLink>
            <ExternalLink href={links!.uber} className={pill}>Uber<ArrowUpRight size={14} aria-hidden="true" /></ExternalLink>
          </div>
        </>
      )}
      {review && (
        <ExternalLink href={review.url} data-track="avaliar"
          className={`press shine ${address ? 'mt-5' : ''} flex min-h-[52px] items-center justify-center gap-2 rounded-[var(--radius-ctl)] bg-accent px-4 text-[15px] font-semibold text-accent-fg hover:brightness-110`}>
          <Star size={18} weight="fill" aria-hidden="true" />
          Avalie no Google
        </ExternalLink>
      )}
    </section>
  )
}
