import { ArrowLeft, ArrowRight, ArrowSquareOut, Globe, Check, Info, LinkSimple, MagnifyingGlass, PencilSimple, Plus, Target, Trash, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { api, ApiError, type Card, type Template } from './api'
import { Errors, Field, ask, errorText, useCopyLink, iconBtn, primary, secondary, thumb, transition } from './ui'
import { SUPPORT_EMAIL, SUPPORT_PHONE } from './Support'
import { GuideButton } from './Guide'
import { SLUG, toSlug } from './forSave'
import { MODEL_KEY } from './Auth'

const MAX_CARDS = 3 // espelha vorenMe_api/src/utils/plan.js

/** Copiar o link: o ícone vira check e um balão confirma (feedback da ação). */
function CopyLink({ slug, className }: { slug: string; className: string }) {
  const { done, failed, copy } = useCopyLink(`${location.origin}/${slug}`)
  return (
    <button type="button" onClick={copy} className={`${className} relative`} aria-label={done ? 'Link copiado' : 'Copiar link'} title={done ? 'Link copiado' : 'Copiar link'}>
      {done ? <Check size={17} weight="bold" className="text-accent" /> : <LinkSimple size={17} />}
      {(done || failed) && <span role="status" className="copied absolute -top-10 left-1/2 rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap text-bg">{done ? 'Link copiado' : 'Não deu para copiar o link'}</span>}
    </button>
  )
}

const tileBtn = 'press grid size-10 shrink-0 place-items-center rounded-full text-ink/70 hover:bg-black/5 hover:text-ink'

/** Foto por padrão; no hover, o cartão publicado de verdade (iframe na largura de um celular, reduzido para caber).
 *  O iframe só é criado no primeiro hover/foco, e só aparece depois de carregar (sem tela em branco). */
const PHONE_W = 390
function CardTile({ card, i, onEdit, onDelete }: { card: Card; i: number; onEdit: () => void; onDelete: () => void }) {
  const c = card.config
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  const [armed, setArmed] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / PHONE_W))
    if (box.current) ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const arm = () => matchMedia('(hover: hover)').matches && setArmed(true)

  return (
    <li className="rise" style={{ '--i': i } as CSSProperties}>
      <div ref={box} onPointerEnter={arm} onFocus={arm} data-ready={ready || undefined}
        className="card-tile relative aspect-[4/5] overflow-hidden rounded-[24px] bg-[#f2f2f4] ring-1 ring-black/5">
        <button type="button" onClick={onEdit} className="absolute inset-0 block text-left" aria-label={`Editar ${c.name.first} ${c.name.last}`}>
          <span className="card-photo absolute inset-0">
            <img src={thumb(c.photo.src, 700)} alt="" loading="lazy" className="card-img h-full w-full object-cover" style={{ objectPosition: c.photo.focal ?? '50% 30%' }} />
            <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-5 text-white">
              <span className="block truncate text-[13px] text-white/75">{c.niche}</span>
              <span className="mt-1 block text-[26px] leading-[0.95] font-semibold tracking-[-0.035em]">{c.name.first}<br />{c.name.last}</span>
            </span>
          </span>
          {armed && scale > 0 && (
            <iframe src={`/${card.slug}`} title={`Cartão ${c.name.first} ${c.name.last}`} tabIndex={-1} aria-hidden="true" scrolling="no"
              onLoad={() => setTimeout(() => setReady(true), 400)}
              className="live-frame pointer-events-none absolute top-0 left-0 origin-top-left border-0"
              style={{ width: PHONE_W, height: PHONE_W * 1.25, transform: `scale(${scale})` }} />
          )}
        </button>
        <div className="card-actions absolute inset-x-3 bottom-3 flex items-center gap-1 rounded-full bg-white/90 p-1.5 shadow-[0_12px_30px_-12px_rgb(17_17_19/0.5)] backdrop-blur-md">
          <button type="button" onClick={onEdit} className="press inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-accent text-[14px] font-semibold text-accent-fg hover:brightness-110">
            <PencilSimple size={16} weight="bold" aria-hidden="true" /> Editar
          </button>
          {card.config.connect && (
            <a href={`/painel/estatisticas/${card.id}#conecta`} className={`${tileBtn} text-accent`} aria-label="Ver contatos do VorenMe Conecta" title="Ver contatos do Conecta">
              <Target size={17} weight="bold" />
            </a>
          )}
          <a href={`/${card.slug}`} target="_blank" rel="noreferrer" className={tileBtn} aria-label="Abrir cartão" title="Abrir cartão">
            <ArrowSquareOut size={17} />
          </a>
          <CopyLink slug={card.slug} className={tileBtn} />
          <button type="button" onClick={onDelete} className={`${tileBtn} hover:bg-red-500/10 hover:text-red-500`} aria-label="Excluir cartão" title="Excluir cartão">
            <Trash size={17} />
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2.5 px-1">
        <span aria-hidden="true" className="size-3 shrink-0 rounded-full ring-2 ring-white" style={{ background: c.accent, boxShadow: '0 0 0 1px rgb(17 17 19 / 0.1)' }} />
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{c.name.first} {c.name.last}</p>
        <p className="shrink-0 truncate text-[13px] text-muted">/{card.slug}</p>
      </div>
      {card.disabled && <p role="status" className="mt-2 px-1 text-[13px] font-medium text-red-600">Fora do ar pela nossa equipe. Fale com o suporte.</p>}
    </li>
  )
}

/** Última célula da grade: criar outro cartão. */
function AddTile({ i, onClick }: { i: number; onClick: () => void }) {
  return (
    <li className="rise" style={{ '--i': i } as CSSProperties}>
      <button type="button" onClick={onClick} className="add-tile group grid aspect-[4/5] w-full place-content-center justify-items-center gap-4 rounded-[24px] border-2 border-dashed border-[#d9d9de] text-muted transition-colors hover:border-accent hover:bg-accent/4 hover:text-accent">
        <span className="add-plus grid size-14 place-items-center rounded-full bg-[#f2f2f4] group-hover:bg-accent group-hover:text-accent-fg">
          <Plus size={24} weight="bold" aria-hidden="true" />
        </span>
        <span className="text-[15px] font-semibold">Novo cartão</span>
      </button>
    </li>
  )
}


function NewCardDialog({ templates, name, dialog, onCreated, fail }: {
  templates: Template[]
  name?: string | null
  dialog: React.RefObject<HTMLDialogElement>
  onCreated: (c: Card) => void
  fail: (e: unknown) => boolean
}) {
  const [template, setTemplate] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cat, setCat] = useState('Todos')
  const [query, setQuery] = useState('')
  const selected = template
  const chosen = templates.find((t) => t.id === template)
  // Passo 2: ao escolher o modelo, sugere o endereço pelo nome da conta (o @ do modelo é igual para todo mundo
  // que escolhe o mesmo modelo e daria "já está em uso"). A pessoa ajusta.
  // A foto do modelo escolhido "voa" da grade para o passo 2 (View Transitions, nativo); o resto entra em sequência.
  const [last, setLast] = useState('')
  const choose = (t: Template) => {
    setTemplate(t.id); setLast(t.id); setError('')
    setSlug(SLUG.test(toSlug(name ?? '')) ? toSlug(name!) : toSlug(t.config.username))
  }
  const pick = (t: Template) => transition(() => choose(t))
  // Modelo escolhido na landing ("Usar este modelo"): o diálogo já abre no passo 2 com ele. A chave só sai quando o cartão é criado.
  useEffect(() => {
    let id: string | null = null
    try { id = localStorage.getItem(MODEL_KEY) } catch { /* sem storage */ }
    const t = id && templates.find((x) => x.id === id)
    if (t) choose(t)
  }, [templates]) // eslint-disable-line react-hooks/exhaustive-deps
  const back = () => transition(() => setTemplate(''))
  const cats = ['Todos', ...new Set(templates.map((t) => t.category))]
  const q = query.trim().toLowerCase()
  const shown = templates.filter((t) => (cat === 'Todos' || t.category === cat) && (!q || `${t.name} ${t.category} ${t.config.niche}`.toLowerCase().includes(q)))

  const pending = useRef(0) // id do envio atual; fechar o diálogo invalida (resposta tardia não abre o editor)
  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (!chosen || busy) return
    if (!SLUG.test(slug)) return setError('O endereço precisa ter de 3 a 31 caracteres e começar com letra ou número. Use letras minúsculas, números, ponto, hífen ou _.')
    setBusy(true)
    setError('')
    const me = ++pending.current
    try {
      const card = await api<Card>('/cards', 'POST', { slug, template: selected })
      try { localStorage.removeItem(MODEL_KEY) } catch { /* sem storage */ }
      if (me === pending.current) onCreated(card)
    } catch (err) {
      if (me === pending.current && !fail(err)) setError(errorText(err))
    } finally {
      if (me === pending.current) setBusy(false)
    }
  }

  return (
    <dialog ref={dialog} className="qr-dialog w-[860px]" aria-labelledby="new-card-title"
      onClose={() => { pending.current++; setTemplate(''); setError(''); setBusy(false) }}
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}>
      <form noValidate onSubmit={create} className="tile flex max-h-[calc(100dvh-32px)] flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-4 sm:px-7 sm:py-5">
          <div>
            <h2 id="new-card-title" className="text-xl font-semibold tracking-tight">Novo cartão</h2>
            <p className="mt-1 text-sm text-muted">{chosen ? 'Agora escolha o endereço do seu cartão.' : 'Primeiro escolha um modelo. Você pode mudar tudo depois.'}</p>
          </div>
          <button type="button" onClick={() => dialog.current?.close()} className={iconBtn} aria-label="Fechar">
            <X size={17} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:px-7 sm:py-6">
        {!chosen && <>
        {/* Filtros: categoria (chips) e busca por nome/nicho */}
        <div className="grid gap-3">
          <label className="flex items-center gap-2 rounded-full bg-[#f2f2f4] px-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-accent/40">
            <MagnifyingGlass size={17} className="text-muted" aria-hidden="true" />
            <span className="sr-only">Buscar modelo</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar: barbearia, unhas, dentista..."
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[16px] text-ink outline-none placeholder:text-muted/70 sm:text-[15px]" />
          </label>
          <div role="group" aria-label="Categorias" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {cats.map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c}
                className={`press shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium ${cat === c ? 'border-ink bg-ink text-bg' : 'border-transparent bg-[#f2f2f4] text-muted hover:text-ink'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className="sr-only">Modelo</legend>
          {shown.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-line py-10 text-center text-sm text-muted">
              Nenhum modelo encontrado. <button type="button" onClick={() => { setQuery(''); setCat('Todos') }} className="font-semibold text-ink underline">Ver todos</button>
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {shown.map((t) => {
                const on = selected === t.id
                return (
                  <label key={t.id}
                    className={`press group relative block aspect-[3/4] cursor-pointer overflow-hidden rounded-[16px] bg-surface-2 ring-offset-2 ring-offset-surface ${on ? 'ring-2 ring-accent' : 'hover:ring-1 hover:ring-line-strong'}`}>
                    <input type="radio" name="template" value={t.id} checked={on} onChange={() => pick(t)} className="sr-only" />
                    <img src={thumb(t.config.photo.src, 400)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      style={{ objectPosition: t.config.photo.focal ?? '50% 30%', viewTransitionName: t.id === last ? 'tpl-pick' : undefined }} />
                    <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-3 text-[#FAFAF9]">
                      <span className="block text-[19px] leading-[0.95] font-semibold tracking-[-0.03em]">{t.name}</span>
                      <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-white/75">
                        <span aria-hidden="true" className="size-2 rounded-full" style={{ background: t.config.accent }} />
                        {t.category}
                      </span>
                    </span>
                    {on && (
                      <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-accent text-accent-fg">
                        <Check size={14} weight="bold" aria-hidden="true" />
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </fieldset>
        </>}

        {chosen && <>
        {/* Passo 2: modelo escolhido + endereço */}
        <div className="flex items-center gap-3 sm:gap-4 rounded-[16px] bg-[#f5f5f7] p-3">
          <img src={thumb(chosen.config.photo.src, 400)} alt="" className="aspect-[3/4] w-16 shrink-0 rounded-[10px] object-cover"
            style={{ objectPosition: chosen.config.photo.focal ?? '50% 30%', viewTransitionName: 'tpl-pick' }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg leading-tight font-semibold">{chosen.name}</p>
            <p className="text-[13px] text-muted">{chosen.category}</p>
          </div>
          <button type="button" onClick={back} className={`${secondary} shrink-0`}>
            <ArrowLeft size={16} weight="bold" aria-hidden="true" /> <span className="max-sm:sr-only">Trocar modelo</span>
          </button>
        </div>

        <div className="step-in mt-6" style={{ '--i': 1 } as CSSProperties}>
          <Field label="Endereço do cartão" hint="Letras minúsculas, números, ponto, hífen ou _. Mínimo 3 caracteres.">
            <div className="flex items-center gap-2 rounded-[12px] bg-[#f2f2f4] px-3.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-accent/40">
              <span aria-hidden="true" className="text-[17px] text-muted">/</span>
              <input value={slug} onChange={(e) => setSlug(toSlug(e.target.value))} autoFocus
                aria-label="Endereço do cartão" placeholder="seunome" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                className="min-w-0 flex-1 bg-transparent py-3 text-[16px] font-medium text-ink outline-none placeholder:text-muted/70" />
            </div>
          </Field>
          <div className="mt-3 flex items-start gap-3 rounded-[12px] bg-surface-2 px-3.5 py-3">
            <Globe size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <p className="min-w-0 text-[14px] leading-snug">
              <span className="block text-[12px] text-muted">Seu link vai ficar assim</span>
              <span className="break-all text-muted">{location.host}/</span><span className="break-all font-semibold text-ink">{slug || 'seunome'}</span>
            </p>
          </div>
        </div>

        <div className="mt-5"><Errors text={error} /></div>
        </>}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-line p-4 sm:flex sm:justify-end sm:px-7">
          <button type="button" onClick={() => dialog.current?.close()} className={secondary}>Cancelar</button>
          <button disabled={busy || !chosen} className={`${primary} disabled:opacity-50`}>{busy ? 'Criando...' : 'Criar cartão'}</button>
        </div>
      </form>
    </dialog>
  )
}

const PROMO_KEY = 'vorenme-conecta-promo'

/** Destaque do Conecta para quem ainda tem cartão sem ele. Um toque abre o editor já na seção. Fechar lembra no navegador. */
function ConectaPromo({ cards, onActivate }: { cards: Card[]; onActivate: (c: Card) => void }) {
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(PROMO_KEY) === 'off' } catch { return false } })
  const off = cards.filter((c) => !c.config.connect)
  if (hidden || !off.length) return null
  const close = () => { try { localStorage.setItem(PROMO_KEY, 'off') } catch { /* sem storage: some só agora */ } setHidden(true) }
  return (
    <section aria-labelledby="promo-title" className="rise relative mt-6 grid gap-5 overflow-hidden rounded-[24px] bg-accent/8 p-5 pr-14 sm:p-7 sm:pr-16 md:grid-cols-[auto_1fr_auto] md:items-center" style={{ '--i': 1 } as CSSProperties}>
      <span className="grid size-14 place-items-center rounded-[18px] bg-accent text-accent-fg shadow-[0_14px_30px_-14px_var(--accent)]">
        <Target size={28} weight="bold" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-accent">Novo: VorenMe Conecta</p>
        <h2 id="promo-title" className="mt-1 text-[24px] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[28px]">Transforme visitas em clientes.</h2>
        <p className="mt-2 max-w-[56ch] text-[15px] text-muted">
          Escolha o que o visitante deve fazer, como agendar ou pedir orçamento. O WhatsApp já abre com a mensagem certa e você vê quem clicou.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 md:max-w-[260px] md:flex-col">
        {off.map((c, i) => (
          <button key={c.id} type="button" onClick={() => onActivate(c)} className={`${i === 0 ? primary : `${secondary} bg-surface`} h-11 justify-between`}>
            <span className="truncate">{off.length === 1 ? 'Ativar no meu cartão' : `Ativar em /${c.slug}`}</span>
            <ArrowRight size={16} weight="bold" aria-hidden="true" className="shrink-0" />
          </button>
        ))}
      </div>
      <button type="button" onClick={close} aria-label="Fechar aviso do VorenMe Conecta" title="Fechar"
        className="press absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink">
        <X size={16} weight="bold" aria-hidden="true" />
      </button>
    </section>
  )
}

export function Cards({ name, admin, published, onEdit, onAuthLost }: { name?: string | null; admin?: boolean; published: boolean; onEdit: (c: Card, isNew?: boolean, section?: string) => void; onAuthLost: () => void }) {
  const [cards, setCards] = useState<Card[] | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)

  /** true = sessão expirou (já tratou). */
  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      onAuthLost()
      return true
    }
    return false
  }

  useEffect(() => {
    api<Card[]>('/cards').then(setCards, (e) => fail(e) || setError(errorText(e)))
    api<Template[]>('/templates').then(setTemplates, (e) => fail(e) || setError(errorText(e)))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (c: Card) => {
    if (!(await ask({ title: `Excluir /${c.slug}?`, text: 'O cartão sai do ar na hora e o link para de funcionar. Essa ação não pode ser desfeita.', confirm: 'Excluir cartão', danger: true }))) return
    try {
      await api(`/cards/${c.id}`, 'DELETE')
      setCards((all) => all!.filter((x) => x.id !== c.id))
    } catch (e) {
      if (!fail(e)) setError(errorText(e))
    }
  }

  const openNew = () => dialog.current?.showModal()

  const full = !admin && !!cards && cards.length >= MAX_CARDS
  const canCreate = !full // criar é livre; ir ao ar pede e-mail confirmado (published)
  const first = (name || '').trim().split(/\s+/)[0]
  return (
    <>
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] leading-[1.02] font-semibold tracking-[-0.045em] sm:text-[40px] md:text-[52px]">{first ? `Olá, ${first}.` : 'Seus cartões'}</h1>
          <p className="mt-2 text-[17px] text-muted">
            {cards === null ? 'Carregando seus cartões...' : cards.length === 0 ? 'Vamos colocar seu primeiro cartão no ar.'
              : !published ? (cards.length === 1 ? '1 cartão pronto para ir ao ar.' : `${cards.length} cartões prontos para ir ao ar.`)
              : cards.length === 1 ? '1 cartão no ar.' : `${cards.length} cartões no ar.`}
          </p>
        </div>
        {!!cards?.length && (
          <div className="flex items-center gap-2">
            <GuideButton compact onStart={canCreate ? openNew : undefined} verified={published} />
            {canCreate && (
              <button type="button" onClick={openNew} className={`${primary} h-11`}>
                <Plus size={16} weight="bold" aria-hidden="true" /> Novo cartão
              </button>
            )}
          </div>
        )}
      </div>

      {cards && (!published || full) && (
        <div role="status" className="rise mt-6 flex items-center gap-3 rounded-[16px] bg-accent/8 px-4 py-3">
          <Info size={20} className="shrink-0 text-accent" aria-hidden="true" />
          <p className="text-[14px]">
            {!published
              ? <><span className="font-semibold">Monte seu cartão à vontade. Ele vai ao ar quando você confirmar seu e-mail.</span> Abra o link que enviamos para sua caixa de entrada. Não chegou? Fale com o suporte pelo{' '}
                <a href={`https://wa.me/${SUPPORT_PHONE}`} target="_blank" rel="noreferrer" className="font-semibold text-accent underline">WhatsApp</a> ou{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-accent underline">{SUPPORT_EMAIL}</a>.</>
              : <><span className="font-semibold">Você chegou ao limite de {MAX_CARDS} cartões.</span> Exclua um para criar um novo.</>}
          </p>
        </div>
      )}

      {!!cards?.length && <ConectaPromo cards={cards} onActivate={(c) => onEdit(c, false, 'conecta')} />}

      <div className="mt-6"><Errors text={error} /></div>

      {cards === null ? (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <div className="skeleton aspect-[4/5] rounded-[24px]" />
              <div className="skeleton mt-3 h-3.5 w-1/2 rounded-full" />
            </li>
          ))}
        </ul>
      ) : cards.length === 0 ? (
        <div className="rise mt-8 grid items-center gap-10 overflow-hidden rounded-[32px] bg-[#f5f5f7] p-6 sm:p-12 md:grid-cols-[1fr_auto]" style={{ '--i': 1 } as CSSProperties}>
          <div className="max-w-md">
            <h2 className="text-[32px] leading-[1.05] font-semibold tracking-[-0.04em]">Crie seu primeiro cartão.</h2>
            <p className="mt-3 text-[17px] text-muted">Escolha um modelo pronto para o seu ramo, troque foto e textos e compartilhe o link.</p>
            <div className="mt-7 flex flex-wrap gap-2">
              <button type="button" onClick={openNew} className={`${primary} h-12 px-6 text-[15px]`}>
                <Plus size={16} weight="bold" aria-hidden="true" /> Novo cartão
              </button>
              <GuideButton onStart={openNew} verified={published} autoOpen />
            </div>
          </div>
          <div className="empty-fan relative hidden h-[260px] w-[300px] md:block" aria-hidden="true">
            {templates.slice(0, 3).map((t, i) => (
              <img key={t.id} src={thumb(t.config.photo.src, 300)} alt=""
                className="absolute top-1/2 left-1/2 h-[220px] w-[150px] rounded-[18px] object-cover shadow-[0_24px_48px_-24px_rgb(17_17_19/0.5)]"
                style={{ objectPosition: t.config.photo.focal ?? '50% 30%', '--d': i - 1, zIndex: i === 1 ? 2 : 1 } as CSSProperties} />
            ))}
          </div>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((c, i) => (
            <CardTile key={c.id} card={c} i={i} onEdit={() => onEdit(c)} onDelete={() => remove(c)} />
          ))}
          {canCreate && <AddTile i={cards.length} onClick={openNew} />}
        </ul>
      )}

      <NewCardDialog templates={templates} name={name} dialog={dialog} fail={fail}
        onCreated={(c) => { dialog.current?.close(); onEdit(c, true) }} />
    </>
  )
}
