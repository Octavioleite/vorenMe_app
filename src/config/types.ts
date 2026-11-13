/** Textos sobre a foto que a pessoa pode mover e redimensionar (photo.layout). */
export const TEXT_IDS = ['first', 'last', 'niche', 'username', 'location'] as const
export type TextId = (typeof TEXT_IDS)[number]
/** Fontes que a pessoa escolhe por texto (já carregadas em main.tsx/index.css). Espelhado em vorenMe_api/src/dto/card/config.js. */
export const FONTS = {
  geist: ['Geist', "'Geist Variable', sans-serif"],
  oswald: ['Oswald', "'Oswald Variable', sans-serif"],
  syne: ['Syne', "'Syne Variable', sans-serif"],
  fredoka: ['Fredoka', "'Fredoka Variable', sans-serif"],
  playfair: ['Playfair', "'Playfair Display Variable', serif"],
  dmserif: ['DM Serif', "'DM Serif Display', serif"],
} as const
export type FontId = keyof typeof FONTS
/** x/y em % (0 = esquerda/topo, 100 = direita/base); size em px. Campo vazio = padrão do modelo.
 *  font/color valem para celular e computador juntos (o editor grava nos dois). */
export interface TextLayout { x?: number; y?: number; size?: number; hidden?: true; font?: FontId; color?: string }
export const TEXT_SIZE = { min: 8, max: 200 }

/** Elemento solto sobre a foto (como no Canva): texto, forma ou imagem. x/y em % (como TextLayout);
 *  size em % da largura do cartão (fonte do texto, largura da forma/imagem), então fica igual em qualquer tela.
 *  ratio = largura/altura (forma e imagem). Espelhado em vorenMe_api/src/dto/card/config.js. */
export const EXTRA_KINDS = ['text', 'shape', 'image'] as const
export interface Extra {
  id: string
  kind: (typeof EXTRA_KINDS)[number]
  x: number; y: number; size: number
  text?: string; src?: string; font?: FontId; color?: string; round?: true; ratio?: number
}
export const EXTRA_SIZE = { min: 2, max: 100 }
export const MAX_EXTRAS = 12
/** Abaixo disto o cartão usa o ajuste de textos do celular (mesmo corte do md: do Tailwind). */
export const MOBILE_QUERY = '(max-width: 767.98px)'
/** Ajuste de textos que vale na tela atual. */
export const textLayout = (p: { layout?: Photo['layout']; layoutMobile?: Photo['layout'] }, mobile: boolean) =>
  (mobile ? p.layoutMobile ?? p.layout : p.layout) ?? {}

export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'pinterest' | 'spotify' | 'x' | 'website'

export type Theme = 'dark' | 'light'

/** Personalidade visual do cartão: fonte de destaque, formas, moldura da foto e textura (index.css, [data-style]). */
export const STYLES = ['criador', 'forte', 'tinta', 'atelie', 'sereno', 'glam', 'clinica', 'leve', 'sobrio', 'palco', 'oficio', 'galeria', 'simples'] as const
export type Style = (typeof STYLES)[number]

export interface Photo {
  /** Absolute URL or a path in /public (e.g. "/luana.jpg"). Unsplash URLs get automatic srcset. */
  src: string
  alt: string
  /** CSS object-position, e.g. "50% 30%". Controls the crop focus. */
  focal?: string
  /** Aproximação sobre o enquadramento (1 = preenche a área, até 3). */
  zoom?: number
  /** 'contain' = mostra a foto inteira, sem cortar. */
  fit?: 'contain'
  /** Posição e tamanho de cada texto sobre a foto em tablet e computador (768px ou mais). Vazio = padrão do modelo. */
  layout?: Partial<Record<TextId, TextLayout>>
  /** O mesmo para o celular (abaixo de 768px). Ausente = usa `layout` (cartões de antes da separação); {} = padrão do modelo. */
  layoutMobile?: Partial<Record<TextId, TextLayout>>
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

  /** Ordem dos blocos no cartão (arrastada no painel). Sem valor = ordem padrão de cada estilo. */
  order?: BlockId[]
  /** Largura de cada bloco: 'half' divide a linha com outro, 'full' ocupa a linha toda. Sem valor = a do estilo. */
  width?: Partial<Record<BlockId, 'half' | 'full'>>
  /** Elementos soltos sobre a foto, na ordem de camada (o último fica por cima). */
  extras?: Extra[]

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

/** Blocos que a pessoa reordena no painel → classe do bloco no cartão (App.tsx). Conecta fica sempre em 1º. Espelhado em vorenMe_api/src/dto/card/config.js. */
export const CARD_BLOCKS = {
  redes: 't-social', destaque: 't-featured', local: 't-local', pix: 't-pix',
  cupons: 't-coupons', chamada: 't-pship', extra: 't-now', marcas: 't-brands',
} as const
export type BlockId = keyof typeof CARD_BLOCKS
/** Ordem salva + blocos que faltarem no fim (ids desconhecidos e repetidos caem fora). */
export const blockOrder = (c: { order?: string[] }): BlockId[] =>
  [...new Set([...(c.order ?? []), ...Object.keys(CARD_BLOCKS)])].filter((k): k is BlockId => k in CARD_BLOCKS)
