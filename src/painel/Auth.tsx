import { ArrowRight, Eye, EyeSlash } from '@phosphor-icons/react'
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { api, type Session, type Template } from './api'
import { Errors, Field, errorText, input, primary, thumb, transition } from './ui'

const MODES = { login: 'Entrar', register: 'Criar conta' } as const
type Mode = keyof typeof MODES
const step = (i: number) => ({ '--i': i }) as CSSProperties

const AUTOPLAY = 3200

/** Cartão-modelo. O ativo inclina e ganha brilho seguindo o ponteiro (CSS vars, sem re-render) e,
 *  se a pessoa digitou o nome no cadastro, mostra o nome dela no lugar do exemplo. */
function MiniCard({ t, offset, name }: { t: Template; offset: number; name?: string }) {
  const c = t.config
  const d = Math.abs(offset)
  const [first, ...rest] = name ? name.split(/\s+/) : [c.name.first, c.name.last]
  const tilt = (e: React.PointerEvent<HTMLLIElement>) => {
    if (d) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
    const s = e.currentTarget.style
    s.setProperty('--rx', `${(0.5 - y) * 14}deg`)
    s.setProperty('--ry', `${(x - 0.5) * 18}deg`)
    s.setProperty('--mx', `${x * 100}%`)
    s.setProperty('--my', `${y * 100}%`)
  }
  const reset = (e: React.PointerEvent<HTMLLIElement>) => {
    for (const k of ['--rx', '--ry']) e.currentTarget.style.setProperty(k, '0deg')
  }
  return (
    <li onPointerMove={tilt} onPointerLeave={reset}
      className="group/card absolute inset-0 m-auto aspect-[3/4] w-[min(300px,52%)] overflow-hidden rounded-[24px] bg-surface-2 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] transition-[transform,opacity,filter] duration-[900ms] ease-out-expo"
      style={{
        transform: `translateX(${offset * 60}%) translateZ(${-d * 160}px) rotateX(var(--rx, 0deg)) rotateY(calc(${-offset * 28}deg + var(--ry, 0deg)))`,
        opacity: d >= 2 ? 0 : 1,
        filter: d ? 'brightness(0.32) saturate(0.6)' : 'none',
        zIndex: 10 - d,
      }}>
      <img src={thumb(c.photo.src, 700)} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: c.photo.focal ?? '50% 30%' }} />
      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/5 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 text-[#FAFAF9]">
        <p key={name ? 'you' : 'demo'} className="rise text-[34px] font-semibold leading-[0.9] tracking-[-0.04em] break-words">
          {first}<br />{rest.join(' ')}
        </p>
        <p className="mt-3 truncate text-[13px] text-white/70">{c.niche}</p>
        <span className="mt-4 flex h-9 items-center justify-center rounded-full text-[13px] font-semibold" style={{ background: c.accent, color: '#FAFAF9' }}>
          Falar no WhatsApp
        </span>
      </div>
      {/* brilho que segue o ponteiro, só no cartão ativo */}
      {!d && <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
        style={{ background: 'radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), rgb(255 255 255 / 0.16), transparent 45%)' }} />}
      <div className="pointer-events-none absolute inset-0 rounded-[24px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]" />
    </li>
  )
}

/** Vitrine dos modelos reais (GET /templates é público) em coverflow 3D. O fundo da coluna é a foto do modelo
 *  ativo desfocada; o nome do modelo ativo enche até a próxima troca. Pausa no hover e enquanto a pessoa digita
 *  o nome (o cartão ativo vira o dela). Só busca no desktop, onde a coluna aparece. */
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

  if (templates === null) return <div className="skeleton m-auto aspect-[3/4] w-[min(300px,52%)] rounded-[24px]" />
  if (!n) return null
  // distância circular até o ativo, em [-n/2, n/2]: o carrossel dá a volta sem pular
  const offsetOf = (i: number) => ((i - active + n + Math.floor(n / 2)) % n) - Math.floor(n / 2)
  return (
    <>
      {/* fundo ambiente: a foto do modelo ativo, desfocada, troca em cross-fade */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {templates.map((t, i) => (
          <img key={t.id} src={thumb(t.config.photo.src, 400)} alt="" decoding="async"
            className="absolute inset-0 h-full w-full scale-125 object-cover blur-3xl transition-opacity duration-[1400ms]"
            style={{ opacity: i === active ? 0.85 : 0 }} />
        ))}
        <div className="absolute inset-0 bg-linear-to-b from-bg/75 via-bg/10 to-bg/70" />
      </div>

      <div className="rise relative grid min-h-0 grid-rows-[1fr_auto]" style={step(4)}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <ul aria-hidden="true" className="relative min-h-[420px] [perspective:1400px] [transform-style:preserve-3d]">
          {templates.map((t, i) => <MiniCard key={t.id} t={t} offset={offsetOf(i)} name={i === active ? name : undefined} />)}
        </ul>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-2">
          {templates.map((t, i) => (
            <button key={t.id} type="button" onClick={() => setActive(i)} aria-label={`Ver modelo ${t.name}`} aria-pressed={i === active}
              className={`press relative overflow-hidden rounded-full px-3.5 py-1.5 text-[13px] font-medium ${i === active ? 'bg-white/10 text-ink' : 'text-muted hover:text-ink'}`}>
              {i === active && (
                <span key={active} aria-hidden="true" className="progress absolute inset-0 origin-left bg-white/15"
                  style={{ animationDuration: `${AUTOPLAY}ms`, animationPlayState: paused ? 'paused' : 'running' }} />
              )}
              <span className="relative">{t.name}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export function Auth({ onDone }: { onDone: (s: Session) => void }) {
  // Quem chega pelo selo de um cartão (?cadastro=1) ainda não tem conta: abre direto em Criar conta.
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

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <main className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="mx-auto my-auto w-full max-w-[380px] py-12">
          <div className="rise mb-10 grid justify-items-center gap-3">
            <img src="/logo-mark.png" alt="" width={103} height={56} className="h-14 w-auto drop-shadow-[0_8px_24px_rgb(109_59_245/0.35)]" />
            <p className="text-[22px] font-semibold tracking-[-0.03em]">Voren<span className="text-accent">Me</span></p>
          </div>
          <div role="group" aria-label="Acesso" className="rise grid grid-cols-2 rounded-[12px] border border-line bg-surface p-1">
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m}
                onClick={() => mode !== m && transition(() => { setMode(m); setError('') })}
                style={mode === m ? { viewTransitionName: 'auth-tab' } : undefined}
                className="press h-9 rounded-[9px] text-sm font-medium text-muted hover:text-ink aria-pressed:bg-surface-2 aria-pressed:text-ink aria-pressed:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
                {MODES[m]}
              </button>
            ))}
          </div>

          <h1 style={{ ...step(1), viewTransitionName: 'auth-title' }} className="rise mt-10 text-3xl font-semibold tracking-tight">
            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h1>
          <p className="rise mt-2 text-muted" style={step(2)}>
            {isLogin ? 'Gerencie seus cartões de visita digitais.' : 'Seu cartão no ar em poucos minutos.'}
          </p>

          <form onSubmit={submit} aria-busy={busy} className="rise mt-8 grid gap-5" style={step(3)}>
            {!isLogin && (
              <Field label="Nome">
                <input name="name" className={input} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            )}
            <Field label="E-mail">
              <input name="email" type="email" required className={input} autoComplete="email" inputMode="email" />
            </Field>
            <Field label="Senha" hint={isLogin ? undefined : 'No mínimo 8 caracteres.'}>
              <span className="relative">
                <input name="password" type={showPass ? 'text' : 'password'} required minLength={isLogin ? undefined : 8}
                  className={`${input} pr-11`} autoComplete={isLogin ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPass}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-[12px] text-muted hover:text-ink">
                  {showPass ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </Field>
            <Errors text={error} />
            <button disabled={busy} className={`${primary} group mt-1 h-11`}>
              {busy ? 'Aguarde...' : MODES[mode]}
              {!busy && <ArrowRight size={16} weight="bold" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5" />}
            </button>
          </form>
        </div>
      </main>

      <aside className="relative isolate m-3 hidden grid-rows-[auto_1fr] overflow-hidden rounded-[24px] border border-line bg-bg p-10 lg:grid xl:p-14">
        <div>
          <h2 key={preview ? 'you' : 'pitch'} className="rise max-w-lg text-[40px] font-semibold leading-[1.02] tracking-[-0.035em] xl:text-5xl">
            {preview ? <>Assim fica<br /><span className="text-muted">o seu cartão.</span></> : <>Escolha um modelo.<br /><span className="text-muted">Publique hoje.</span></>}
          </h2>
          <p className="rise mt-4 max-w-sm text-[15px] text-muted" style={step(1)}>
            {preview ? 'Troque o modelo embaixo. Depois é só completar com seus dados.' : 'Clínicas, consultórios, lojas e criadores começam com o cartão pronto.'}
          </p>
        </div>
        <Showcase name={preview} />
      </aside>
    </div>
  )
}
