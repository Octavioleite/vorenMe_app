import { Check, Eye, EyeSlash, LockSimple, Warning } from '@phosphor-icons/react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { api, session, type Session, type User } from './api'
import { Errors, ask, errorText, input, primary, secondary } from './ui'

/** Linha de configuração: título e explicação à esquerda, controles à direita (empilha no celular). */
function Row({ title, text, children, danger }: { title: string; text: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className={`grid gap-5 rounded-[24px] border p-6 sm:p-8 md:grid-cols-[260px_1fr] md:gap-10 ${danger ? 'border-red-200 bg-red-50/40' : 'tile border-transparent'}`}>
      <div>
        <h2 className={`text-[17px] font-semibold ${danger ? 'text-red-700' : ''}`}>{title}</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">{text}</p>
      </div>
      <div className="grid content-start gap-4">{children}</div>
    </section>
  )
}

function Saved({ text }: { text: string }) {
  if (!text) return null
  return <span role="status" className="rise inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink"><span className="grid size-5 place-items-center rounded-full bg-accent text-accent-fg"><Check size={11} weight="bold" aria-hidden="true" /></span>{text}</span>
}

function Password({ label, value, onChange, autoComplete, hint }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string; hint?: ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <label className="grid gap-1.5">
      <span className="text-[13px] font-semibold">{label}</span>
      <span className="relative">
        <input className={`${input} pr-11`} type={show ? 'text' : 'password'} autoComplete={autoComplete} required maxLength={128} value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={show}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-ink">
          {show ? <EyeSlash size={17} /> : <Eye size={17} />}
        </button>
      </span>
      {hint}
    </label>
  )
}

/** /painel/perfil */
export function Profile({ user, onChange, onDeleted }: { user: User; onChange: (u: User) => void; onDeleted: () => void }) {
  const [name, setName] = useState(user.name ?? '')
  const [pw, setPw] = useState({ current: '', next: '' })
  const [msg, setMsg] = useState({ name: '', pw: '' })
  const [error, setError] = useState({ name: '', pw: '', del: '' })
  const [busy, setBusy] = useState('')
  const [delOpen, setDelOpen] = useState(false)
  const [delPw, setDelPw] = useState('')

  const display = (user.name || user.email).trim()
  const initials = display.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
  const since = user.createAt && new Date(user.createAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const nameChanged = name.trim() !== (user.name ?? '')
  const longEnough = pw.next.length >= 8

  const run = async (key: 'name' | 'pw', body: object, ok: string) => {
    setBusy(key)
    setError((e) => ({ ...e, [key]: '' }))
    setMsg((m) => ({ ...m, [key]: '' }))
    try {
      // Troca de senha devolve tokens novos (as outras sessões caem).
      const { accessToken, refreshToken, ...u } = await api<User & Partial<Session>>('/auth/me', 'PUT', body)
      if (accessToken && refreshToken) session.set({ ...session.get()!, accessToken, refreshToken })
      onChange(u)
      setMsg((m) => ({ ...m, [key]: ok }))
      setTimeout(() => setMsg((m) => ({ ...m, [key]: '' })), 3000)
      return true
    } catch (err) {
      setError((e) => ({ ...e, [key]: errorText(err) }))
      return false
    } finally {
      setBusy('')
    }
  }

  const saveName = (e: FormEvent) => { e.preventDefault(); run('name', { name }, 'Nome salvo') }
  const savePw = async (e: FormEvent) => {
    e.preventDefault()
    if (await run('pw', { currentPassword: pw.current, newPassword: pw.next }, 'Senha alterada')) setPw({ current: '', next: '' })
  }
  const remove = async (e: FormEvent) => {
    e.preventDefault()
    if (!(await ask({ title: 'Excluir sua conta de vez?', text: 'Seus cartões saem do ar na hora, os links e QR codes impressos param de funcionar e a assinatura é cancelada. Não dá para desfazer.', confirm: 'Excluir conta', cancel: 'Voltar', danger: true }))) return
    setBusy('del')
    try {
      await api('/auth/me', 'DELETE', { password: delPw })
      onDeleted()
    } catch (err) {
      setError((x) => ({ ...x, del: errorText(err) }))
      setBusy('')
    }
  }

  return (
    <div className="rise grid max-w-[1040px] gap-6">
      <header className="flex flex-wrap items-center gap-5">
        <span aria-hidden="true" className="grid size-20 place-items-center rounded-full bg-accent text-[28px] font-semibold tracking-tight text-accent-fg">{initials}</span>
        <div className="min-w-0">
          <h1 className="truncate text-[36px] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[40px]">{user.name || 'Seu perfil'}</h1>
          <p className="mt-1 truncate text-[16px] text-muted">{user.email}{since && <span className="text-[#aeaeb2]">, no VorenMe desde {since}</span>}</p>
        </div>
      </header>

      <Row title="Seus dados" text="Seu nome aparece aqui no painel. O nome do cartão você muda no editor.">
        <form onSubmit={saveName} className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-[13px] font-semibold">Nome</span>
            <input className={input} value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-semibold">E-mail</span>
            <span className="relative">
              <input className={`${input} pr-11`} value={user.email} readOnly aria-describedby="email-hint" />
              <LockSimple size={16} className="absolute top-1/2 right-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            </span>
            <span id="email-hint" className="text-[12px] text-muted">É o seu login. Para trocar, fale com o suporte.</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button className={primary} disabled={!nameChanged || busy === 'name'}>{busy === 'name' ? 'Salvando...' : 'Salvar'}</button>
            <Saved text={msg.name} />
          </div>
          <Errors text={error.name} />
        </form>
      </Row>

      <Row title="Senha" text="Use uma senha que você não usa em outros sites. Pedimos a atual para confirmar que é você.">
        <form onSubmit={savePw} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Password label="Senha atual" autoComplete="current-password" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} />
            <Password label="Nova senha" autoComplete="new-password" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })}
              hint={<span className={`flex items-center gap-1.5 text-[12px] ${longEnough ? 'font-medium text-ink' : 'text-muted'}`}>
                <Check size={12} weight="bold" className={longEnough ? 'text-accent' : 'opacity-30'} aria-hidden="true" /> Pelo menos 8 caracteres
              </span>} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className={primary} disabled={!pw.current || !longEnough || busy === 'pw'}>{busy === 'pw' ? 'Alterando...' : 'Alterar senha'}</button>
            <Saved text={msg.pw} />
          </div>
          <Errors text={error.pw} />
        </form>
      </Row>

      <Row danger title="Excluir conta" text="Apaga sua conta, seus cartões e fotos, e cancela a assinatura. Não dá para desfazer.">
        {!delOpen ? (
          <div><button type="button" className={`${secondary} bg-white text-red-600 hover:bg-red-50`} onClick={() => setDelOpen(true)}>Quero excluir minha conta</button></div>
        ) : (
          <form onSubmit={remove} className="rise grid gap-4">
            <p className="flex items-start gap-2 rounded-[14px] bg-white p-4 text-[14px]">
              <Warning size={18} weight="fill" className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
              QR codes já impressos vão parar de funcionar. Se você só quer dar uma pausa, cancele a assinatura: você pode assinar de novo depois e seus cartões voltam como estavam.
            </p>
            <div className="max-w-[340px]"><Password label="Confirme com sua senha" autoComplete="current-password" value={delPw} onChange={setDelPw} /></div>
            <div className="flex flex-wrap gap-2">
              <button className="press inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40" disabled={!delPw || busy === 'del'}>
                {busy === 'del' ? 'Excluindo...' : 'Excluir minha conta'}
              </button>
              <button type="button" className={`${secondary} bg-white`} onClick={() => { setDelOpen(false); setDelPw(''); setError((x) => ({ ...x, del: '' })) }}>Cancelar</button>
            </div>
            <Errors text={error.del} />
          </form>
        )}
      </Row>
    </div>
  )
}
