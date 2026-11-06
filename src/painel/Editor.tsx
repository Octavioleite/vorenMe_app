import {
  ArrowCounterClockwise, ArrowLeft, ArrowSquareOut, ChatCircleText, Check, CloudArrowUp, WarningCircle, Code, Eye, Globe, IdentificationCard, Image as ImageIcon, InstagramLogo, PinterestLogo, SpotifyLogo, TiktokLogo, User, X, XLogo, YoutubeLogo, LinkSimple, ListBullets, Megaphone, Palette, Plus, ShareNetwork, Sparkle, Ticket, Star, Trash,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { TEXT_IDS, TEXT_SIZE, type CreatorConfig, type TextId, type TextLayout, type Platform, type SocialLink } from '../config/types'
import { api, ApiError, type Card } from './api'
import { DevicePreview } from './DevicePreview'
import { Errors, Field, ImagePicker, ask, Section, Tags, Thumb, errorText, iconBtn, input, secondary } from './ui'

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'spotify', label: 'Spotify' },
  { id: 'x', label: 'X' },
  { id: 'website', label: 'Site' },
]
const PLATFORM_ICON = { instagram: InstagramLogo, tiktok: TiktokLogo, youtube: YoutubeLogo, pinterest: PinterestLogo, spotify: SpotifyLogo, x: XLogo, website: Globe }
const NAV = [
  ['identidade', 'Identidade'], ['aparencia', 'Aparência'], ['contato', 'Contato'], ['redes', 'Redes'], ['chamada', 'Chamada'],
  ['cupons', 'Cupons'], ['destaque', 'Destaque'], ['extra', 'Bloco extra'], ['marcas', 'Marcas'], ['compartilhar', 'Compartilhar'],
] as const
/** Abre a seção (é um <details>) antes de rolar até ela. */
const goTo = (id: string) => {
  const el = document.getElementById(id) as HTMLDetailsElement | null
  if (!el) return
  el.open = true
  el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}
const count = (n: number | undefined, one: string, many: string) => (n ? `${n} ${n === 1 ? one : many}` : 'Opcional')
const TEXT_LABELS: [TextId, string][] = [['first', 'Nome'], ['last', 'Sobrenome'], ['niche', 'Especialidade'], ['username', 'Usuário'], ['location', 'Cidade']]
const KINDS = [{ id: 'video', label: 'Vídeo' }, { id: 'post', label: 'Post' }, { id: 'project', label: 'Projeto' }] as const
const SWATCHES = ['#6D3BF5', '#E8552B', '#2A7A8C', '#3B82C4', '#7A8F6B', '#B5838D', '#121214']

const AUTOSAVE_MS = 900

/** Itens ainda sendo preenchidos não vão para o servidor (ele recusaria); voltam a ir quando completos. */
const filled = (v?: string) => !!v?.trim()
const forSave = (c: CreatorConfig): CreatorConfig => ({
  ...c,
  socials: c.socials.filter((s) => filled(s.handle) && filled(s.url)),
  featured: c.featured && filled(c.featured.title) && filled(c.featured.url) && filled(c.featured.image.src) ? c.featured : undefined,
  now: c.now && filled(c.now.title) && filled(c.now.text) ? c.now : undefined,
  brands: c.brands?.filter((b) => filled(b.name)),
  coupons: c.coupons?.filter((k) => filled(k.brand) && filled(k.code)),
})
const PREVIEW_MSG = 'vorenme:preview' // mesmo valor de src/render.tsx

export function Editor({ card, onBack, onAuthLost }: { card: Card; onBack: () => void; onAuthLost: () => void }) {
  const [config, setConfig] = useState<CreatorConfig>(card.config)
  const [slug, setSlug] = useState(card.slug)
  const [saved, setSaved] = useState<{ slug: string; json: string; failed?: string }>({ slug: card.slug, json: JSON.stringify(card.config) })
  const [json, setJson] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)

  const dirty = slug !== saved.slug || JSON.stringify(config) !== saved.json

  // Avisa antes de fechar a aba com alterações não salvas.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [dirty])

  /** Atualiza um campo aninhado: set(c => { c.name.first = v }) */
  const set = (fn: (c: CreatorConfig) => void) =>
    setConfig((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  /** Mescla na posição/tamanho de um texto; campos undefined voltam ao padrão do modelo. */
  const setLayout = (id: TextId, patch: TextLayout) =>
    set((c) => {
      const next = Object.fromEntries(Object.entries({ ...c.photo.layout?.[id], ...patch }).filter(([, v]) => v !== undefined))
      const all = { ...c.photo.layout, [id]: next }
      if (!Object.keys(next).length) delete all[id]
      c.photo.layout = Object.keys(all).length ? all : undefined
    })
  const setSocial = (i: number, patch: Partial<SocialLink>) => set((c) => Object.assign(c.socials[i], patch))

  /** true = salvou. Compara com o que foi ENVIADO (o jsonb do Postgres reordena as chaves). */
  const save = async (e?: FormEvent): Promise<boolean> => {
    e?.preventDefault()
    if (busy) return false
    setBusy(true)
    const sent = { slug, json: JSON.stringify(config) }
    try {
      await api<Card>(`/cards/${card.id}`, 'PUT', { slug: sent.slug, config: forSave(config) })
      setSaved(sent)
      setError('')
      return true
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onAuthLost()
      else setError(errorText(err))
      setSaved((s) => ({ ...s, failed: sent.json + sent.slug }))
      return false
    } finally {
      setBusy(false)
    }
  }

  // Salvamento automático: espera a pessoa parar de digitar. Não repete um envio que já falhou igual.
  const failedSame = saved.failed === JSON.stringify(config) + slug
  useEffect(() => {
    if (!dirty || busy || failedSame) return
    const t = setTimeout(() => save(), AUTOSAVE_MS)
    return () => clearTimeout(t)
  }, [config, slug, dirty, busy, failedSame]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pré-visualização ao vivo: manda o cartão para o iframe a cada alteração, sem salvar nem recarregar.
  const sendPreview = () =>
    frame.current?.contentWindow?.postMessage({ type: PREVIEW_MSG, config }, location.origin)
  useEffect(sendPreview, [config]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onReady = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return
      if (e.data?.type === 'vorenme:ready') sendPreview()
      // Nome arrastado na prévia (Hero.tsx): a posição vira parte do cartão e é salva como o resto.
      // Texto arrastado/redimensionado na prévia (Hero.tsx): vira parte do cartão e é salvo como o resto.
      if (e.data?.type === 'vorenme:layout' && TEXT_IDS.includes(e.data.id)) {
        const { x: px, y: py, size } = e.data.patch ?? {}
        setLayout(e.data.id, {
          ...(Number.isFinite(px) && Number.isFinite(py) && { x: px, y: py }),
          ...(Number.isFinite(size) && { size }),
        })
      }
    }
    addEventListener('message', onReady)
    return () => removeEventListener('message', onReady)
  })

  // Ctrl/Cmd + S salva.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  const back = async () => {
    if (!dirty || (await save()) || (await ask({ title: 'Sair sem salvar?', text: 'Não conseguimos salvar suas últimas alterações. Se sair agora, elas serão perdidas.', confirm: 'Sair mesmo assim', cancel: 'Continuar editando', danger: true }))) onBack()
  }

  const applyJson = () => {
    try {
      setConfig(JSON.parse(json))
      setError('')
    } catch {
      setError('JSON inválido. Confira vírgulas e aspas.')
    }
  }

  const c = config
  const words = c.bio.trim().split(/\s+/).filter(Boolean).length
  return (
    <form onSubmit={save}>
      {/* Barra de ações fixa */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex items-center gap-3">
          <button type="button" onClick={back} className={iconBtn} aria-label="Voltar para seus cartões" title="Voltar">
            <ArrowLeft size={17} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{c.name.first} {c.name.last}</p>
            <p className="truncate text-[13px] text-muted">{location.host}/{saved.slug}</p>
          </div>
          <span aria-live="polite" className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium ${error ? 'bg-red-500/10 text-red-500' : busy || dirty ? 'bg-surface-2 text-muted' : 'bg-accent/10 text-accent'}`}>
            {error ? <><WarningCircle size={15} weight="bold" aria-hidden="true" /> Não salvo</>
              : busy || dirty ? <><CloudArrowUp size={15} aria-hidden="true" /> Salvando...</>
              : <><Check size={15} weight="bold" aria-hidden="true" /> Salvo</>}
          </span>
          <a href={`/${saved.slug}`} target="_blank" rel="noreferrer" className={`${secondary} hidden sm:inline-flex`}>
            <ArrowSquareOut size={16} aria-hidden="true" /> Abrir
          </a>
        </div>
        <nav aria-label="Seções" className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
          {NAV.map(([id, label]) => (
            <button key={id} type="button" onClick={() => goTo(id)}
              className="press shrink-0 rounded-full border border-line px-3 py-1.5 text-[13px] font-medium text-muted hover:border-line-strong hover:text-ink">
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,42%)] lg:has-[[data-device=computador]]:grid-cols-[minmax(340px,1fr)_minmax(0,64%)]">
        <div className="grid gap-5">
          <Errors text={error} />

          <Section icon={<IdentificationCard size={17} weight="bold" />} title="Identidade" id="identidade" description="Nome, foto, bio e endereço do cartão">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome"><input className={input} value={c.name.first} onChange={(e) => set((x) => { x.name.first = e.target.value })} /></Field>
              <Field label="Sobrenome"><input className={input} value={c.name.last} onChange={(e) => set((x) => { x.name.last = e.target.value })} /></Field>
              <Field label="Especialidade ou nicho" hint="Ex: Psicóloga · CRP 06/000000">
                <input className={input} value={c.niche} onChange={(e) => set((x) => { x.niche = e.target.value })} />
              </Field>
              <Field label="Cidade"><input className={input} value={c.location ?? ''} onChange={(e) => set((x) => { x.location = e.target.value || undefined })} /></Field>
              <div className="sm:col-span-2">
                <Field label="Bio" hint={`${words} palavras${words > 20 ? ' · tente encurtar, o ideal é até 20' : '. Ideal: até 20.'}`}>
                  <textarea rows={2} className={input} value={c.bio} onChange={(e) => set((x) => { x.bio = e.target.value })} />
                </Field>
              </div>
              <div className="grid content-start gap-2">
                <span className="text-[13px] font-medium">Foto</span>
                <ImagePicker value={c.photo.src} onChange={(v) => set((x) => { x.photo.src = v })} onError={setError}
                  thumbClass="size-14 rounded-full" fallback={<User size={20} aria-hidden="true" />} />
                <span className="text-[12px] text-muted">De preferência vertical, com o rosto bem visível.</span>
              </div>
              <Field label="Descrição da foto" hint="Lida por leitores de tela.">
                <input className={input} value={c.photo.alt} onChange={(e) => set((x) => { x.photo.alt = e.target.value })} />
              </Field>
              <div className="grid gap-3 rounded-[14px] border border-line p-4 sm:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-medium">Textos sobre a foto</p>
                    <p className="text-[12px] text-muted">Na prévia, arraste cada texto para mover e a bolinha do canto para mudar o tamanho. Ou digite o tamanho aqui.</p>
                  </div>
                  <button type="button" disabled={!c.photo.layout} className={`${secondary} py-2 text-[13px]`}
                    onClick={() => set((x) => { delete x.photo.layout })}>
                    <ArrowCounterClockwise size={14} weight="bold" aria-hidden="true" /> Restaurar padrão do modelo
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TEXT_LABELS.filter(([id]) => id !== 'location' || c.location).map(([id, label]) => {
                    const l = c.photo.layout?.[id]
                    const moved = l?.x !== undefined
                    return (
                      <div key={id} className="flex items-center gap-2 rounded-[12px] bg-surface-2/60 py-1.5 pr-1.5 pl-3">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{label}</span>
                        <span className={`text-[11px] ${moved ? 'text-accent' : 'text-muted'}`}>{moved ? 'Movido' : 'Padrão'}</span>
                        <div className="flex w-[84px] items-center rounded-[10px] border border-line bg-bg focus-within:border-accent">
                          <input type="number" inputMode="numeric" min={TEXT_SIZE.min} max={TEXT_SIZE.max} placeholder="Auto"
                            aria-label={`Tamanho de ${label} em px`} value={l?.size ?? ''}
                            className="min-w-0 flex-1 bg-transparent py-1.5 pl-2.5 text-[14px] text-ink outline-none"
                            onChange={(e) => setLayout(id, { size: e.target.value ? +e.target.value : undefined })}
                            onBlur={() => l?.size && setLayout(id, { size: Math.min(TEXT_SIZE.max, Math.max(TEXT_SIZE.min, l.size)) })} />
                          <span className="pr-2 text-[12px] text-muted">px</span>
                        </div>
                        <button type="button" disabled={!l} title={`Voltar ${label} ao padrão`} aria-label={`Voltar ${label} ao padrão`}
                          className="press grid size-8 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink disabled:opacity-30"
                          onClick={() => setLayout(id, { x: undefined, y: undefined, size: undefined })}>
                          <ArrowCounterClockwise size={14} aria-hidden="true" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
              <Field label="Endereço do cartão">
                <div className="flex items-center rounded-[12px] border border-line bg-bg focus-within:border-accent">
                  <span className="pl-3.5 text-[15px] text-muted">/</span>
                  <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 pl-0.5 text-[15px] text-ink outline-none" />
                </div>
              </Field>
              <Field label="Usuário exibido" hint="Aparece como @usuario no cartão.">
                <input className={input} value={c.username} onChange={(e) => set((x) => { x.username = e.target.value })} />
              </Field>
            </div>
          </Section>

          <Section icon={<Palette size={17} weight="bold" />} title="Aparência" id="aparencia" description="Cor de destaque e tema">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <span className="text-[13px] font-medium">Cor de destaque</span>
                <div className="flex flex-wrap items-center gap-2">
                  {SWATCHES.map((hex) => (
                    <button key={hex} type="button" onClick={() => set((x) => { x.accent = hex })}
                      className={`press size-8 rounded-full border-2 ${c.accent.toUpperCase() === hex ? 'border-ink' : 'border-line-strong'}`}
                      style={{ background: hex }} aria-label={`Usar a cor ${hex}`} aria-pressed={c.accent.toUpperCase() === hex} />
                  ))}
                  <label className="press relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-line-strong" title="Escolher outra cor">
                    <span className="sr-only">Escolher outra cor</span>
                    <Plus size={14} weight="bold" aria-hidden="true" />
                    <input type="color" value={c.accent} onChange={(e) => set((x) => { x.accent = e.target.value.toUpperCase() })}
                      className="absolute inset-0 cursor-pointer opacity-0" />
                  </label>
                  <span className="ml-1 font-mono text-[13px] text-muted">{c.accent.toUpperCase()}</span>
                </div>
              </div>
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-[13px] font-medium">Tema</legend>
                <div className="grid grid-cols-2 rounded-[12px] border border-line bg-bg p-1">
                  {(['light', 'dark'] as const).map((t) => (
                    <label key={t} className={`press cursor-pointer rounded-[9px] py-2 text-center text-sm font-medium ${c.theme === t ? 'bg-surface-2 text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
                      <input type="radio" name="theme" className="sr-only" checked={c.theme === t} onChange={() => set((x) => { x.theme = t })} />
                      {t === 'light' ? 'Claro' : 'Escuro'}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </Section>

          <Section icon={<ChatCircleText size={17} weight="bold" />} title="Contato" id="contato" description="WhatsApp, e-mail e site">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp" hint="Só números, com 55 e DDD.">
                <input inputMode="numeric" className={input} value={c.whatsapp?.number ?? ''} placeholder="5511987654321"
                  onChange={(e) => set((x) => {
                    const number = e.target.value.replace(/\D/g, '')
                    x.whatsapp = number ? { ...x.whatsapp, number } : undefined
                  })} />
              </Field>
              <Field label="WhatsApp como aparece">
                <input className={input} value={c.whatsapp?.display ?? ''} disabled={!c.whatsapp} placeholder="+55 11 98765-4321"
                  onChange={(e) => set((x) => { x.whatsapp!.display = e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Mensagem pronta" hint="Texto que já vem escrito quando a pessoa abre o WhatsApp.">
                  <input className={input} value={c.whatsapp?.message ?? ''} disabled={!c.whatsapp}
                    onChange={(e) => set((x) => { x.whatsapp!.message = e.target.value })} />
                </Field>
              </div>
              <Field label="E-mail">
                <input type="email" className={input} value={c.email?.address ?? ''}
                  onChange={(e) => set((x) => { x.email = e.target.value ? { ...x.email, address: e.target.value } : undefined })} />
              </Field>
              <Field label="Site" hint="Aparece no rodapé e no contato salvo. Vazio esconde.">
                <input type="url" className={input} value={c.website?.url ?? ''} placeholder="https://"
                  onChange={(e) => set((x) => {
                    const url = e.target.value
                    x.website = url ? { url, label: url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') } : undefined
                  })} />
              </Field>
              <Field label="Disponibilidade" hint="Ex: Agenda aberta. Vazio esconde.">
                <input className={input} value={c.availability?.label ?? ''}
                  onChange={(e) => set((x) => { x.availability = e.target.value ? { open: true, label: e.target.value } : undefined })} />
              </Field>
            </div>
          </Section>

          <Section icon={<LinkSimple size={17} weight="bold" />} title="Redes e links" id="redes" description="Onde as pessoas te seguem" badge={c.socials.length ? `${c.socials.length}` : undefined}>
            <div className="grid gap-3">
              {c.socials.length === 0 && <p className="rounded-[14px] border border-dashed border-line p-4 text-center text-sm text-muted">Adicione seu Instagram, TikTok ou site. Eles aparecem como botões no cartão.</p>}
              {c.socials.map((s, i) => (
                <div key={i} className="grid gap-2 rounded-[14px] border border-line p-3 transition-colors hover:bg-surface-2/50 sm:grid-cols-[auto_130px_1fr_1.3fr_auto] sm:items-center">
                  {(() => { const Icon = PLATFORM_ICON[s.platform] ?? Globe; return <span className="hidden size-10 place-items-center rounded-full bg-accent/12 text-accent sm:grid"><Icon size={18} weight="bold" aria-hidden="true" /></span> })()}
                  <select aria-label="Rede" className={input} value={s.platform} onChange={(e) => setSocial(i, { platform: e.target.value as Platform })}>
                    {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <input aria-label="Usuário" placeholder="@usuario" className={input} value={s.handle} onChange={(e) => setSocial(i, { handle: e.target.value })} />
                  <input aria-label="Link" type="url" placeholder="https://" className={input} value={s.url} onChange={(e) => setSocial(i, { url: e.target.value })} />
                  <button type="button" className={`${iconBtn} hover:text-red-500`} onClick={() => set((x) => { x.socials.splice(i, 1) })}
                    aria-label="Remover rede" title="Remover rede">
                    <Trash size={16} />
                  </button>
                </div>
              ))}
              <button type="button" className={`${secondary} justify-self-start`}
                onClick={() => set((x) => { x.socials.push({ platform: 'instagram', handle: '', url: '' }) })}>
                <Plus size={15} weight="bold" aria-hidden="true" /> Adicionar rede
              </button>
            </div>
          </Section>

          <Section icon={<Megaphone size={17} weight="bold" />} title="Chamada principal" id="chamada" defaultOpen={false} description="O convite para trabalhar com você">
            <div className="grid gap-4">
              <Field label="Título"><input className={input} value={c.partnership.title} onChange={(e) => set((x) => { x.partnership.title = e.target.value })} /></Field>
              <Field label="Texto"><textarea rows={2} className={input} value={c.partnership.text} onChange={(e) => set((x) => { x.partnership.text = e.target.value })} /></Field>
              <Tags label="Etiquetas" placeholder="Ex: Reels, UGC, Convênios..." value={c.partnership.formats ?? []}
                hint="Aparecem como etiquetas na chamada. Digite e aperte Enter."
                onChange={(v) => set((x) => { x.partnership.formats = v.length ? v : undefined })} />
            </div>
          </Section>

          <Section icon={<Ticket size={17} weight="bold" />} title="Cupons de desconto" id="cupons" defaultOpen={false} description="Códigos que o visitante copia com um toque" badge={count(c.coupons?.length, "cupom", "cupons")}>
            <div className="grid gap-3">
              <p className="text-sm text-muted">Códigos das marcas parceiras. O visitante copia com um toque. Sem nenhum, a seção some.</p>
              {(c.coupons ?? []).map((k, i) => (
                <div key={i} className="grid gap-2 rounded-[14px] border border-line p-3 sm:grid-cols-2">
                  <input aria-label="Marca" placeholder="Marca" className={input} value={k.brand} onChange={(e) => set((x) => { x.coupons![i].brand = e.target.value })} />
                  <input aria-label="Código do cupom" placeholder="CÓDIGO" className={`${input} font-mono uppercase`} value={k.code}
                    onChange={(e) => set((x) => { x.coupons![i].code = e.target.value.toUpperCase().replace(/\s/g, '') })} />
                  <input aria-label="Desconto" placeholder="Ex: 15% OFF, Frete grátis" className={input} value={k.discount ?? ''} onChange={(e) => set((x) => { x.coupons![i].discount = e.target.value || undefined })} />
                  <div className="flex gap-2">
                    <input aria-label="Link da loja" type="url" placeholder="Link da loja (opcional)" className={input} value={k.url ?? ''} onChange={(e) => set((x) => { x.coupons![i].url = e.target.value || undefined })} />
                    <button type="button" className={`${iconBtn} hover:text-red-500`} onClick={() => set((x) => { x.coupons!.splice(i, 1) })} aria-label="Remover cupom" title="Remover cupom">
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className={`${secondary} justify-self-start`} onClick={() => set((x) => { (x.coupons ??= []).push({ brand: '', code: '' }) })}>
                <Plus size={15} weight="bold" aria-hidden="true" /> Adicionar cupom
              </button>
            </div>
          </Section>

          <Section icon={<Star size={17} weight="bold" />} title="Destaque" id="destaque" defaultOpen={false} description="Um vídeo, post ou projeto em evidência" badge={c.featured ? "Ativo" : "Opcional"}>
            {!c.featured ? (
              <div className="grid justify-items-start gap-3">
                <p className="text-sm text-muted">Um vídeo, post ou projeto em evidência, com imagem grande.</p>
                <button type="button" className={secondary}
                  onClick={() => set((x) => { x.featured = { title: '', platform: 'youtube', url: '', kind: 'video', image: { src: '', alt: '' } } })}>
                  <Plus size={15} weight="bold" aria-hidden="true" /> Adicionar destaque
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Título"><input className={input} value={c.featured.title} onChange={(e) => set((x) => { x.featured!.title = e.target.value })} /></Field>
                </div>
                <Field label="Link"><input type="url" placeholder="https://" className={input} value={c.featured.url} onChange={(e) => set((x) => { x.featured!.url = e.target.value })} /></Field>
                <Field label="Onde está">
                  <select className={input} value={c.featured.platform} onChange={(e) => set((x) => { x.featured!.platform = e.target.value as Platform })}>
                    {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </Field>
                <div className="grid content-start gap-2">
                  <span className="text-[13px] font-medium">Imagem</span>
                  <ImagePicker value={c.featured.image.src} onChange={(v) => set((x) => { x.featured!.image.src = v })} onError={setError}
                    thumbClass="h-14 w-[100px] rounded-[8px]" fallback={<ImageIcon size={20} aria-hidden="true" />} />
                  <span className="text-[12px] text-muted">Horizontal, como a capa de um vídeo.</span>
                </div>
                <Field label="Descrição da imagem" hint="Lida por leitores de tela.">
                  <input className={input} value={c.featured.image.alt} onChange={(e) => set((x) => { x.featured!.image.alt = e.target.value })} />
                </Field>
                <fieldset className="grid gap-2 sm:col-span-2">
                  <legend className="mb-2 text-[13px] font-medium">Tipo</legend>
                  <div className="grid grid-cols-3 rounded-[12px] border border-line bg-bg p-1">
                    {KINDS.map((k) => (
                      <label key={k.id} className={`press cursor-pointer rounded-[9px] py-2 text-center text-sm font-medium ${c.featured!.kind === k.id ? 'bg-surface-2 text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
                        <input type="radio" name="kind" className="sr-only" checked={c.featured!.kind === k.id} onChange={() => set((x) => { x.featured!.kind = k.id })} />
                        {k.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button type="button" className={`${secondary} justify-self-start hover:text-red-500`} onClick={() => set((x) => { x.featured = undefined })}>
                  <Trash size={15} aria-hidden="true" /> Remover destaque
                </button>
              </div>
            )}
          </Section>

          <Section icon={<Sparkle size={17} weight="bold" />} title={c.now?.title || 'Bloco extra'} id="extra" defaultOpen={false} description="Um bloco livre com o que quiser" badge={c.now ? "Ativo" : "Opcional"}>
            {!c.now ? (
              <div className="grid justify-items-start gap-3">
                <p className="text-sm text-muted">Um bloco livre: o que está fazendo agora, especialidades, convênios aceitos...</p>
                <button type="button" className={secondary} onClick={() => set((x) => { x.now = { title: 'Agora', text: '' } })}>
                  <Plus size={15} weight="bold" aria-hidden="true" /> Adicionar bloco
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                <Field label="Título do bloco" hint="Ex: Agora, Especialidades, Convênios.">
                  <input className={input} value={c.now.title} onChange={(e) => set((x) => { x.now!.title = e.target.value })} />
                </Field>
                <Field label="Texto"><textarea rows={2} className={input} value={c.now.text} onChange={(e) => set((x) => { x.now!.text = e.target.value })} /></Field>
                <Field label="Link (opcional)" hint="Mostra um botão Ver mais.">
                  <input type="url" placeholder="https://" className={input} value={c.now.url ?? ''} onChange={(e) => set((x) => { x.now!.url = e.target.value || undefined })} />
                </Field>
                <Tags label="Itens" placeholder="Ex: Ansiedade, Unimed, Corrida..." value={c.now.interests ?? []}
                  onChange={(v) => set((x) => { x.now!.interests = v.length ? v : undefined })} />
                <button type="button" className={`${secondary} justify-self-start hover:text-red-500`} onClick={() => set((x) => { x.now = undefined })}>
                  <Trash size={15} aria-hidden="true" /> Remover bloco
                </button>
              </div>
            )}
          </Section>

          <Section icon={<ListBullets size={17} weight="bold" />} title="Marcas parceiras" id="marcas" defaultOpen={false} description="Marcas com quem você já trabalhou" badge={count(c.brands?.length, "marca", "marcas")}>
            <div className="grid gap-3">
              <p className="text-sm text-muted">Só marcas com quem já trabalhou de verdade. Sem nenhuma, a seção some.</p>
              {(c.brands ?? []).map((b, i) => (
                <div key={i} className="grid gap-2 rounded-[14px] border border-line p-3 sm:grid-cols-[auto_1fr_1.3fr_auto] sm:items-center">
                  <Thumb src={b.logo} className="hidden size-10 rounded-[10px] sm:grid" fallback={<ListBullets size={16} aria-hidden="true" />} />
                  <input aria-label="Nome da marca" placeholder="Nome" className={input} value={b.name} onChange={(e) => set((x) => { x.brands![i].name = e.target.value })} />
                  <input aria-label="Logo (link)" type="url" placeholder="Logo (link, opcional)" className={input} value={b.logo ?? ''} onChange={(e) => set((x) => { x.brands![i].logo = e.target.value || undefined })} />
                  <button type="button" className={`${iconBtn} hover:text-red-500`} onClick={() => set((x) => { x.brands!.splice(i, 1) })} aria-label="Remover marca" title="Remover marca">
                    <Trash size={16} />
                  </button>
                </div>
              ))}
              <button type="button" className={`${secondary} justify-self-start`} onClick={() => set((x) => { (x.brands ??= []).push({ name: '' }) })}>
                <Plus size={15} weight="bold" aria-hidden="true" /> Adicionar marca
              </button>
            </div>
          </Section>

          <Section icon={<ShareNetwork size={17} weight="bold" />} title="Compartilhamento" id="compartilhar" defaultOpen={false} description="Como o link aparece no Google e no WhatsApp">
            <div className="grid gap-4">
              <Field label="Título da página" hint="Aparece na aba do navegador e nos resultados de busca.">
                <input className={input} value={c.seo.title} onChange={(e) => set((x) => { x.seo.title = e.target.value })} />
              </Field>
              <Field label="Descrição"><input className={input} value={c.seo.description} onChange={(e) => set((x) => { x.seo.description = e.target.value })} /></Field>
            </div>
          </Section>

          <details className="group rounded-[20px] border border-dashed border-line px-5 py-4 sm:px-6" onToggle={(e) => e.currentTarget.open && setJson(JSON.stringify(config, null, 2))}>
            <summary className="flex cursor-pointer list-none items-center gap-2.5 text-[15px] font-semibold">
              <Code size={16} className="text-muted" aria-hidden="true" />
              <span className="text-sm font-medium text-muted">Edição técnica</span>
              <span className="ml-auto text-[12px] font-normal text-muted group-open:hidden">Para quem conhece JSON</span>
            </summary>
            <p className="mt-4 text-sm text-muted">Tudo que está acima, em formato de código. Não precisa mexer aqui para editar o cartão.</p>
            <textarea rows={18} spellCheck={false} className={`${input} mt-3 font-mono text-[13px] leading-relaxed`} value={json} onChange={(e) => setJson(e.target.value)} />
            <button type="button" className={`${secondary} mt-3`} onClick={applyJson}>Aplicar JSON</button>
          </details>
        </div>

        {/* Um único preview: coluna lateral no desktop, tela cheia no celular quando aberto. */}
        <aside className={preview ? 'fixed inset-0 z-30 overflow-auto bg-bg p-4 pt-16 lg:static lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0' : 'hidden lg:block'}>
          {preview && (
            <button type="button" onClick={() => setPreview(false)} className={`${iconBtn} fixed top-4 right-4 bg-surface lg:hidden`} aria-label="Fechar prévia">
              <X size={17} />
            </button>
          )}
          <DevicePreview frame={frame} src={`/${saved.slug}?preview`} />
        </aside>
        {!preview && (
          <button type="button" onClick={() => setPreview(true)}
            className="press fixed right-4 bottom-4 z-20 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-fg shadow-2xl lg:hidden">
            <Eye size={17} weight="bold" aria-hidden="true" /> Ver prévia
          </button>
        )}
      </div>
    </form>
  )
}
