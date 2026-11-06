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
