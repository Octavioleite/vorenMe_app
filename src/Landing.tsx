import { ArrowRight, Check, DeviceMobile, List, PaintBrush, Plus, ShareNetwork, UserPlus, WhatsappLogo, X } from '@phosphor-icons/react'
import { StrictMode, useEffect, useState, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import { QrCode } from './components/QrCode'
import type { CreatorConfig } from './config/types'
import { responsive } from './lib/img'
import { useReveal } from './lib/motion'
import './landing.css'

/** Página inicial (sem slug): institucional + venda do plano único. Os aparelhos e a vitrine usam os modelos reais (GET /templates é público). */
type Template = { id: string; name: string; config: CreatorConfig }
type Device = 'desktop' | 'tablet' | 'phone'

const API = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`
const LOGIN = '/painel'
const SIGNUP = '/painel?cadastro=1&utm_source=home'
const CTA = 'Testar 3 dias grátis'
const WRAP = 'mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10'
const H2 = 'text-[34px] leading-[1.05] font-semibold tracking-[-0.045em] text-balance md:text-[56px]'

const i = (n: number) => ({ '--i': n }) as CSSProperties
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const focal = (t: Template) => ({ objectPosition: t.config.photo.focal ?? '50% 30%' })

/** Texto legível sobre a cor de destaque do modelo. */
const onAccent = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16)
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.6 ? '#121214' : '#ffffff'
}

const PAPER = ['Some na gaveta ou no lixo', 'Acaba e precisa reimprimir', 'Não leva ao seu WhatsApp', 'Mudou o número? Joga tudo fora']
const VOREN = ['Fica salvo na agenda do cliente', 'Atualiza na hora, sem custo', 'WhatsApp e redes a um toque', 'Mesmo link para sempre']

const STEPS = [
  { Icon: PaintBrush, title: 'Escolha um modelo', text: 'Barbearia, estética, advocacia, loja e muito mais.' },
  { Icon: DeviceMobile, title: 'Troque foto e textos', text: 'Edite pelo celular e veja o resultado na hora.' },
  { Icon: ShareNetwork, title: 'Compartilhe o link', text: 'No WhatsApp, na bio e no QR code impresso.' },
]

const INCLUDED = [
  '3 cartões virtuais por conta',
  'Links ilimitados em cada cartão',
  'Personalização de cada cartão',
  'Todos os modelos e estilos',
  'Botão de salvar contato na agenda',
  'QR code pronto para imprimir',
]

const LINKS = ['WhatsApp', 'Instagram', 'Agendamento', 'Cardápio', 'Localização']

const FAQ = [
  { q: 'Como funcionam os 3 dias grátis?', a: 'Você cria a conta e usa tudo liberado por 3 dias. Se não gostar, é só cancelar antes do fim do teste e nada é cobrado.' },
  { q: 'Tem fidelidade ou multa?', a: 'Não. O plano é mensal e você cancela quando quiser pelo próprio painel.' },
  { q: 'Preciso instalar algum aplicativo?', a: 'Não. Seu cartão abre no navegador de qualquer celular, e quem recebe também não precisa instalar nada.' },
  { q: 'Consigo mudar o cartão depois?', a: 'Sim. Troque foto, textos, links e até o modelo inteiro a qualquer momento. O link continua o mesmo.' },
  { q: 'Serve para o meu tipo de negócio?', a: 'Se você atende clientes e quer ser encontrado com facilidade, serve. Autônomos, lojas, clínicas e prestadores de serviço usam.' },
]

/* ── Aparelhos ─────────────────────────────────────────────────────── */

/** Um modelo real no layout de cada aparelho (o cartão é responsivo). */
function Screen({ t, device, on }: { t: Template; device: Device; on: boolean }) {
  const c = t.config
  const img = <img src={responsive(c.photo.src, [device === 'phone' ? 500 : 900]).src} alt="" className="absolute inset-0 h-full w-full object-cover" style={focal(t)} />
  const buttons = (
    <div className="scr-btns">
      <span style={{ background: c.accent, color: onAccent(c.accent) }}><UserPlus weight="bold" /> Salvar contato</span>
      <span className={device === 'phone' ? 'bg-white/15 text-white' : 'bg-[#f2f2f4] text-ink'}><WhatsappLogo weight="bold" /> WhatsApp</span>
    </div>
  )
  const name = <p className="scr-name">{c.name.first}<br />{c.name.last}</p>

  return (
    <div className="scr" data-on={on || undefined}>
      {device === 'phone' ? (
        <>
          {img}
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/15 to-transparent" />
          <div className="scr-copy absolute inset-x-0 bottom-0 p-[7cqw] text-white">
            <p className="scr-niche text-white/70">{c.niche}</p>{name}{buttons}
          </div>
        </>
      ) : (
        <div className={`absolute inset-0 grid bg-white ${device === 'desktop' ? 'grid-cols-[44%_1fr]' : 'grid-rows-[56%_1fr]'}`}>
          <div className="relative overflow-hidden">{img}</div>
          <div className="scr-copy flex flex-col justify-center p-[6cqw] text-ink">
            <p className="scr-niche text-muted">{c.niche}</p>{name}
            <p className="scr-bio text-muted">{c.bio}</p>
            {buttons}
          </div>
        </div>
      )}
    </div>
  )
}

/** Computador, iPad e celular trocando de modelo juntos: o mesmo link abre bem em qualquer tela. */
function Devices({ templates }: { templates: Template[] }) {
  const shown = templates.slice(0, 6)
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (shown.length < 2 || reduced()) return
    const id = setInterval(() => setActive((a) => (a + 1) % shown.length), 3600)
    return () => clearInterval(id)
  }, [shown.length])

  const screen = (device: Device) => (
    <div className="dev-screen">
      {shown.length === 0 && <div className="absolute inset-0 animate-pulse bg-[#e9e9ec]" />}
      {shown.map((t, n) => <Screen key={t.id} t={t} device={device} on={n === active} />)}
    </div>
  )

  return (
    <div className="devices relative mx-auto aspect-[16/9] w-full max-w-[1040px]" aria-hidden="true">
      <div className="dev dev-desktop">{screen('desktop')}</div>
      <div className="dev dev-tablet">{screen('tablet')}</div>
      <div className="dev dev-phone">{screen('phone')}</div>
    </div>
  )
}

/* ── Peças ─────────────────────────────────────────────────────────── */

function CtaButton({ big = false }: { big?: boolean }) {
  return (
    <a href={SIGNUP} className={`cta press inline-flex items-center justify-center gap-2 rounded-full bg-accent font-semibold whitespace-nowrap text-accent-fg hover:brightness-110 ${big ? 'h-14 px-8 text-base' : 'h-12 px-6 text-[15px]'}`}>
      {CTA}
      <ArrowRight size={18} weight="bold" className="cta-arrow" aria-hidden="true" />
    </a>
  )
}

/* ── Página ────────────────────────────────────────────────────────── */

function Landing() {
  const [templates, setTemplates] = useState<Template[]>([])
  useEffect(() => {
    fetch(`${API}/templates`).then((r) => (r.ok ? r.json() : null)).then((j) => j && setTemplates(j.data ?? j), () => {})
  }, [])
  useReveal(templates.length)
  const pick = (n: number) => templates[n % Math.max(templates.length, 1)]

  return (
    <>
      <header className="site-header sticky top-0 z-20 bg-bg/80 backdrop-blur-xl">
        <div className={`${WRAP} flex h-16 items-center justify-between gap-4`}>
          <a href="/" className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]">
            <img src="/favicon.png" alt="" width={30} height={30} className="rounded-full" />
            VorenMe
          </a>
          <nav className="hidden items-center gap-8 text-[14px] text-muted md:flex">
            <a href="#recursos" className="transition-colors hover:text-ink">Recursos</a>
            <a href="#modelos" className="transition-colors hover:text-ink">Modelos</a>
            <a href="#preco" className="transition-colors hover:text-ink">Preço</a>
            <a href="#duvidas" className="transition-colors hover:text-ink">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-1">
            <a href={LOGIN} className="press hidden rounded-full px-4 py-2 text-[14px] font-semibold hover:bg-[#f2f2f4] md:inline-flex">Entrar</a>
            {/* Hick: no mobile a ação visível é o cadastro, não o login; "Entrar" vai para o menu */}
            <a href={SIGNUP} className="press inline-flex rounded-full bg-ink px-4 py-2 text-[14px] font-semibold whitespace-nowrap text-bg">
              <span className="sm:hidden">Testar grátis</span><span className="hidden sm:inline">{CTA}</span>
            </a>
            {/* Jakob: hambúrguer à direita no mobile, como em qualquer site */}
            <details className="relative md:hidden">
              <summary aria-label="Menu" className="press grid size-10 cursor-pointer list-none place-items-center rounded-full hover:bg-[#f2f2f4] [&::-webkit-details-marker]:hidden">
                <List size={22} weight="bold" aria-hidden="true" />
              </summary>
              <nav className="absolute top-12 right-0 grid w-52 gap-1 rounded-[20px] bg-white p-2 text-[15px] font-medium shadow-[0_18px_40px_-16px_rgb(18_18_20/0.35)]"
                onClick={(e) => (e.target as HTMLElement).closest('a') && e.currentTarget.parentElement?.removeAttribute('open')}>
                <a href="#recursos" className="rounded-xl px-3 py-2.5 hover:bg-[#f2f2f4]">Recursos</a>
                <a href="#modelos" className="rounded-xl px-3 py-2.5 hover:bg-[#f2f2f4]">Modelos</a>
                <a href="#preco" className="rounded-xl px-3 py-2.5 hover:bg-[#f2f2f4]">Preço</a>
                <a href="#duvidas" className="rounded-xl px-3 py-2.5 hover:bg-[#f2f2f4]">Dúvidas</a>
                <a href={LOGIN} className="rounded-xl px-3 py-2.5 font-semibold hover:bg-[#f2f2f4]">Entrar</a>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main>
        {/* Hero: o slogan é a mensagem, centralizado; os aparelhos se encaixam conforme a rolagem */}
        <section className="overflow-hidden pt-14 pb-10 text-center md:pt-20">
          <div className={WRAP}>
            <p className="rise text-[15px] font-medium text-muted">Cartão de visita digital</p>
            <h1 className="mt-4 text-[64px] leading-[0.95] font-semibold tracking-[-0.06em] md:text-[120px]">
              <span className="word"><span style={i(0)}>Seu</span></span>{' '}
              <span className="word"><span style={i(1)}>mundo.</span></span>
              <br />
              <span className="word"><span className="text-accent" style={i(2)}>Um</span></span>{' '}
              <span className="word"><span className="text-accent" style={i(3)}>link.</span></span>
            </h1>
            <p className="rise mx-auto mt-6 max-w-[40ch] text-[18px] leading-relaxed text-muted md:text-[20px]" style={i(4)}>
              WhatsApp, redes e serviços num cartão bonito, pronto em minutos. 3 dias grátis, depois R$ 9,99/mês.
            </p>
            <div className="rise mt-8 flex flex-wrap justify-center gap-3" style={i(5)}>
              <CtaButton />
              <a href="#modelos" className="press inline-flex h-12 items-center rounded-full px-6 text-[15px] font-semibold text-accent hover:bg-accent/8">
                Ver modelos
              </a>
            </div>
          </div>
          <div className="mt-14 px-4 md:mt-20"><Devices templates={templates} /></div>
        </section>

        {/* Papel x VorenMe: os problemas do papel são riscados, os benefícios entram com check */}
        <section className={`${WRAP} py-28 md:py-40`}>
          <h2 className={`${H2} mx-auto max-w-[16ch] text-center`} data-reveal>O papel some. Seu link fica.</h2>
          <div className="mx-auto mt-14 grid max-w-[980px] gap-4 md:grid-cols-2">
            <div data-reveal className="vs rounded-[28px] bg-[#f5f5f7] p-8 md:p-10">
              <p className="text-[15px] font-semibold text-muted">Cartão de papel</p>
              <ul className="mt-6 grid gap-4">
                {PAPER.map((t, n) => (
                  <li key={t} className="flex items-center gap-3 text-[18px] text-muted" style={i(n)}>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e5e5ea] text-muted"><X size={14} weight="bold" aria-hidden="true" /></span>
                    <span className="strike">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div data-reveal style={i(1)} className="vs rounded-[28px] bg-accent p-8 text-accent-fg md:p-10">
              <p className="text-[15px] font-semibold text-white/75">VorenMe</p>
              <ul className="mt-6 grid gap-4">
                {VOREN.map((t, n) => (
                  <li key={t} className="vs-ok flex items-center gap-3 text-[18px] font-medium" style={i(n)}>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-accent"><Check size={14} weight="bold" aria-hidden="true" /></span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Recursos */}
        <section id="recursos" className={`${WRAP} scroll-mt-20`}>
          <h2 className={`${H2} max-w-[14ch]`} data-reveal>Tudo o que seu negócio precisa.</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-12">
            <article data-reveal className="feat group relative min-h-[420px] overflow-hidden rounded-[28px] bg-ink text-white md:col-span-7 md:row-span-2 md:min-h-[560px]">
              {pick(1) && <img src={responsive(pick(1).config.photo.src, [900]).src} alt="" loading="lazy" className="feat-img absolute inset-0 h-full w-full object-cover opacity-80" style={focal(pick(1))} />}
              <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8 md:p-10">
                <div className="mb-6 flex gap-2.5">
                  {['#6A45F5', '#E8553D', '#1E9E6A', '#F2B705', '#FAFAF9'].map((c, n) => (
                    <span key={c} className="swatch size-8 rounded-full ring-2 ring-white/30" style={{ background: c, ...i(n) }} />
                  ))}
                </div>
                <h3 className="text-[30px] leading-tight font-semibold tracking-[-0.035em]">Personalize cada cartão</h3>
                <p className="mt-2 max-w-[36ch] text-[17px] text-white/75">Cores, fontes, foto e textos com a cara do seu negócio.</p>
              </div>
            </article>

            <article data-reveal style={i(1)} className="feat stack3 relative min-h-[270px] overflow-hidden rounded-[28px] bg-[#f5f5f7] p-8 md:col-span-5">
              <p className="text-[64px] leading-none font-semibold tracking-[-0.06em]">3</p>
              <h3 className="mt-2 text-[20px] font-semibold tracking-[-0.02em]">cartões por conta</h3>
              <p className="mt-1 max-w-[20ch] text-muted">Um para cada negócio ou serviço.</p>
              <div className="absolute right-8 bottom-8 h-[150px] w-[180px]">
                {[0, 1, 2].map((k) => (
                  <div key={k} className="stack3-card absolute inset-y-0 right-0 w-[106px] overflow-hidden rounded-[14px] bg-white shadow-[0_18px_36px_-18px_rgb(18_18_20/0.45)]" style={{ '--k': k } as CSSProperties}>
                    {pick(k + 2) && <img src={responsive(pick(k + 2).config.photo.src, [300]).src} alt="" loading="lazy" className="h-full w-full object-cover" style={focal(pick(k + 2))} />}
                  </div>
                ))}
              </div>
            </article>

            <article data-reveal style={i(2)} className="feat grid min-h-[270px] gap-6 rounded-[28px] bg-[#f5f5f7] p-8 sm:grid-cols-[1fr_auto] md:col-span-5">
              <div>
                <h3 className="text-[20px] font-semibold tracking-[-0.02em]">Links ilimitados</h3>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {LINKS.map((l, n) => (
                    <li key={l} className="pill rounded-full bg-white px-3 py-1.5 text-[13px] font-medium" style={i(n)}>{l}</li>
                  ))}
                  <li className="pill inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[13px] font-semibold text-bg" style={i(LINKS.length)}><Plus size={12} weight="bold" />quantos quiser</li>
                </ul>
              </div>
              <div className="self-end">
                <div className="relative size-24 overflow-hidden rounded-[16px] bg-white p-2.5 text-ink">
                  <QrCode value="https://vorenme.com" label="QR code de exemplo" className="h-full w-full" />
                  <span className="qr-scan" />
                </div>
                <p className="mt-2 text-[13px] font-medium text-muted">QR code pronto</p>
              </div>
            </article>
          </div>
        </section>

        {/* Como funciona: a linha se desenha com a rolagem e liga os 3 passos */}
        <section className={`${WRAP} steps py-28 md:py-40`}>
          <h2 className={`${H2} max-w-[16ch]`} data-reveal>Pronto em poucos minutos.</h2>
          <div className="relative mt-16">
            <div className="steps-track absolute top-6 right-0 left-0 hidden h-px bg-line-strong md:block"><span className="steps-line" /></div>
            <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map(({ Icon, title, text }, n) => (
                <li key={title} className="relative" data-reveal style={i(n)}>
                  <span className="relative grid size-12 place-items-center rounded-full bg-accent text-accent-fg ring-8 ring-bg"><Icon size={22} aria-hidden="true" /></span>
                  <h3 className="mt-6 text-[22px] font-semibold tracking-[-0.025em]">{title}</h3>
                  <p className="mt-2 max-w-[30ch] text-[17px] leading-relaxed text-muted">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Modelos */}
        {templates.length > 0 && (
          <section id="modelos" className="scroll-mt-20 bg-[#f5f5f7] py-24 md:py-32">
            <div className={WRAP}>
              <h2 className={H2} data-reveal>Um modelo para cada negócio.</h2>
            </div>
            {/* Esteira infinita: a lista vai duas vezes e anda -50%; pausa no hover. Sem movimento = lista rolável. */}
            <div className="marquee mt-12" data-reveal>
              <ul className="marquee-track flex w-max gap-5 pb-2" style={{ '--n': templates.length } as CSSProperties}>
                {[...templates, ...templates].map((t, n) => {
                  const dup = n >= templates.length
                  return (
                    <li key={`${t.id}-${n}`} aria-hidden={dup || undefined} className={`w-[210px] shrink-0 md:w-[250px] ${dup ? 'marquee-dup' : ''}`}>
                      <div className="model block">
                        <div className="aspect-[3/4] overflow-hidden rounded-[22px] bg-white">
                          <img src={responsive(t.config.photo.src, [500]).src} alt={dup ? '' : `Modelo ${t.name}`} loading="lazy" className="h-full w-full object-cover" style={focal(t)} />
                        </div>
                        <span className="mt-3 block text-[15px] font-semibold">{t.name}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
            {/* Hick: uma ação só depois da vitrine, em vez de cada card competir como CTA */}
            <div className="mt-12 text-center"><CtaButton /></div>
          </section>
        )}

        {/* Preço */}
        <section id="preco" className={`${WRAP} scroll-mt-20 py-28 text-center md:py-40`}>
          <h2 className={H2} data-reveal>Um plano. Tudo incluso.</h2>
          <p className="mx-auto mt-4 max-w-[44ch] text-[18px] text-muted" data-reveal>Menos de R$ 0,34 por dia. Sem taxa de adesão e sem fidelidade.</p>
          <div className="price mx-auto mt-14 max-w-[560px] rounded-[32px] bg-[#f5f5f7] p-8 text-left md:p-12" data-reveal>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[15px] font-semibold text-accent">3 dias grátis</p>
                <p className="mt-1 text-muted">depois</p>
              </div>
              <p className="flex items-baseline gap-1">
                <span className="text-xl font-semibold">R$</span>
                <span className="text-[80px] leading-none font-semibold tracking-[-0.06em]">9,99</span>
                <span className="text-muted">/mês</span>
              </p>
            </div>
            <ul className="mt-10 grid gap-3.5">
              {INCLUDED.map((item, n) => (
                <li key={item} data-reveal style={i(n)} className="flex items-center gap-3 text-[16px]">
                  <Check size={18} weight="bold" className="shrink-0 text-accent" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-10 grid gap-3 text-center">
              <CtaButton big />
              <span className="text-sm text-muted">Cancele quando quiser.</span>
            </div>
          </div>
        </section>

        {/* Dúvidas */}
        <section id="duvidas" className={`${WRAP} max-w-[860px] scroll-mt-20 pb-28 md:pb-40`}>
          <h2 className={`${H2} text-center`} data-reveal>Dúvidas frequentes</h2>
          <div className="mt-12 border-t border-line-strong">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group border-b border-line-strong py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[19px] font-semibold tracking-[-0.015em] [&::-webkit-details-marker]:hidden">
                  {q}
                  <Plus size={20} weight="bold" className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className="faq-a mt-3 max-w-[60ch] text-[17px] leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Fechamento */}
        <section className="bg-[#f5f5f7] py-28 text-center md:py-40">
          <div className={WRAP} data-reveal>
            <h2 className="text-[56px] leading-[0.95] font-semibold tracking-[-0.06em] md:text-[96px]">Seu mundo.<br /><span className="text-accent">Um link.</span></h2>
            <p className="mx-auto mt-6 max-w-[38ch] text-[18px] text-muted">Crie seu cartão agora e use tudo liberado por 3 dias.</p>
            <div className="mt-9"><CtaButton big /></div>
          </div>
        </section>
      </main>

      <footer className={`${WRAP} flex flex-wrap items-center justify-between gap-3 py-8 text-[13px] text-muted`}>
        <span>© {new Date().getFullYear()} VorenMe</span>
        {/* Jakob: o rodapé repete a navegação, onde o usuário procura por hábito (e é a única nav no mobile) */}
        <nav className="flex flex-wrap items-center gap-5">
          <a href="#recursos" className="hover:text-ink">Recursos</a>
          <a href="#modelos" className="hover:text-ink">Modelos</a>
          <a href="#preco" className="hover:text-ink">Preço</a>
          <a href="#duvidas" className="hover:text-ink">Dúvidas</a>
          <a href={LOGIN} className="font-semibold text-ink hover:underline">Entrar</a>
        </nav>
      </footer>
    </>
  )
}

// Página clara (pedido do produto): tema travado em light, roxo da marca como único acento.
const root = document.documentElement
if (!reduced()) root.classList.add('reveal-ready')
root.dataset.theme = 'light'
root.style.setProperty('--bg', '#ffffff')
root.style.setProperty('--surface', '#ffffff')
root.style.setProperty('--surface-2', '#f5f5f7')
root.style.setProperty('--ink', '#111113')
root.style.setProperty('--muted', '#6e6e73')
root.style.setProperty('--accent', '#6A45F5')
root.style.setProperty('--accent-fg', '#ffffff')
document.title = 'VorenMe | Seu mundo. Um link.'
createRoot(document.getElementById('root')!).render(<StrictMode><Landing /></StrictMode>)
