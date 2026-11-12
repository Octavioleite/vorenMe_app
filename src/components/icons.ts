import {
  Envelope,
  GlobeSimple,
  LinkSimple,
  NotePencil,
  Phone,
  WhatsappLogo,
  InstagramLogo,
  PinterestLogo,
  SpotifyLogo,
  TiktokLogo,
  XLogo,
  YoutubeLogo,
  type Icon,
} from '@phosphor-icons/react'
import type { Channel, Platform } from '../config/types'

/** `brand` is decorative only (hover wash / watermark), never used for text or CTAs. */
export const platformMeta: Record<Platform, { name: string; Icon: Icon; brand: string }> = {
  instagram: { name: 'Instagram', Icon: InstagramLogo, brand: '#E1306C' },
  tiktok: { name: 'TikTok', Icon: TiktokLogo, brand: '#25F4EE' },
  youtube: { name: 'YouTube', Icon: YoutubeLogo, brand: '#FF0033' },
  pinterest: { name: 'Pinterest', Icon: PinterestLogo, brand: '#E60023' },
  spotify: { name: 'Spotify', Icon: SpotifyLogo, brand: '#1ED760' },
  x: { name: 'X', Icon: XLogo, brand: 'var(--ink)' },
  website: { name: 'Site', Icon: GlobeSimple, brand: 'var(--accent)' },
}

/** Ícone de cada destino de ação do Conecta (cartão e painel). */
export const CHANNEL_ICON: Record<Channel, Icon> = { whatsapp: WhatsappLogo, form: NotePencil, phone: Phone, email: Envelope, link: LinkSimple }
