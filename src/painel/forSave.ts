import type { CreatorConfig } from '../config/types'

/** Itens ainda sendo preenchidos não vão para o servidor (ele recusaria); voltam a ir quando completos. */
const filled = (v?: string) => !!v?.trim()
/** "site.com" vira "https://site.com" (o servidor só aceita http(s) ou caminho local). */
const URL_FIELDS = new Set(['url', 'src', 'logo'])
const withScheme = (u: string) => (u.trim() && !/^([a-z][a-z0-9+.-]*:|\/)/i.test(u.trim()) ? `https://${u.trim()}` : u)
const fixUrls = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(fixUrls)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, URL_FIELDS.has(k) && typeof x === 'string' ? withScheme(x) : fixUrls(x)]))
      : v
export const forSave = (c: CreatorConfig): CreatorConfig => fixUrls({
  ...c,
  photo: { ...c.photo, alt: c.photo.alt.trim() || `${c.name.first} ${c.name.last}`.trim() || 'Foto' },
  address: c.address && { ...c.address, hours: c.address.hours?.filter((h) => filled(h.days) && filled(h.time)) },
  socials: c.socials.filter((s) => filled(s.handle) && filled(s.url)),
  featured: c.featured && filled(c.featured.title) && filled(c.featured.url) && filled(c.featured.image.src) ? c.featured : undefined,
  now: c.now && filled(c.now.title) && filled(c.now.text) ? c.now : undefined,
  brands: c.brands?.filter((b) => filled(b.name)),
  coupons: c.coupons?.filter((k) => filled(k.brand) && filled(k.code)),
}) as CreatorConfig
export const SLUG = /^[a-z0-9][a-z0-9._-]{2,30}$/
/** "Dra. Inês Côrtes" -> "dra.inescortes" (tira acentos e o que o endereço não aceita). */
export const toSlug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 31)
