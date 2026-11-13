import type { ConnectConfig, CreatorConfig, Platform, SocialLink } from '../config/types'

/** Itens ainda sendo preenchidos não vão para o servidor (ele recusaria); voltam a ir quando completos. */
const filled = (v?: string) => !!v?.trim()
/** "site.com" vira "https://site.com" (o servidor só aceita http(s) ou caminho local). */
const URL_FIELDS = new Set(['url', 'src', 'logo'])
const withScheme = (u: string) => (u.trim() && !/^([a-z][a-z0-9+.-]*:|\/)/i.test(u.trim()) ? `https://${u.trim()}` : u)
const fixUrls = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(fixUrls)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, URL_FIELDS.has(k) && typeof x === 'string' ? withScheme(x) : fixUrls(x)]))
      : v
/** Conecta: ações e serviços pela metade ficam de fora; serviço sem ação válida também. */
const connectForSave = (k: ConnectConfig): ConnectConfig => {
  const actions = k.actions
    .filter((a) => filled(a.label) && (a.channel !== 'link' || filled(a.url)) && (a.channel !== 'phone' || /^\d{10,15}$/.test(a.phone ?? '')))
    .map((a) => ({ ...a, message: a.message?.trim() || undefined }))
  const ids = actions.map((a) => a.id)
  return {
    ...k, title: k.title?.trim() || undefined, audience: k.audience?.trim() || undefined, actions,
    services: k.services?.filter((s) => filled(s.name) && ids.includes(s.action)).map((s) => ({ ...s, description: s.description?.trim() || undefined })),
  }
}

export const forSave = (c: CreatorConfig): CreatorConfig => fixUrls({
  ...c,
  photo: { ...c.photo, alt: c.photo.alt.trim() || `${c.name.first} ${c.name.last}`.trim() || 'Foto' },
  address: c.address && { ...c.address, hours: c.address.hours?.filter((h) => filled(h.days) && filled(h.time)) },
  socials: c.socials.filter((s) => filled(s.handle) && filled(s.url)),
  featured: c.featured && filled(c.featured.title) && filled(c.featured.url) && filled(c.featured.image.src) ? c.featured : undefined,
  now: c.now && filled(c.now.title) && filled(c.now.text) ? c.now : undefined,
  brands: c.brands?.filter((b) => filled(b.name)),
  coupons: c.coupons?.filter((k) => filled(k.brand) && filled(k.code)),
  connect: c.connect && connectForSave(c.connect),
  // Texto vazio e imagem sem link não vão (o servidor recusaria).
  extras: c.extras?.filter((x) => x.kind === 'shape' || (x.kind === 'text' ? filled(x.text) : filled(x.src))),
}) as CreatorConfig
export const SLUG = /^[a-z0-9][a-z0-9._-]{2,30}$/
/** "Dra. Inês Côrtes" -> "dra.inescortes" (tira acentos e o que o endereço não aceita). */
export const toSlug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 31)

/** "(11) 98765-4321" -> "5511987654321". Sem o 55 (10-11 dígitos), coloca. */
export const waNumber = (raw: string) => {
  const d = raw.replace(/\D/g, '')
  return d.length === 10 || d.length === 11 ? `55${d}` : d
}

/** Um campo só: "@fulana", "fulana" ou o link colado. Devolve o @ e o link do perfil. */
const PROFILE: Partial<Record<Platform, (h: string) => string>> = {
  instagram: (h) => `https://instagram.com/${h}`,
  tiktok: (h) => `https://tiktok.com/@${h}`,
  youtube: (h) => `https://youtube.com/@${h}`,
  pinterest: (h) => `https://pinterest.com/${h}`,
  x: (h) => `https://x.com/${h}`,
}
export const socialFrom = (platform: Platform, text: string): Pick<SocialLink, 'handle' | 'url'> => {
  const t = text.trim()
  if (!t) return { handle: '', url: '' }
  if (/^https?:\/\//i.test(t) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(t)) {
    const host = t.replace(/^https?:\/\/(www\.)?/i, '').replace(/[?#].*$/, '').replace(/\/$/, '')
    const last = host.split('/').pop()!.replace(/^@/, '')
    return { handle: platform === 'website' || !host.includes('/') ? host : `@${last}`, url: t }
  }
  const h = t.replace(/^@/, '')
  return { handle: platform === 'website' ? h : `@${h}`, url: PROFILE[platform]?.(h) ?? '' }
}
/** O que o campo mostra: o @ quando o link é o do perfil padrão; senão o link que a pessoa colou. */
export const socialText = (s: SocialLink) =>
  PROFILE[s.platform] && s.url === PROFILE[s.platform]!(s.handle.replace(/^@/, '')) ? s.handle : s.url || s.handle
