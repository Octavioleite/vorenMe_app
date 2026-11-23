declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

/** Evento padrão do Meta Pixel (o script está no index.html). Sem o script (bloqueador, dev) não faz nada. */
export const trackPixel = (event: string) => {
  try {
    window.fbq?.('track', event)
  } catch {
    /* pixel indisponível */
  }
}
