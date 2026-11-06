import { useEffect, useRef, useState } from 'react'
import type { Photo } from '../../config/types'
import { responsive } from '../../lib/img'

interface Props {
  photo: Photo
  /** Width ladder for srcset (Unsplash only). */
  widths: number[]
  sizes: string
  priority?: boolean
  /** Text shown if the image fails to load. */
  fallback: string
  className?: string
}

/** Image with shimmer while loading, fade-in on load, and a typographic fallback on error. */
export function SmartImage({ photo, widths, sizes, priority, fallback, className = '' }: Props) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const ref = useRef<HTMLImageElement>(null)
  const { src, srcSet } = responsive(photo.src, widths)

  // Cached images can finish before React attaches onLoad.
  useEffect(() => {
    const img = ref.current
    if (img?.complete) setState(img.naturalWidth ? 'loaded' : 'error')
  }, [])

  return (
    <div className={`absolute inset-0 overflow-hidden ${state === 'loading' ? 'skeleton' : 'bg-surface-2'} ${className}`}>
      {state === 'error' ? (
        <div className="grid h-full place-items-center text-muted" role="img" aria-label={photo.alt}>
          <span className="text-[clamp(3rem,12vw,6rem)] font-semibold tracking-[-0.05em] opacity-40">{fallback}</span>
        </div>
      ) : (
        <img
          ref={ref}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={photo.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          // @ts-expect-error -- valid HTML attribute; React 18 types lag behind
          fetchpriority={priority ? 'high' : 'auto'}
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
          className={`h-full w-full object-cover ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          style={{ objectPosition: photo.focal ?? '50% 50%' }}
        />
      )}
    </div>
  )
}
