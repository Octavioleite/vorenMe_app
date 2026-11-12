import { creator } from './creator'
import { actionHref, mailtoLink, waLink } from '../lib/links'
import type { ConnectAction } from './types'

export let fullName = ''
export let initials = ''
export let whatsappHref: string | undefined
export let emailHref: string | undefined
/** Ação principal do Conecta quando ela é um link (formulário abre só no bloco): vira o botão do topo e da barra do celular. */
export let connectPrimary: { action: ConnectAction; href: string } | undefined

/** Recalcula os valores derivados do cartão atual (chamado de novo quando o painel envia alterações). */
export function refreshDerived() {
  fullName = `${creator.name.first} ${creator.name.last}`.trim()
  initials = `${creator.name.first[0] ?? ''}${creator.name.last[0] ?? ''}`
  whatsappHref = creator.whatsapp ? waLink(creator.whatsapp.number, creator.whatsapp.message) : undefined
  emailHref = creator.email ? mailtoLink(creator.email.address, creator.email.subject, creator.email.body) : undefined
  const main = creator.connect?.actions[0]
  const href = main && actionHref(main, creator)
  connectPrimary = main && href ? { action: main, href } : undefined
}
refreshDerived()

/** Public URL of this card: configured canonical URL, else the current page without query/hash. */
export const pageUrl = () =>
  creator.seo.siteUrl ?? (typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : '')
