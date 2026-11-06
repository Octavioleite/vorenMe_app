export const waLink = (number: string, message?: string) =>
  `https://wa.me/${number.replace(/\D/g, '')}${message ? `?text=${encodeURIComponent(message)}` : ''}`

export const mailtoLink = (address: string, subject?: string, body?: string) => {
  const params = new URLSearchParams()
  if (subject) params.set('subject', subject)
  if (body) params.set('body', body)
  // URLSearchParams encodes spaces as "+", which mail clients show literally.
  const qs = params.toString().replace(/\+/g, '%20')
  return `mailto:${address}${qs ? `?${qs}` : ''}`
}
