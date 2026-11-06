import type { CreatorConfig } from './types'

/**
 * ────────────────────────────────────────────────────────────────────────────
 *  CREATOR CONFIG: this is the only file you need to edit.
 *
 *  Everything below is DEMO content for a fictional creator.
 *  Every line marked  // REPLACE  must be swapped for the real creator's data
 *  before publishing. Optional sections can be deleted and the page adapts.
 * ────────────────────────────────────────────────────────────────────────────
 */

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`

/** Demo usado quando a página abre sem slug (dev). */
export const demo: CreatorConfig = {
  name: { first: 'Luana', last: 'Ferraz' }, // REPLACE
  username: 'luanaferraz.fit', // REPLACE (without @)
  photo: {
    src: unsplash('1550345332-09e3ac987658'), // REPLACE with a real portrait (vertical, min. 1200px wide)
    alt: 'Luana Ferraz em foto preto e branco na academia, entre séries de treino', // REPLACE
    focal: '42% 28%',
  },
  bio: 'Treino possível para a vida real. Força, constância e zero culpa, sem promessa milagrosa.', // REPLACE
  niche: 'Fitness & treino de força', // REPLACE
  location: 'Rio de Janeiro', // REPLACE or delete

  accent: '#E8552B', // REPLACE with the creator's brand color
  theme: 'dark', // 'dark' | 'light'

  availability: { open: true, label: 'Agenda aberta para collabs em 2026' }, // REPLACE or delete

  // REPLACE every URL/handle. `followers` is optional: only add real numbers.
  socials: [
    { platform: 'instagram', handle: '@luanaferraz.fit', url: 'https://instagram.com/luanaferraz.fit' },
    { platform: 'tiktok', handle: '@luanaferraz.fit', url: 'https://www.tiktok.com/@luanaferraz.fit' },
    { platform: 'youtube', handle: '@luanaferraz', url: 'https://www.youtube.com/@luanaferraz' },
    { platform: 'spotify', handle: 'Playlists de treino', url: 'https://open.spotify.com/user/luanaferraz' },
  ],

  featured: {
    title: 'Força do zero: meu treino de costas e ombros', // REPLACE
    platform: 'youtube',
    url: 'https://www.youtube.com/@luanaferraz', // REPLACE with the video URL
    kind: 'video',
    image: {
      src: unsplash('1541534741688-6078c6bfb5c5'), // REPLACE with the video thumbnail
      alt: 'Mulher de costas segurando uma barra com anilhas na academia', // REPLACE
      focal: '50% 40%',
    },
  },

  whatsapp: {
    number: '5511900000000', // REPLACE: digits only, with country code (55) and area code
    display: '+55 11 90000-0000', // REPLACE
    message: 'Oi, Luana! Vim pelo seu cartão digital e gostaria de conversar sobre uma parceria.', // REPLACE
  },
  email: {
    address: 'parcerias@example.com', // REPLACE
    subject: 'Proposta de parceria',
    body: 'Olá, Luana!\n\nSou da marca ___ e gostaria de conversar sobre:\n\n',
  },

  partnership: {
    title: 'Bora construir algo juntos.',
    text: 'Campanhas para marcas de esporte, nutrição e bem-estar. Conte sua ideia e eu respondo em até 48h.', // REPLACE
    formats: ['Reels', 'TikTok', 'YouTube', 'UGC', 'Eventos'], // REPLACE or delete
  },

  now: {
    title: 'Agora',
    text: 'Desafio de 30 dias de força para iniciantes. Um treino curto por dia, sem precisar de academia.', // REPLACE
    interests: ['Musculação', 'Corrida de rua', 'Mobilidade', 'Comida de verdade'], // REPLACE
  },

  // REPLACE or delete: real codes from partner brands.
  coupons: [
    { brand: 'Growth Supplements', code: 'LUANA15', discount: '15% OFF', url: 'https://example.com' },
    { brand: 'Insider Store', code: 'LUFERRAZ', discount: 'Frete grátis' },
  ],

  // Only list brands the creator has ACTUALLY worked with. Empty = section hidden.
  brands: [],

  website: { label: 'luanaferraz.com.br', url: 'https://example.com' }, // REPLACE or delete

  footer: {
    showVoren: true,
    vorenUrl: undefined, // e.g. 'https://voren.studio' (REPLACE with Voren's real URL)
    vorenLabel: 'Digital presence crafted by Voren',
  },

  seo: {
    title: 'Luana Ferraz | Fitness & treino de força', // REPLACE
    description: 'Criadora de conteúdo fitness no Rio de Janeiro: treino de força possível para a vida real. Redes, conteúdos e contato para parcerias.', // REPLACE
    ogImage: `${unsplash('1550345332-09e3ac987658')}?w=1200&h=630&fit=crop&crop=faces&q=80&fm=jpg`, // REPLACE
    siteUrl: undefined, // REPLACE with the deployed URL, e.g. 'https://luanaferraz.com.br'
    locale: 'pt_BR',
  },

  labels: {
    socials: 'Redes sociais',
    featured: 'Em destaque',
    now: 'Agora',
    brands: 'Marcas parceiras',
    whatsapp: 'WhatsApp',
    email: 'E-mail',
    saveContact: 'Salvar contato',
    share: 'Compartilhar',
    linkCopied: 'Link copiado',
    showQr: 'Mostrar QR code',
    close: 'Fechar',
    qrTitle: 'Leve este cartão',
    qrText: 'Escaneie com a câmera do celular para abrir esta página.',
    watchOn: 'Assistir no',
    openOn: 'Abrir no',
    themeToLight: 'Mudar para tema claro',
    themeToDark: 'Mudar para tema escuro',
    followers: 'seguidores',
    copyEmail: 'Copiar e-mail',
    copied: 'E-mail copiado',
  },
}

/** Cartão vindo da API (main.tsx põe em globalThis.__CARD__ antes de importar o App), ou o demo. */
export let creator: CreatorConfig = (globalThis as { __CARD__?: CreatorConfig }).__CARD__ ?? demo

/** Troca o cartão em memória (pré-visualização ao vivo do painel). `export let` propaga para todos os imports. */
export const setCreator = (c: CreatorConfig) => {
  creator = c
}
