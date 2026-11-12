/** Estatísticas da página pública: 1 visita ao abrir + 1 clique por botão/link. Sem cookie e sem dado pessoal. */
/** De onde a pessoa veio. Ordem: link marcado (?s= / utm_source) → navegador interno do app → referrer → direto. */
export function detectSource(search: string, ua: string, referrer: string): string {
  const q = new URLSearchParams(search)
  const tagged = (q.get('s') || q.get('utm_source') || '').toLowerCase()
  if (tagged) return tagged === 'ig' ? 'instagram' : tagged === 'tt' ? 'tiktok' : tagged === 'wa' ? 'whatsapp' : tagged
  if (/Instagram/i.test(ua)) return 'instagram'
  if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return 'tiktok'
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook'
  if (/LinkedInApp/i.test(ua)) return 'linkedin'
  let host = ''
  try { host = new URL(referrer).hostname.replace(/^www\.|^m\.|^l\./, '') } catch { /* sem referrer */ }
  if (!host) return 'direto'
  const known: [RegExp, string][] = [[/instagram\.com/, 'instagram'], [/tiktok\.com/, 'tiktok'], [/facebook\.com|fb\.com/, 'facebook'],
    [/whatsapp\.com|wa\.me/, 'whatsapp'], [/google\./, 'google'], [/youtube\.com|youtu\.be/, 'youtube'], [/t\.co$|x\.com|twitter\.com/, 'x'], [/linkedin\.com|lnkd\.in/, 'linkedin']]
  return known.find(([re]) => re.test(host))?.[1] ?? 'outro'
}

/** Nome do clique pelo destino do link. Botões sem link (Pix, cupom) usam data-track. */
export function targetOf(href: string): string {
  if (href.startsWith('mailto:')) return 'email'
  if (href.startsWith('data:text/vcard')) return 'contato'
  let host = ''
  try { host = new URL(href, location.href).hostname.replace(/^www\.|^m\./, '') } catch { return 'link' }
  const known: [RegExp, string][] = [[/wa\.me|whatsapp\.com/, 'whatsapp'], [/instagram\.com/, 'instagram'], [/tiktok\.com/, 'tiktok'],
    [/youtube\.com|youtu\.be/, 'youtube'], [/pinterest\./, 'pinterest'], [/spotify\.com/, 'spotify'], [/x\.com|twitter\.com/, 'x'],
    [/waze\.com/, 'waze'], [/uber\.com/, 'uber'], [/google\.[^/]+$/, 'maps'], [/g\.page|search\.google/, 'avaliar']]
  return known.find(([re]) => re.test(host))?.[1] ?? 'link'
}

/** Liga o rastreamento (uma vez, só na página pública; nunca no preview do painel).
 *  `shown` = ids das ações do Conecta no cartão: base da taxa de clique de cada ação. */
export function startTracking(slug: string, shown: string[] = []) {
  const source = detectSource(location.search, navigator.userAgent, document.referrer)
  // text/plain: não dispara preflight de CORS; sendBeacon não se perde quando o clique troca de página.
  const send = (body: object) => {
    const blob = new Blob([JSON.stringify({ ...body, source })], { type: 'text/plain' })
    const url = `${import.meta.env.VITE_API_URL ?? ''}/api/v1/public/cards/${encodeURIComponent(slug)}/events`
    if (!navigator.sendBeacon?.(url, blob)) fetch(url, { method: 'POST', body: blob, keepalive: true }).catch(() => {})
  }
  send({ kind: 'view', shown })
  document.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-track], a[href]')
    if (!el) return
    const target = el.dataset.track ?? targetOf(el.getAttribute('href') ?? '')
    // data-action/data-interest: botões do Conecta (qual ação e, se veio de um, qual serviço).
    send({ kind: 'click', target, action: el.dataset.action, interest: el.dataset.interest })
  }, { capture: true })
  // Bloco que entrou na tela (metade visível), uma vez por visita. O React monta logo depois desta chamada.
  setTimeout(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return
      io.unobserve(en.target)
      send({ kind: 'section', target: (en.target as HTMLElement).dataset.trackSection })
    }), { threshold: 0.5 })
    document.querySelectorAll('[data-track-section]').forEach((el) => io.observe(el))
  }, 500)
}

/** Link do cartão marcado com a origem (QR impresso, botão compartilhar), para aparecer certo nas estatísticas. */
export const tagged = (url: string, s: string) => {
  try {
    const u = new URL(url)
    u.searchParams.set('s', s)
    return u.toString()
  } catch {
    return url
  }
}

export type Origin = { source: string; medium?: string; campaign?: string; content?: string; term?: string; ref?: string; page: string }
const ORIGIN_KEY = 'vorenme-origin'

/** De onde veio o lead (página inicial e cadastro). Fica no navegador: a 1ª visita grava; uma visita nova com
 *  marcação (utm, gclid, ?ref) substitui; visita sem marcação não apaga. `isNew` = 1ª visita deste navegador. */
export function captureOrigin(): { origin: Origin; isNew: boolean } {
  const q = new URLSearchParams(location.search)
  const get = (k: string) => q.get(k) || undefined
  let ref: string | undefined
  try { ref = new URL(document.referrer).hostname.replace(/^www\./, '') } catch { /* sem referrer */ }
  if (ref === location.hostname) ref = undefined
  const gclid = q.has('gclid')
  const now: Origin = {
    source: gclid && !q.get('utm_source') ? 'google' : detectSource(location.search, navigator.userAgent, ref ? document.referrer : ''),
    medium: get('utm_medium') ?? (gclid ? 'cpc' : undefined),
    campaign: get('utm_campaign'), content: get('utm_content'), term: get('utm_term'), ref,
    page: location.pathname.startsWith('/painel') ? '/painel' : '/',
  }
  const marked = gclid || ['s', 'ref', 'utm_source', 'utm_medium', 'utm_campaign'].some((k) => q.has(k))
  try {
    const saved = localStorage.getItem(ORIGIN_KEY)
    if (!saved || marked) localStorage.setItem(ORIGIN_KEY, JSON.stringify(now))
    return { origin: saved && !marked ? JSON.parse(saved) : now, isNew: !saved }
  } catch {
    return { origin: now, isNew: true }
  }
}

/** Estatísticas da página inicial: 1 visita ao abrir + 1 clique por botão "Testar grátis". */
export function trackSite() {
  const { origin, isNew } = captureOrigin()
  const send = (body: object) => {
    const blob = new Blob([JSON.stringify({ ...body, source: origin.source, medium: origin.medium, campaign: origin.campaign })], { type: 'text/plain' })
    const url = `${import.meta.env.VITE_API_URL ?? ''}/api/v1/public/site/events`
    if (!navigator.sendBeacon?.(url, blob)) fetch(url, { method: 'POST', body: blob, keepalive: true }).catch(() => {})
  }
  send({ kind: 'view', new: isNew })
  document.addEventListener('click', (e) => {
    if ((e.target as Element | null)?.closest('a[href^="/painel?cadastro"]')) send({ kind: 'cta' })
  }, { capture: true })
}
