# vorenMe_app

A digital business card for creators. React + TypeScript + Tailwind v4 + Vite.

- **The card**: photo, name, niche, handle and city as a physical-feeling card (tilts with the mouse on desktop, stays pinned while the page scrolls).
- **Salvar contato**: downloads a `.vcf` so visitors add the creator to their phone contacts in one tap.
- **Compartilhar**: native share sheet on phones, copies the link elsewhere.
- **QR code**: full-screen on mobile (show it in person), a tile on desktop (open the card on your phone).
- Social tiles, featured video, partnerships with WhatsApp/e-mail, "Agora" (current project), optional brand logos.

## Personalize

Edit **one file**: `src/config/creator.ts`. Every demo value is marked `// REPLACE`.

- **Photos**: any URL or a file in `public/` (e.g. `src: '/portrait.jpg'`). Unsplash URLs get an automatic `srcset`.
  `focal` sets the crop focus (`'50% 25%'`).
- **Accent**: any hex. Text on the accent automatically switches between dark and white for contrast.
- **Theme**: `'dark'` or `'light'` sets the default. Visitors can toggle it (saved per browser); `?theme=light` forces it for previews.
- **WhatsApp**: `number` in international format, digits only (e.g. `5511987654321`). It becomes a `wa.me` link with your pre-filled message.
- **Optional sections**: `featured`, `now`, `brands`, `website`, `availability`, `location`, and `whatsapp`/`email` can be removed. The layout and card numbering adjust.
- **Follower counts / brands**: leave them out unless the numbers and partnerships are real. Brands accept a `logo` URL (SVG/PNG).
- **SEO / link previews**: set `seo.title`, `seo.description`, `seo.ogImage` (1200×630) and `seo.siteUrl`. These are written into the HTML at build time.
  `seo.siteUrl` is also what the QR code, the Share button and the saved contact point to. Set it once the page is deployed.
- **Voren credit**: `footer.showVoren`, `footer.vorenUrl`, `footer.vorenLabel`.

## Run

```bash
npm install --no-bin-links   # --no-bin-links needed on exFAT drives
npm run dev                  # local dev server
npm run build                # type-check + production build → dist/
npm run preview              # serve dist/
```

`dist/` is a static site. Deploy it to Vercel, Netlify, Cloudflare Pages or any static host.
