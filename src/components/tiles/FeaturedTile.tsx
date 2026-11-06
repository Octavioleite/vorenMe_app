import { ArrowUpRight, Play } from '@phosphor-icons/react'
import { creator } from '../../config/creator'
import { initials } from '../../config/derived'
import { platformMeta } from '../icons'
import { ExternalLink } from '../ui/ExternalLink'
import { SmartImage } from '../ui/SmartImage'

/** Cinema screen: full-bleed media, title on a scrim, a playhead that fills on hover (videos). */
export function FeaturedTile({ className = '' }: { className?: string }) {
  const item = creator.featured
  if (!item) return null
  const { name, Icon } = platformMeta[item.platform]
  const isVideo = item.kind === 'video'
  const verb = isVideo ? creator.labels.watchOn : creator.labels.openOn

  return (
    <section aria-labelledby="featured-title" data-reveal className={className}>
      <ExternalLink href={item.url} className="tile zoom on-photo group block overflow-hidden !border-transparent">
        <div className="relative aspect-[4/3] sm:aspect-video">
          <SmartImage
            photo={item.image}
            widths={[480, 720, 960, 1280]}
            sizes="(min-width: 1200px) 660px, (min-width: 1024px) 56vw, 100vw"
            fallback={initials}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 via-50% to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-4 text-[#FAFAF9] md:p-6">
            <span
              aria-hidden="true"
              className="play-ring relative grid size-14 shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition-transform duration-500 ease-out-expo group-hover:scale-110"
            >
              {isVideo ? <Play size={22} weight="fill" className="translate-x-px" /> : <ArrowUpRight size={22} weight="bold" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-white/75">{creator.labels.featured}</p>
              <h2 id="featured-title" className="mt-1 text-[21px] leading-[1.15] font-semibold tracking-[-0.03em] text-balance md:text-2xl">
                {item.title}
              </h2>
            </div>
            <span className="hidden shrink-0 items-center gap-1.5 pb-0.5 text-[13px] text-white/75 sm:flex">
              <Icon size={18} aria-hidden="true" />
              {verb} {name}
              <ArrowUpRight size={16} className="nudge" aria-hidden="true" />
            </span>
            <span className="sr-only sm:hidden">
              {verb} {name}
            </span>
          </div>
          {isVideo && <span aria-hidden="true" className="scrub" />}
        </div>
      </ExternalLink>
    </section>
  )
}
