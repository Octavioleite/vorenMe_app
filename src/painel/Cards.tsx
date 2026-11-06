import { ArrowSquareOut, Check, LinkSimple, PencilSimple, Plus, Trash, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { api, ApiError, type Card, type Template } from './api'
import { Errors, Field, ask, errorText, iconBtn, primary, secondary, thumb } from './ui'

function CopyLink({ slug }: { slug: string }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(`${location.origin}/${slug}`)
    setDone(true)
    setTimeout(() => setDone(false), 1600)
  }
  return (
    <button type="button" onClick={copy} className={iconBtn} aria-label={done ? 'Link copiado' : 'Copiar link'} title={done ? 'Link copiado' : 'Copiar link'}>
      {done ? <Check size={17} weight="bold" className="text-accent" /> : <LinkSimple size={17} />}
    </button>
  )
}

function CardTile({ card, i, onEdit, onDelete }: { card: Card; i: number; onEdit: () => void; onDelete: () => void }) {
  const c = card.config
  return (
    <li className="tile rise overflow-hidden" style={{ '--i': i } as CSSProperties}>
      <button type="button" onClick={onEdit} className="zoom relative block aspect-[16/10] w-full overflow-hidden bg-surface-2" aria-label={`Editar ${c.name.first} ${c.name.last}`}>
        <img src={thumb(c.photo.src)} alt="" loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: c.photo.focal ?? '50% 30%' }} />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1" style={{ background: c.accent }} />
      </button>
      <div className="p-4">
        <p className="truncate font-semibold">{c.name.first} {c.name.last}</p>
        <p className="truncate text-sm text-muted">{c.niche}</p>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={onEdit} className={`${primary} flex-1 py-2`}>
            <PencilSimple size={16} weight="bold" aria-hidden="true" /> Editar
          </button>
          <a href={`/${card.slug}`} target="_blank" rel="noreferrer" className={iconBtn} aria-label="Abrir cartão" title="Abrir cartão">
            <ArrowSquareOut size={17} />
          </a>
          <CopyLink slug={card.slug} />
          <button type="button" onClick={onDelete} className={`${iconBtn} hover:border-red-500/40 hover:text-red-500`} aria-label="Excluir cartão" title="Excluir cartão">
            <Trash size={17} />
          </button>
        </div>
        <p className="mt-3 truncate text-[13px] text-muted">{location.host}/<span className="text-ink">{card.slug}</span></p>
      </div>
    </li>
  )
}

function NewCardDialog({ templates, dialog, onCreated, fail }: {
  templates: Template[]
  dialog: React.RefObject<HTMLDialogElement>
  onCreated: (c: Card) => void
  fail: (e: unknown) => boolean
}) {
  const [template, setTemplate] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = template || templates[0]?.id

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      onCreated(await api<Card>('/cards', 'POST', { slug, template: selected }))
    } catch (err) {
      if (!fail(err)) setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <dialog ref={dialog} className="qr-dialog w-[720px]" aria-labelledby="new-card-title"
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}>
      <form onSubmit={create} className="tile max-h-[calc(100dvh-32px)] overflow-y-auto p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="new-card-title" className="text-xl font-semibold tracking-tight">Novo cartão</h2>
            <p className="mt-1 text-sm text-muted">Escolha um modelo. Você pode mudar tudo depois.</p>
          </div>
          <button type="button" onClick={() => dialog.current?.close()} className={iconBtn} aria-label="Fechar">
            <X size={17} />
          </button>
        </div>

        <fieldset className="mt-6">
          <legend className="sr-only">Modelo</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {templates.map((t) => {
              const on = selected === t.id
              return (
                <label key={t.id}
                  className={`press group relative cursor-pointer overflow-hidden rounded-[14px] border-2 bg-surface-2 text-ink ${on ? 'border-accent' : 'border-transparent hover:border-line-strong'}`}>
                  <input type="radio" name="template" value={t.id} checked={on} onChange={() => setTemplate(t.id)} className="sr-only" />
                  <img src={thumb(t.config.photo.src, 400)} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover"
                    style={{ objectPosition: t.config.photo.focal ?? '50% 30%' }} />
                  <span className="block px-3 py-2.5">
                    <span className="block text-sm font-semibold">{t.name}</span>
                    <span className="block text-[12px] text-muted">{t.category}</span>
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
        </fieldset>

        <div className="mt-6">
          <Field label="Endereço do cartão" hint="Letras minúsculas, números, ponto, hífen ou _. Mínimo 3 caracteres.">
            <div className="flex items-center rounded-[12px] border border-line bg-bg focus-within:border-accent">
              <span className="pl-3.5 text-[15px] text-muted">{location.host}/</span>
              <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required
                pattern="[a-z0-9][a-z0-9._\-]{2,30}" placeholder="seunome"
                className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 text-[15px] text-ink outline-none placeholder:text-muted/70" />
            </div>
          </Field>
        </div>

        <div className="mt-5"><Errors text={error} /></div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => dialog.current?.close()} className={secondary}>Cancelar</button>
          <button disabled={busy} className={primary}>{busy ? 'Criando...' : 'Criar cartão'}</button>
        </div>
      </form>
    </dialog>
  )
}

export function Cards({ onEdit, onAuthLost }: { onEdit: (c: Card) => void; onAuthLost: () => void }) {
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

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Seus cartões</h1>
          <p className="mt-1 text-muted">
            {cards === null ? 'Carregando...' : cards.length === 1 ? '1 cartão publicado' : `${cards.length} cartões publicados`}
          </p>
        </div>
        {!!cards?.length && (
          <button type="button" onClick={openNew} className={primary}>
            <Plus size={16} weight="bold" aria-hidden="true" /> Novo cartão
          </button>
        )}
      </div>

      <div className="mt-6"><Errors text={error} /></div>

      {cards === null ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="tile overflow-hidden">
              <div className="skeleton aspect-[16/10]" />
              <div className="space-y-2 p-4">
                <div className="skeleton h-4 w-2/3 rounded-full" />
                <div className="skeleton h-3 w-1/2 rounded-full" />
                <div className="skeleton mt-4 h-10 rounded-[12px]" />
              </div>
            </li>
          ))}
        </ul>
      ) : cards.length === 0 ? (
        <div className="tile rise mt-8 grid items-center gap-8 overflow-hidden p-6 sm:p-10 md:grid-cols-[1fr_auto]">
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold tracking-tight">Crie seu primeiro cartão</h2>
            <p className="mt-2 text-muted">
              Comece por um modelo pronto para o seu ramo: clínicas, consultórios, lojas ou criadores de conteúdo.
            </p>
            <button type="button" onClick={openNew} className={`${primary} mt-6`}>
              <Plus size={16} weight="bold" aria-hidden="true" /> Novo cartão
            </button>
          </div>
          <div className="hidden gap-3 md:flex" aria-hidden="true">
            {templates.slice(0, 3).map((t, i) => (
              <img key={t.id} src={thumb(t.config.photo.src, 300)} alt=""
                className="h-44 w-28 rounded-[14px] object-cover shadow-lg"
                style={{ objectPosition: t.config.photo.focal ?? '50% 30%', transform: `rotate(${(i - 1) * 4}deg) translateY(${i === 1 ? -8 : 0}px)` }} />
            ))}
          </div>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <CardTile key={c.id} card={c} i={i} onEdit={() => onEdit(c)} onDelete={() => remove(c)} />
          ))}
        </ul>
      )}

      <NewCardDialog templates={templates} dialog={dialog} fail={fail}
        onCreated={(c) => { dialog.current?.close(); onEdit(c) }} />
    </>
  )
}
