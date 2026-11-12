import type { CSSProperties } from 'react'
const isUnsplash = (src: string) => src.startsWith('https://images.unsplash.com/')

const withWidth = (src: string, w: number) =>
  `${src}${src.includes('?') ? '&' : '?'}w=${w}&q=78&auto=format&fit=crop`

/** Returns src/srcSet for an image. Unsplash URLs get a width ladder; anything else passes through. */
export const responsive = (src: string, widths: number[]) => {
  if (!isUnsplash(src)) return { src }
  return {
    src: withWidth(src, widths[Math.floor(widths.length / 2)]),
    srcSet: widths.map((w) => `${withWidth(src, w)} ${w}w`).join(', '),
  }
}

/** Enquadramento salvo na foto (focal + zoom + foto inteira) como estilo do <img>. `scale` soma com o transform do hover. */
export const photoStyle = (p: { focal?: string; zoom?: number; fit?: 'contain' }, fallback = '50% 50%'): CSSProperties => ({
  objectPosition: p.focal ?? fallback,
  objectFit: p.fit ?? 'cover',
  ...(p.zoom && p.zoom !== 1 && { scale: String(p.zoom), transformOrigin: p.focal ?? fallback }),
})
