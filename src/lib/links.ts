import type { ConnectAction, ConnectService, CreatorConfig } from '../config/types'
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


/** Mensagem da ação. Vinda de um serviço: {servico} vira o nome dele; sem {servico}, o nome vai no fim. */
export function actionMessage(a: ConnectAction, service?: ConnectService) {
  const base = a.message?.trim() || `Olá! Encontrei seu cartão no VorenMe e tenho interesse em: ${a.label}.`
  if (!service) return base.replace(/\s*\{servico\}/g, '')
  return base.includes('{servico}') ? base.replace(/\{servico\}/g, service.name) : `${base} Interesse: ${service.name}.`
}

/** Para onde o botão leva. Formulário não tem link (abre o diálogo na página). */
export function actionHref(a: ConnectAction, c: Pick<CreatorConfig, 'whatsapp' | 'email'>, service?: ConnectService): string | undefined {
  switch (a.channel) {
    case 'whatsapp': return c.whatsapp && waLink(c.whatsapp.number, actionMessage(a, service))
    case 'email': return c.email && mailtoLink(c.email.address, service ? `${a.label}: ${service.name}` : a.label, a.message && actionMessage(a, service))
    case 'phone': return a.phone && `tel:+${a.phone.length <= 11 ? `55${a.phone}` : a.phone}`
    case 'link': return a.url
    default: return undefined
  }
}

/** Nome do clique nas estatísticas (TARGETS em vorenMe_api/src/service/stats.service.js). */
export const CHANNEL_TARGET = { whatsapp: 'whatsapp', email: 'email', phone: 'telefone', link: 'link', form: 'formulario' } as const
