import { ArrowRight, Check, Eye, EyeSlash } from '@phosphor-icons/react'
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { api, type Session, type Template } from './api'
import { Errors, errorText, thumb, transition } from './ui'

const MODES = { login: 'Entrar', register: 'Criar conta' } as const
type Mode = keyof typeof MODES
const step = (i: number) => ({ '--i': i }) as CSSProperties

const AUTOPLAY = 3200
// Mesma linguagem da página inicial: campos cinza-claro sem borda, botões em pílula.
const field = 'h-12 w-full rounded-[14px] bg-[#f2f2f4] px-4 text-[16px] text-ink outline-none ring-accent/40 transition-shadow placeholder:text-[#8e8e93] focus:bg-white focus:ring-2'
const PERKS = ['3 dias grátis, depois R$ 9,99/mês', 'Até 3 cartões e links ilimitados', 'Cancele quando quiser']

/** Cartão-modelo. O ativo inclina seguindo o ponteiro (CSS vars, sem re-render) e,
 *  se a pessoa digitou o nome no cadastro, mostra o nome dela no lugar do exemplo. */
function MiniCard({ t, offset, name }: { t: Template; offset: number; name?: string }) {
  const c = t.config
  const d = Math.abs(offset)
  const [first, ...rest] = name ? name.split(/\s+/) : [c.name.first, c.name.last]
  const tilt = (e: React.PointerEvent<HTMLLIElement>) => {
    if (d) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
    e.currentTarget.style.setProperty('--rx', `${(0.5 - y) * 12}deg`)
    e.currentTarget.style.setProperty('--ry', `${(x - 0.5) * 16}deg`)
  }
  const reset = (e: React.PointerEvent<HTMLLIElement>) => {
    for (const k of ['--rx', '--ry']) e.currentTarget.style.setProperty(k, '0deg')
  }
  return (
    <li onPointerMove={tilt} onPointerLeave={reset}
      className="absolute inset-0 m-auto aspect-[3/4] w-[min(280px,50%)] overflow-hidden rounded-[22px] bg-white shadow-[0_30px_60px_-28px_rgb(17_17_19/0.45)] transition-[transform,opacity] duration-[900ms] ease-out-expo"
      style={{
        transform: `translateX(${offset * 58}%) translateZ(${-d * 140}px) rotateX(var(--rx, 0deg)) rotateY(calc(${-offset * 24}deg + var(--ry, 0deg)))`,
        opacity: d >= 2 ? 0 : d ? 0.55 : 1,
        zIndex: 10 - d,
      }}>
      <img src={thumb(c.photo.src, 700)} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: c.photo.focal ?? '50% 30%' }} />
      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/5 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 text-[#FAFAF9]">
        <p key={name ? 'you' : 'demo'} className="rise text-[30px] font-semibold leading-[0.92] tracking-[-0.04em] break-words">
          {first}<br />{rest.join(' ')}
        </p>
        <p className="mt-2 truncate text-[13px] text-white/70">{c.niche}</p>
        <span className="mt-4 flex h-9 items-center justify-center rounded-full text-[13px] font-semibold" style={{ background: c.accent, color: '#FAFAF9' }}>
          Salvar contato
        </span>
      </div>
    </li>
  )
}

/** Vitrine dos modelos reais (GET /templates é público) em coverflow. Pausa no hover e enquanto a pessoa
 *  digita o nome (o cartão ativo vira o dela). Só busca no desktop, onde a coluna aparece. */
function Showcase({ name }: { name: string }) {
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [active, setActive] = useState(0)
  const [hover, setHover] = useState(false)
  const paused = hover || !!name
  useEffect(() => {
    if (matchMedia('(min-width: 1024px)').matches) api<Template[]>('/templates').then(setTemplates, () => setTemplates([]))
  }, [])
  const n = templates?.length ?? 0
  useEffect(() => {
    if (n < 2 || paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setActive((a) => (a + 1) % n), AUTOPLAY)
    return () => clearInterval(id)
  }, [n, paused, active])

  if (templates === null) return <div className="m-auto aspect-[3/4] w-[min(280px,50%)] animate-pulse rounded-[22px] bg-[#e9e9ec]" />
  if (!n) return null
  // distância circular até o ativo, em [-n/2, n/2]: o carrossel dá a volta sem pular
  const offsetOf = (i: number) => ((i - active + n + Math.floor(n / 2)) % n) - Math.floor(n / 2)
  return (
    <div className="rise grid min-h-0 grid-rows-[1fr_auto]" style={step(3)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <ul aria-hidden="true" className="relative min-h-[400px] [perspective:1400px] [transform-style:preserve-3d]">
        {templates.map((t, i) => <MiniCard key={t.id} t={t} offset={offsetOf(i)} name={i === active ? name : undefined} />)}
      </ul>
      <p className="mt-6 text-center text-[15px] font-semibold" aria-live="polite">Modelo {templates[active]?.name}</p>
      <div className="mt-3 flex justify-center gap-1.5">
        {templates.map((t, i) => (
          <button key={t.id} type="button" onClick={() => setActive(i)} aria-label={`Ver modelo ${t.name}`} aria-pressed={i === active}
            className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? 'w-6 bg-ink' : 'w-1.5 bg-ink/20 hover:bg-ink/40'}`} />
        ))}
      </div>
    </div>
  )
}

export function Auth({ onDone }: { onDone: (s: Session) => void }) {
  // Quem chega pelo botão de teste grátis (?cadastro=1) ainda não tem conta: abre direto em Criar conta.
  const [mode, setMode] = useState<Mode>(() => (new URLSearchParams(location.search).has('cadastro') ? 'register' : 'login'))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [name, setName] = useState('')
  const isLogin = mode === 'login'
  const preview = isLogin ? '' : name.trim()

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    import('./Cards') // baixa a próxima tela enquanto a API responde
    try {
      onDone(await api<Session>(`/auth/${mode}`, 'POST', Object.fromEntries(new FormData(e.currentTarget))))
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  const label = (text: string, hint?: string, control?: React.ReactNode) => (
    <label className="grid gap-2">
      <span className="text-[14px] font-medium text-ink">{text}</span>
      {control}
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </label>
  )

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <main className="flex flex-col px-5 py-5 sm:px-10 lg:px-16">
        <header className="flex items-center">
          <a href="/" className="flex items-center gap-2.5 font-semibold tracking-[-0.02em] text-ink">
            <img src="/favicon.png" alt="" width={30} height={30} className="rounded-full" />
            VorenMe
          </a>
        </header>

        <div className="mx-auto my-auto w-full max-w-[400px] py-12">
          <div role="group" aria-label="Acesso" className="rise inline-grid grid-cols-2 rounded-full bg-[#f2f2f4] p-1">
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m}
                onClick={() => mode !== m && transition(() => { setMode(m); setError('') })}
                style={mode === m ? { viewTransitionName: 'auth-tab' } : undefined}
                className="press h-9 rounded-full px-5 text-[14px] font-semibold text-muted hover:text-ink aria-pressed:bg-white aria-pressed:text-ink aria-pressed:shadow-[0_1px_3px_rgb(17_17_19/0.12)]">
                {MODES[m]}
              </button>
            ))}
          </div>

          <h1 style={{ ...step(1), viewTransitionName: 'auth-title' }} className="rise mt-8 text-[40px] leading-[1.02] font-semibold tracking-[-0.045em] text-ink">
            {isLogin ? 'Bem-vindo de volta.' : 'Comece seus 3 dias grátis.'}
          </h1>
          <p className="rise mt-3 text-[17px] text-muted" style={step(2)}>
            {isLogin ? 'Entre para gerenciar seus cartões.' : 'Seu cartão no ar em poucos minutos.'}
          </p>

          <form onSubmit={submit} aria-busy={busy} className="rise mt-8 grid gap-5" style={step(3)}>
            {!isLogin && label('Nome', undefined,
              <input name="name" className={field} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />)}
            {label('E-mail', undefined,
              <input name="email" type="email" required className={field} autoComplete="email" inputMode="email" />)}
            {label('Senha', isLogin ? undefined : 'No mínimo 8 caracteres.',
              <span className="relative">
                <input name="password" type={showPass ? 'text' : 'password'} required minLength={isLogin ? undefined : 8}
                  className={`${field} pr-12`} autoComplete={isLogin ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPass}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-[14px] text-muted hover:text-ink">
                  {showPass ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </span>)}
            <Errors text={error} />
            <button disabled={busy}
              className="press group mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent text-[16px] font-semibold text-white hover:brightness-110 disabled:opacity-50">
              {busy ? 'Aguarde...' : isLogin ? 'Entrar' : 'Testar 3 dias grátis'}
              {!busy && <ArrowRight size={17} weight="bold" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1" />}
            </button>
          </form>

          {!isLogin && (
            <ul className="rise mt-8 grid gap-2.5" style={step(4)}>
              {PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-[14px] text-muted">
                  <Check size={15} weight="bold" className="shrink-0 text-accent" aria-hidden="true" />{p}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <aside className="m-3 hidden grid-rows-[auto_1fr] overflow-hidden rounded-[32px] bg-[#f5f5f7] p-10 lg:grid xl:p-14">
        <div className="text-center">
          <h2 key={preview ? 'you' : 'pitch'} className="rise mx-auto max-w-md text-[40px] leading-[1.02] font-semibold tracking-[-0.045em] text-ink xl:text-[48px]">
            {preview ? <>Assim fica<br /><span className="text-accent">o seu cartão.</span></> : <>Seu mundo.<br /><span className="text-accent">Um link.</span></>}
          </h2>
          <p className="rise mx-auto mt-4 max-w-sm text-[16px] text-muted" style={step(1)}>
            {preview ? 'Depois é só escolher o modelo e completar com seus dados.' : 'Escolha um modelo, troque foto e textos e compartilhe hoje.'}
          </p>
        </div>
        <Showcase name={preview} />
      </aside>
    </div>
  )
}
