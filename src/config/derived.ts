import { creator } from './creator'
import { mailtoLink, waLink } from '../lib/links'

export let fullName = ''
export let initials = ''
export let whatsappHref: string | undefined
export let emailHref: string | undefined

/** Recalcula os valores derivados do cartão atual (chamado de novo quando o painel envia alterações). */
export function refreshDerived() {
  fullName = `${creator.name.first} ${creator.name.last}`.trim()
  initials = `${creator.name.first[0] ?? ''}${creator.name.last[0] ?? ''}`
  whatsappHref = creator.whatsapp ? waLink(creator.whatsapp.number, creator.whatsapp.message) : undefined
  emailHref = creator.email ? mailtoLink(creator.email.address, creator.email.subject, creator.email.body) : undefined
}
refreshDerived()

/** Public URL of this card: configured canonical URL, else the current page without query/hash. */
export const pageUrl = () =>
  creator.seo.siteUrl ?? (typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : '')
