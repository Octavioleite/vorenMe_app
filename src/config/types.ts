/** Textos sobre a foto que a pessoa pode mover e redimensionar (photo.layout). */
export const TEXT_IDS = ['first', 'last', 'niche', 'username', 'location'] as const
export type TextId = (typeof TEXT_IDS)[number]
/** x/y em % (0 = esquerda/topo, 100 = direita/base); size em px. Campo vazio = padrão do modelo. */
export interface TextLayout { x?: number; y?: number; size?: number }
export const TEXT_SIZE = { min: 8, max: 200 }

export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'pinterest' | 'spotify' | 'x' | 'website'

export type Theme = 'dark' | 'light'

/** Personalidade visual do cartão: fonte de destaque, formas, moldura da foto e textura (index.css, [data-style]). */
export const STYLES = ['criador', 'forte', 'tinta', 'atelie', 'sereno', 'glam', 'clinica', 'leve', 'simples'] as const
export type Style = (typeof STYLES)[number]

export interface Photo {
  /** Absolute URL or a path in /public (e.g. "/luana.jpg"). Unsplash URLs get automatic srcset. */
  src: string
  alt: string
  /** CSS object-position, e.g. "50% 30%". Controls the crop focus. */
  focal?: string
  /** Posição e tamanho de cada texto sobre a foto. Vazio = padrão do modelo. */
  layout?: Partial<Record<TextId, TextLayout>>
}

export interface SocialLink {
  platform: Platform
  /** Label shown on the tile. Defaults to the platform name. */
  label?: string
  handle: string
  url: string
  /** Real follower count as display text ("128 mil"). Leave undefined to hide. */
  followers?: string
}

export interface FeaturedContent {
  title: string
  platform: Platform
  url: string
  image: Photo
  /** Shows a play affordance when "video". */
  kind: 'video' | 'post' | 'project'
}

export interface Coupon {
  brand: string
  code: string
  /** Short display text, e.g. "15% OFF" or "Frete grátis". */
  discount?: string
  /** Store link where the code is used. */
  url?: string
}

/** Conecta: objetivo do cartão e as ações do visitante (validado em vorenMe_api/src/dto/card/config.js). */
export const GOALS = ['clientes', 'orcamento', 'agendamento', 'parcerias', 'vendas', 'contatos'] as const
export type Goal = (typeof GOALS)[number]
export type Channel = 'whatsapp' | 'form' | 'phone' | 'email' | 'link'

export interface ConnectAction {
  /** Curto e estável: identifica a ação nas estatísticas. */
  id: string
  /** Texto do botão, ex: "Solicitar avaliação". */
  label: string
  channel: Channel
  /** WhatsApp: mensagem pronta (aceita {servico}). E-mail: corpo do e-mail. */
  message?: string
  /** Só números, com DDD (channel "phone"). */
  phone?: string
  /** channel "link". */
  url?: string
}

export interface ConnectService {
  id: string
  name: string
  description?: string
  /** id da ação que este serviço abre. */
  action: string
}

export interface ConnectConfig {
  goal: Goal
  /** Título do bloco no cartão. Vazio = título padrão do objetivo. */
  title?: string
  /** Para quem é, ex: "Pacientes que querem um sorriso mais claro". */
  audience?: string
  /** Em ordem de prioridade: a primeira é a ação principal. */
  actions: ConnectAction[]
  services?: ConnectService[]
}

export interface CreatorConfig {
  name: { first: string; last: string }
  username: string
  photo: Photo
  /** One or two short sentences, max ~20 words. */
  bio: string
  niche: string
  location?: string

  /** Brand accent as hex (#RRGGBB). Text on the accent picks dark or white automatically. */
  accent: string
  theme: Theme
  /** Sem valor = 'criador'. */
  style?: Style

  availability?: { open: boolean; label: string }

  socials: SocialLink[]
  featured?: FeaturedContent

  whatsapp?: {
    /** International format, digits only, no "+" (e.g. 5511987654321). */
    number: string
    /** Pre-filled message the visitor will send. */
    message?: string
    /** Human-readable version shown on the page. */
    display?: string
  }
  email?: { address: string; subject?: string; body?: string }

  partnership: {
    title: string
    text: string
    /** Optional pills, e.g. formats you offer. */
    formats?: string[]
  }

  now?: {
    title: string
    text: string
    url?: string
    interests?: string[]
  }

  /** Discount codes from partner brands. Hidden when empty. */
  coupons?: Coupon[]

  /** Only list brands you have actually worked with. Hidden when empty. `logo` = SVG/PNG URL. */
  brands?: { name: string; url?: string; logo?: string }[]

  /** Pix: botão para copiar a chave e o "copia e cola" (BR Code), com QR. Limites do BR Code: nome 25, cidade 15. */
  pix?: { key: string; name: string; city: string }

  /** Endereço do negócio: abre no Google Maps, Waze ou Uber. */
  /** geo: veio de "Usar minha localização"; os links de rota usam o ponto exato. */
  address?: { text: string; geo?: { lat: number; lng: number }; hours?: { days: string; time: string }[] }

  /** Link de avaliação do Google (Perfil da Empresa → Pedir avaliações). */
  review?: { url: string }

  /** Conecta: ações do visitante. Sem valor = desligado. */
  connect?: ConnectConfig

  /** Main personal website: footer + saved contact. */
  website?: { label: string; url: string }

  footer: {
    showVoren: boolean
    vorenUrl?: string
    vorenLabel?: string
  }

  seo: {
    title: string
    description: string
    /** Absolute URL of a 1200×630 image for link previews. */
    ogImage?: string
    /** Canonical URL of the deployed page. Also used by the QR code and Share button. */
    siteUrl?: string
    locale: string
  }

  labels: {
    socials: string
    featured: string
    now: string
    brands: string
    whatsapp: string
    email: string
    saveContact: string
    share: string
    linkCopied: string
    showQr: string
    close: string
    qrTitle: string
    qrText: string
    watchOn: string
    openOn: string
    themeToLight: string
    themeToDark: string
    followers: string
    copyEmail: string
    copied: string
  }
}
