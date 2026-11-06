const toRgb = (hex: string) => {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const INK = '#121214'
const WHITE = '#FAFAF9'

/** Picks near-black or near-white text for the accent, whichever has more contrast. */
export const accentForeground = (hex: string) => {
  const L = luminance(hex)
  const onInk = (L + 0.05) / (luminance(INK) + 0.05)
  const onWhite = (luminance(WHITE) + 0.05) / (L + 0.05)
  return onInk >= onWhite ? INK : WHITE
}

export const THEME_COLOR = { dark: '#0D0D0E', light: '#EDEDEB' } as const
