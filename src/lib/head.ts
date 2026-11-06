import type { CreatorConfig, Theme } from '../config/types'
import { THEME_COLOR, accentForeground } from './color'

/** Preferência de tema por cartão (todos os cartões dividem a mesma origem). */
export const themeKey = (username: string) => `cc-theme:${username}`

const meta = (name: string, content: string) => {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}

/** Aplica título, tema e cor do cartão antes do primeiro render.
 *  ponytail: só em runtime — crawlers (preview no WhatsApp) não veem; edge function com OG quando a hospedagem existir. */
export function applyHead(c: CreatorConfig, keepTheme = false) {
  const d = document.documentElement
  const ok = (v: unknown): v is Theme => v === 'dark' || v === 'light'
  let theme: Theme = keepTheme && ok(d.dataset.theme) ? d.dataset.theme : c.theme
  const q = new URLSearchParams(location.search)
  // No preview do painel vale o tema do cartão, não a preferência salva do visitante.
  if (!keepTheme && !q.has('preview')) try {
    const saved = localStorage.getItem(themeKey(c.username))
    if (ok(saved)) theme = saved
  } catch {
    /* storage indisponível */
  }
  const forced = q.get('theme')
  if (!keepTheme && ok(forced)) theme = forced

  d.dataset.theme = theme
  d.lang = c.seo.locale.replace('_', '-')
  d.style.setProperty('--accent', c.accent)
  d.style.setProperty('--accent-fg', accentForeground(c.accent))
  document.title = c.seo.title
  meta('description', c.seo.description)
  meta('theme-color', THEME_COLOR[theme])
  if ('IntersectionObserver' in window && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    d.classList.add('reveal-ready')
  }
}
