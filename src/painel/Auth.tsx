import { ArrowRight, Check, Eye, EyeSlash } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { api, type Session, type Template } from './api'
import { Errors, errorText, thumb, transition } from './ui'
import { captureOrigin, siteEvent } from '../lib/track'

const MODES = { login: 'Entrar', register: 'Criar conta' } as const
type Mode = keyof typeof MODES
const step = (i: number) => ({ '--i': i }) as CSSProperties

const AUTOPLAY = 3200
// Mesma linguagem da página inicial: campos cinza-claro sem borda, botões em pílula.
const field = 'h-12 w-full rounded-[14px] bg-[#f2f2f4] px-4 text-[16px] text-ink outline-none ring-accent/40 transition-shadow placeholder:text-[#8e8e93] focus:bg-white focus:ring-2'
const PERKS = ['3 dias grátis, sem cartão de crédito','Até 3 cartões e links ilimitados', 'Cancele quando quiser']

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
 *  digita o nome (o cartão ativo vira o dela). Começa no modelo escolhido na landing (`start`). */
function Showcase({ name, templates, start }: { name: string; templates: Template[] | null; start: number }) {
  const [picked, setActive] = useState<number | null>(null)
  const active = picked ?? start
  const [hover, setHover] = useState(false)
  const paused = hover || !!name
  const n = templates?.length ?? 0
  useEffect(() => {
    if (n < 2 || paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setActive((a) => ((a ?? start) + 1) % n), AUTOPLAY)
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

// Indicação: o selo "Feito com VorenMe" manda ?utm_source=cartao&utm_campaign=<slug> (ou ?ref=<slug>).
// Guarda no navegador para valer mesmo se a pessoa voltar outro dia para criar a conta.
const REF_KEY = 'vorenme-ref'
const referral = () => {
  const q = new URLSearchParams(location.search)
  const fromUrl = q.get('ref') || (q.get('utm_source') === 'cartao' ? q.get('utm_campaign') : null)
  try {
    if (fromUrl) localStorage.setItem(REF_KEY, fromUrl)
    return fromUrl || localStorage.getItem(REF_KEY) || undefined
  } catch {
    return fromUrl || undefined
  }
}

// Modelo escolhido na landing ("Usar este modelo" manda ?modelo=<id>). Fica guardado para o 1º cartão já abrir nele (Cards.tsx).
export const MODEL_KEY = 'vorenme-modelo'
const chosenModel = () => {
  const fromUrl = new URLSearchParams(location.search).get('modelo')
  try {
    if (fromUrl) localStorage.setItem(MODEL_KEY, fromUrl)
  } catch { /* sem storage: só não lembra depois */ }
  return fromUrl
}

/** Celular: o cartão da pessoa nascendo ao lado do título. O modelo é o da landing; o nome entra enquanto ela digita. */
function MobilePreview({ t, name }: { t?: Template | null; name: string }) {
  const box = 'w-[112px] shrink-0 -rotate-[4deg] aspect-[3/4] rounded-[18px] lg:hidden'
  if (t === null) return <div aria-hidden="true" className={`${box} animate-pulse bg-[#e9e9ec]`} />
  if (!t) return null
  const c = t.config
  const [first, ...rest] = name ? name.split(/\s+/) : [c.name.first, c.name.last]
  return (
    <div aria-hidden="true" className={`${box} relative overflow-hidden bg-white shadow-[0_24px_48px_-24px_rgb(17_17_19/0.55)]`}>
      <img src={thumb(c.photo.src, 300)} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: c.photo.focal ?? '50% 30%' }} />
      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-2.5 text-[#FAFAF9]">
        <p key={name ? 'you' : 'demo'} className="rise text-[15px] leading-[0.95] font-semibold tracking-[-0.03em] break-words">{first}<br />{rest.join(' ')}</p>
        <span className="mt-2 flex h-5 items-center justify-center rounded-full text-[9px] font-semibold" style={{ background: c.accent, color: '#FAFAF9' }}>Salvar contato</span>
      </div>
    </div>
  )
}

/** Esqueci a senha (pede o e-mail) e Redefinir (link do e-mail: /painel?redefinir=<token>). */
function Recover({ token, onDone, onBack }: { token: string | null; onDone: (s: Session) => void; onBack: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    try {
      if (token) {
        const s = await api<Session>('/auth/reset-password', 'POST', { token, password: data.password })
        history.replaceState(null, '', '/painel')
        onDone(s)
      } else {
        await api('/auth/forgot-password', 'POST', data)
        setSent(true)
      }
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="rise">
      <h1 className="text-[40px] leading-[1.02] font-semibold tracking-[-0.045em] text-ink">{token ? 'Crie uma nova senha.' : 'Esqueceu a senha?'}</h1>
      <p className="mt-3 text-[17px] text-muted">{token ? 'Depois disso você já entra direto.' : 'Mandamos um link para o seu e-mail. Ele vale por 1 hora.'}</p>
      {sent ? (
        <p className="mt-8 rounded-[14px] bg-[#f2f2f4] p-4 text-[15px]">Pronto! Se esse e-mail tiver conta no VorenMe, o link chega em instantes. Confira também o spam.</p>
      ) : (
        <form onSubmit={submit} aria-busy={busy} className="mt-8 grid gap-5">
          <label className="grid gap-2">
            <span className="text-[14px] font-medium text-ink">{token ? 'Nova senha' : 'E-mail'}</span>
            {token
              ? <input name="password" type="password" required minLength={8} maxLength={128} className={field} autoComplete="new-password" />
              : <input name="email" type="email" required className={field} autoComplete="email" inputMode="email" />}
            {token && <span className="text-[13px] text-muted">No mínimo 8 caracteres.</span>}
          </label>
          <Errors text={error} />
          <button disabled={busy} className="press inline-flex h-12 items-center justify-center rounded-full bg-accent text-[16px] font-semibold text-white hover:brightness-110 disabled:opacity-50">
            {busy ? 'Aguarde...' : token ? 'Salvar e entrar' : 'Enviar link'}
          </button>
        </form>
      )}
      <button type="button" onClick={onBack} className="mt-6 text-sm font-semibold text-accent hover:underline">Voltar para entrar</button>
    </div>
  )
}

export function Auth({ onDone }: { onDone: (s: Session) => void }) {
  const resetToken = new URLSearchParams(location.search).get('redefinir')
  const [recover, setRecover] = useState(!!resetToken)
  // Quem chega pelo botão de teste grátis (?cadastro=1) ainda não tem conta: abre direto em Criar conta.
  const [mode, setMode] = useState<Mode>(() => (new URLSearchParams(location.search).has('cadastro') ? 'register' : 'login'))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPass, setShowPass] = useState(false)
  // "Monte o seu" da landing manda o nome digitado (?nome=): o cartão do topo já nasce com ele.
  const [name, setName] = useState(() => (new URLSearchParams(location.search).get('nome') ?? '').slice(0, 60))
  const isLogin = mode === 'login'
  const preview = isLogin ? '' : name.trim()
  const [model] = useState(chosenModel)
  const [templates, setTemplates] = useState<Template[] | null>(null)
  useEffect(() => { api<Template[]>('/templates').then(setTemplates, () => setTemplates([])) }, [])
  const start = Math.max(0, templates?.findIndex((t) => t.id === model) ?? 0)
  // Funil (/admin/site): abriu o cadastro e começou a preencher, uma vez cada. Separa "a página não abriu" de "o formulário travou".
  const seen = useRef({ form: false, start: false })
  useEffect(() => {
    if (!isLogin && !recover && !seen.current.form) { seen.current.form = true; siteEvent('form') }
  }, [isLogin, recover])
  const started = () => { if (!isLogin && !seen.current.start) { seen.current.start = true; siteEvent('start') } }
  const toMode = (m: Mode) => mode !== m && transition(() => { setMode(m); setError('') })

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    import('./Cards') // baixa a próxima tela enquanto a API responde
    try {
      onDone(await api<Session>(`/auth/${mode}`, 'POST', { ...Object.fromEntries(new FormData(e.currentTarget)), ...(!isLogin && { ref: referral(), origin: captureOrigin().origin }) }))
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

        <div className="mx-auto my-auto w-full max-w-[400px] py-8 lg:py-12">
          {recover ? <Recover token={resetToken} onDone={onDone} onBack={() => transition(() => { setRecover(false); history.replaceState(null, '', '/painel') })} /> : <>
          {/* Cadastro: quem veio do "Testar grátis" vê uma decisão só; "Entrar" fica no rodapé do formulário. */}
          {isLogin && (
            <div role="group" aria-label="Acesso" className="rise mb-8 inline-grid grid-cols-2 rounded-full bg-[#f2f2f4] p-1">
              {(Object.keys(MODES) as Mode[]).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => toMode(m)}
                  style={mode === m ? { viewTransitionName: 'auth-tab' } : undefined}
                  className="press h-9 rounded-full px-5 text-[14px] font-semibold text-muted hover:text-ink aria-pressed:bg-white aria-pressed:text-ink aria-pressed:shadow-[0_1px_3px_rgb(17_17_19/0.12)]">
                  {MODES[m]}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-5">
            {!isLogin && <MobilePreview t={templates && templates[start]} name={preview} />}
            <div className="min-w-0">
              <h1 style={{ ...step(1), viewTransitionName: 'auth-title' }}
                className={`rise leading-[1.02] font-semibold tracking-[-0.045em] text-ink ${isLogin ? 'text-[40px]' : 'text-[30px] sm:text-[40px]'}`}>
                {isLogin ? 'Bem-vindo de volta.' : 'Comece seus 3 dias grátis.'}
              </h1>
              <p className={`rise mt-3 text-muted ${isLogin ? 'text-[17px]' : 'text-[15px] sm:text-[17px]'}`} style={step(2)}>
                {isLogin ? 'Entre para gerenciar seus cartões.' : 'Sem cartão de crédito. Seu cartão no ar em poucos minutos.'}
              </p>
            </div>
          </div>

          <form onSubmit={submit} onFocus={started} aria-busy={busy} className="rise mt-8 grid gap-5" style={step(3)}>
            {!isLogin && label('Seu nome', 'Aparece no seu cartão.',
              <input name="name" className={field} autoComplete="name" autoCapitalize="words" value={name} onChange={(e) => setName(e.target.value)} />)}
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
            {isLogin && (
              <button type="button" onClick={() => transition(() => setRecover(true))} className="-mt-2 justify-self-start text-[13px] font-semibold text-accent hover:underline">
                Esqueci minha senha
              </button>
            )}
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
          {!isLogin && (
            <p className="rise mt-8 text-[14px] text-muted" style={step(5)}>
              Já tem conta? <button type="button" onClick={() => toMode('login')} className="font-semibold text-accent hover:underline">Entrar</button>
            </p>
          )}
          </>}
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
        <Showcase name={preview} templates={templates} start={start} />
      </aside>
    </div>
  )
}
