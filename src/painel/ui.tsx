import { CaretDown, CircleNotch, UploadSimple, WarningCircle, X } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { ApiError, uploadImage } from './api'

/* Forma (mesma linguagem da página inicial): superfícies 20-24px · campos 12px cinza-claro sem borda · botões em pílula · só-ícone em círculo. */
export const input =
  'w-full rounded-[12px] border border-transparent bg-[#f2f2f4] px-3.5 py-2.5 text-[16px] text-ink placeholder:text-[#8e8e93] sm:text-[15px] outline-none transition-[background-color,box-shadow] focus:bg-white focus:ring-2 focus:ring-accent/40 disabled:opacity-50'
const btn =
  'press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-40'
export const primary = `${btn} bg-accent text-accent-fg hover:brightness-110`
export const secondary = `${btn} bg-[#f2f2f4] text-ink hover:bg-[#e8e8ec]`
export const iconBtn =
  'press grid size-10 shrink-0 place-items-center rounded-full bg-[#f2f2f4] text-muted hover:bg-[#e8e8ec] hover:text-ink'

export const thumb = (src: string, w = 640) =>
  src.startsWith('https://images.unsplash.com/') ? `${src}${src.includes('?') ? '&' : '?'}w=${w}&q=75&auto=format&fit=crop` : src

/** Anima a troca de tela com a View Transitions API (nativa). Sem suporte ou com movimento reduzido: troca direto.
 *  kind="page" usa a animação de troca de página (index.css); sem kind, só o cross-fade padrão. */
export function transition(fn: () => void, kind?: 'page') {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return fn()
  const root = document.documentElement
  if (kind) root.dataset.vt = kind
  document.startViewTransition(() => flushSync(fn)).finished.finally(() => delete root.dataset.vt)
}

/** Tooltip das barras: nas pontas do gráfico ancora na borda, para não sair da tela no celular. */
export const tipAt = (i: number, n: number) => (i < n / 4 ? 'left-0' : i >= (n * 3) / 4 ? 'right-0' : 'left-1/2 -translate-x-1/2')

export const errorText = (e: unknown) =>
  e instanceof ApiError ? [e.message, ...e.errors].join(' · ') : 'Algo deu errado. Tente novamente.'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid content-start gap-2">
      <span className="text-[13px] font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </label>
  )
}

export function Errors({ text }: { text: string }) {
  if (!text) return null
  return (
    <p role="alert" className="flex items-start gap-2 rounded-[12px] border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500 dark:text-red-400">
      <WarningCircle size={18} weight="bold" className="mt-px shrink-0" aria-hidden="true" />
      {text}
    </p>
  )
}

/** Marca: o "VM" do favicon (fundo preto, funciona como app icon nos dois temas) + nome em texto. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/favicon.png" alt="" width={size} height={size} className="rounded-[9px]" />
      <span className="text-[19px] font-semibold tracking-tight text-ink">
        Voren<span className="text-accent">Me</span>
      </span>
    </span>
  )
}

/** Seção recolhível (<details> nativo). `badge` aparece à direita: "Opcional", "2 cupons"... */
export function Section({ id, icon, title, description, badge, defaultOpen = true, children }: {
  id: string; icon: ReactNode; title: string; description?: string; badge?: string; defaultOpen?: boolean; children: ReactNode
}) {
  return (
    <details id={id} open={defaultOpen} className="tile group/s scroll-mt-36">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[20px] p-4 outline-none sm:p-5 focus-visible:ring-2 focus-visible:ring-accent sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/12 text-accent">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{title}</span>
          {description && <span className="block truncate text-[13px] text-muted">{description}</span>}
        </span>
        {badge && <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-muted">{badge}</span>}
        <CaretDown size={16} weight="bold" aria-hidden="true" className="shrink-0 text-muted transition-transform duration-200 group-open/s:rotate-180" />
      </summary>
      <div className="@container border-t border-line px-4 pt-5 pb-6 sm:px-6">{children}</div>
    </details>
  )
}

/** Miniatura de um link de imagem; some se o link estiver vazio ou quebrado. */
export function Thumb({ src, className, fallback }: { src?: string; className: string; fallback: ReactNode }) {
  const [broken, setBroken] = useState('')
  const ok = !!src && /^(https?:\/\/|\/)/.test(src) && broken !== src
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden border border-line bg-surface-2 text-muted ${className}`}>
      {ok ? <img src={thumb(src!, 160)} alt="" className="size-full object-cover" onError={() => setBroken(src!)} /> : fallback}
    </span>
  )
}

/** Lista de etiquetas: digite e aperte Enter (ou vírgula) para adicionar; clique no X para tirar. */
export function Tags({ label, hint, value, onChange, placeholder }: {
  label: string; hint?: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const t = draft.trim().replace(/,$/, '')
    if (t && !value.includes(t)) onChange([...value, t])
    setDraft('')
  }
  return (
    <div className="grid content-start gap-2">
      <span className="text-[13px] font-medium text-ink">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5 rounded-[12px] border border-line bg-bg p-1.5 focus-within:border-accent">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-1 pr-1 pl-3 text-[13px]">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remover ${t}`}
              className="grid size-5 place-items-center rounded-full text-muted hover:bg-line-strong hover:text-ink pointer-coarse:size-8">
              <X size={11} weight="bold" />
            </button>
          </span>
        ))}
        <input aria-label={label} value={draft} placeholder={value.length ? 'Adicionar mais...' : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
            else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
          }}
          onBlur={add}
          className="min-w-[140px] flex-1 bg-transparent px-2 py-1.5 text-[16px] text-ink sm:text-[15px] outline-none placeholder:text-muted/70" />
      </div>
      <span className="text-[12px] text-muted">{hint ?? 'Digite e aperte Enter para adicionar.'}</span>
    </div>
  )
}

/** Foto: enviar do aparelho (clique ou arrastar) ou colar um link. */
export function ImagePicker({ value, onChange, onError, thumbClass, fallback, max }: {
  value: string; onChange: (url: string) => void; onError: (msg: string) => void
  thumbClass: string; fallback: ReactNode; max?: number
}) {
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [link, setLink] = useState(false)
  const send = async (file?: File) => {
    if (!file || busy) return
    setBusy(true)
    try {
      onChange(await uploadImage(file, max))
      onError('')
    } catch (e) {
      onError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="grid gap-2">
      <div onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files[0]) }}
        className={`flex items-center gap-3 rounded-[12px] border border-dashed p-2 transition-colors ${over ? 'border-accent bg-accent/5' : 'border-line-strong'}`}>
        <Thumb src={value} className={thumbClass} fallback={busy ? <CircleNotch size={18} className="animate-spin" aria-hidden="true" /> : fallback} />
        <div className="min-w-0 flex-1">
          <label className={`${secondary} cursor-pointer py-2 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
            <UploadSimple size={15} weight="bold" aria-hidden="true" /> {busy ? 'Enviando...' : value ? 'Trocar foto' : 'Enviar foto'}
            <input type="file" accept="image/*" className="sr-only" disabled={busy}
              onChange={(e) => { send(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          <p className="mt-1 hidden text-[12px] text-muted sm:block">ou arraste a imagem para cá</p>
        </div>
        <button type="button" onClick={() => setLink((v) => !v)} className="shrink-0 px-2 text-[12px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline">
          {link ? 'Fechar' : 'Usar link'}
        </button>
      </div>
      {link && <input type="url" placeholder="https://" aria-label="Link da imagem" className={input} value={value} onChange={(e) => onChange(e.target.value)} />}
    </div>
  )
}

/** Confirmação em modal (substitui o confirm() nativo). Esc ou clique fora = cancelar. */
export function ask({ title, text, confirm = 'Confirmar', cancel = 'Cancelar', danger = false }: {
  title: string; text: string; confirm?: string; cancel?: string; danger?: boolean
}): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.body.appendChild(document.createElement('div'))
    const root = createRoot(host)
    let answer = false
    const mount = (d: HTMLDialogElement | null) => {
      if (!d || d.open) return
      d.addEventListener('close', () => {
        resolve(answer)
        setTimeout(() => { root.unmount(); host.remove() })
      }, { once: true })
      d.showModal()
    }
    const done = (v: boolean) => (e: { currentTarget: Element }) => {
      answer = v
      e.currentTarget.closest('dialog')!.close()
    }
    root.render(
      <dialog ref={mount} className="qr-dialog w-[420px]" aria-labelledby="ask-title" aria-describedby="ask-text"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
        <div className="tile p-6 sm:p-7">
          <span className={`mb-4 grid size-11 place-items-center rounded-full ${danger ? 'bg-red-500/12 text-red-500' : 'bg-accent/12 text-accent'}`}>
            <WarningCircle size={22} weight="bold" aria-hidden="true" />
          </span>
          <h2 id="ask-title" className="text-[17px] font-semibold tracking-tight">{title}</h2>
          <p id="ask-text" className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" autoFocus className={secondary} onClick={done(false)}>{cancel}</button>
            <button type="button" onClick={done(true)}
              className={danger ? `${secondary} border-red-500 bg-red-500 text-white hover:border-red-600 hover:bg-red-600` : primary}>
              {confirm}
            </button>
          </div>
        </div>
      </dialog>,
    )
  })
}
