import { Barcode, Bell, Check, CreditCard, Gift, HandHeart, LockSimple, QrCode, WhatsappLogo, XCircle } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { useCopy } from '../lib/share'
import { api } from './api'
import { Errors, ask, errorText, input, primary, secondary } from './ui'

interface Status {
  activeUntil: string; offlineAt: string; active: boolean; subscribed: boolean; invoiceUrl: string | null
  referral: { code: string | null; total: number; paid: number; freeMonths: number }
}

const date = (iso: string, year = false) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', ...(year && { year: 'numeric' }) })
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5))

/** 000.000.000-00 ou 00.000.000/0000-00 enquanto digita. */
const maskDoc = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

const INCLUDED = ['Até 3 cartões', 'Links e redes ilimitados', 'Todos os modelos e estilos', 'Pix, endereço e avaliações', 'Estatísticas de visitas', 'Kit de impressão com QR']
const PROMISES = [
  { Icon: HandHeart, title: 'Sem fidelidade', text: 'Fique só enquanto fizer sentido.' },
  { Icon: Bell, title: 'Aviso antes de cobrar', text: 'Você recebe a fatura antes do vencimento.' },
  { Icon: XCircle, title: 'Cancele em 1 clique', text: 'Aqui mesmo, sem falar com ninguém.' },
]

/** Estado da assinatura em linguagem direta: o que está valendo e o que fazer agora. */
function headline(s: Status, justPaid: boolean) {
  const left = daysLeft(s.activeUntil)
  if (justPaid && s.subscribed && !s.active) return { badge: 'Confirmando', title: 'Pagamento recebido!', text: 'Estamos confirmando com o banco. Em instantes tudo estará liberado.' }
  if (s.subscribed && s.active) return { badge: 'Ativa', title: `Tudo certo até ${date(s.activeUntil)}.`, text: 'Sua assinatura renova sozinha. Antes de cada cobrança você recebe a fatura por e-mail.' }
  const offline = new Date(s.offlineAt) <= new Date()
  const basic = offline
    ? 'Seus cartões estão fora do ar. Quem abrir o link ou o QR code vê uma página de indisponível.'
    : `Seus cartões estão no modo básico (nome, WhatsApp e contato) e saem do ar em ${date(s.offlineAt)}.`
  if (s.subscribed) return { badge: offline ? 'Fora do ar' : 'Pagamento pendente', title: 'Falta pagar a fatura.', text: `${basic} Pague para voltar ao normal.` }
  if (s.active) return { badge: 'Teste grátis', title: left <= 1 ? 'Seu teste acaba hoje.' : `Faltam ${left} dias de teste.`, text: `Assine agora e a primeira cobrança só vence em ${date(s.activeUntil)}, quando o teste acabar.` }
  return { badge: offline ? 'Fora do ar' : 'Teste encerrado', title: offline ? 'Seus cartões saíram do ar.' : 'Seu teste acabou.', text: `${basic} Assine para colocar tudo no ar de novo.` }
}

function Referral({ r }: { r: Status['referral'] }) {
  const { copy, copied } = useCopy()
  const link = r.code ? `${location.origin}/painel?cadastro=1&ref=${encodeURIComponent(r.code)}` : ''
  const wa = `https://wa.me/?text=${encodeURIComponent(`Fiz meu cartão de visita digital no VorenMe e recomendo! Teste 3 dias grátis: ${link}`)}`
  return (
    <section className="grid gap-6 overflow-hidden rounded-[24px] bg-accent/8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="grid gap-4">
        <span className="grid size-11 place-items-center rounded-full bg-accent text-accent-fg"><Gift size={20} weight="fill" aria-hidden="true" /></span>
        <div>
          <h2 className="text-[26px] leading-tight font-semibold tracking-[-0.03em]">Indique e ganhe 1 mês grátis</h2>
          <p className="mt-1.5 max-w-[52ch] text-[15px] text-muted">A cada pessoa que assinar pelo seu link, um mês da sua assinatura fica por nossa conta. O selo "Feito com VorenMe" do seu cartão também conta.</p>
        </div>
        {r.code ? (
          <div className="grid gap-2 sm:flex">
            <input readOnly aria-label="Seu link de indicação" className={`${input} min-w-0 flex-1 bg-white font-mono text-[13px]`} value={link} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className={`${secondary} bg-white hover:bg-white/70`} onClick={() => copy(link)}>
              {copied ? <><Check size={15} weight="bold" aria-hidden="true" /> Copiado</> : 'Copiar link'}
            </button>
            <a className={primary} href={wa} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={17} weight="fill" aria-hidden="true" /> Enviar</a>
          </div>
        ) : (
          <p className="text-[14px] font-medium">Crie seu primeiro cartão para ganhar seu link de indicação.</p>
        )}
      </div>
      <dl className="grid gap-2 min-[420px]:grid-cols-3 lg:w-[300px] lg:grid-cols-1">
        {[['Cadastros pelo seu link', r.total], ['Já assinaram', r.paid], ['Meses grátis guardados', r.freeMonths]].map(([label, n]) => (
          <div key={label} className="flex items-center gap-3 rounded-[16px] bg-white p-4 min-[420px]:block min-[420px]:p-3 sm:p-4 lg:flex">
            <dd className="text-[28px] leading-none font-semibold tabular-nums">{n}</dd>
            <dt className="text-[13px] leading-snug text-muted min-[420px]:mt-1.5 min-[420px]:text-[12px] lg:mt-0 lg:text-[13px]">{label}</dt>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** /painel/assinatura */
export function Billing() {
  const [s, setS] = useState<Status | null>(null)
  const [doc, setDoc] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = () => api<Status>('/billing').then(setS, (e) => setError(errorText(e)))
  useEffect(() => { load() }, [])

  const subscribe = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { invoiceUrl } = await api<{ invoiceUrl: string | null }>('/billing/subscribe', 'POST', { cpfCnpj: doc })
      await load()
      if (invoiceUrl) location.href = invoiceUrl
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!s || !(await ask({ title: 'Cancelar assinatura?', text: `Nada mais será cobrado. Seus cartões continuam completos até ${date(s.activeUntil)}, ficam 5 dias no modo básico (nome, WhatsApp e contato) e saem do ar em ${date(s.offlineAt)}.`, confirm: 'Cancelar assinatura', cancel: 'Manter assinatura', danger: true }))) return
    setBusy(true)
    try {
      await api('/billing/cancel', 'POST')
      await load()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const justPaid = new URLSearchParams(location.search).has('pago')
  const h = s && headline(s, justPaid)
  const digits = doc.replace(/\D/g, '').length

  return (
    <div className="rise grid max-w-[1040px] gap-6">
      <header>
        <h1 className="text-[40px] leading-[1.05] font-semibold tracking-[-0.045em]">Assinatura</h1>
        <p className="mt-1 text-[17px] text-muted">Um plano, tudo incluso. Sem letra miúda.</p>
      </header>

      {!s && !error && (
        <div className="grid gap-4" aria-hidden="true">
          <div className="h-[280px] animate-pulse rounded-[24px] bg-[#f2f2f4]" />
          <div className="h-[220px] animate-pulse rounded-[24px] bg-[#f2f2f4]" />
        </div>
      )}
      {!s && <Errors text={error} />}

      {s && h && (
        <>
          <section className="tile grid overflow-hidden lg:grid-cols-[1.25fr_1fr]">
            <div className="grid content-start gap-4 p-6 sm:p-8">
              <span className={`justify-self-start rounded-full px-3 py-1 text-[13px] font-semibold ${s.active ? 'bg-accent/12 text-ink' : 'bg-[#f2f2f4] text-ink'}`}>{h.badge}</span>
              <h2 className="text-[30px] leading-[1.1] font-semibold tracking-[-0.035em] sm:text-[34px]">{h.title}</h2>
              <p className="max-w-[48ch] text-[15px] leading-relaxed text-muted">{h.text}</p>
              <ul className="mt-2 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
                {INCLUDED.map((i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent/12"><Check size={11} weight="bold" className="text-accent" aria-hidden="true" /></span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid content-start gap-5 border-t border-line bg-[#fafafb] p-6 sm:p-8 lg:border-t-0 lg:border-l">
              <div>
                <p className="text-[14px] font-medium text-muted">Plano VorenMe</p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                  <span className="text-[48px] leading-none font-semibold tracking-[-0.04em] tabular-nums">R$ 9,99</span>
                  <span className="text-[15px] text-muted">por mês</span>
                </p>
              </div>

              {s.subscribed ? (
                <div className="grid gap-2">
                  {s.invoiceUrl && <a className={primary} href={s.invoiceUrl}>Pagar fatura</a>}
                  <p className="text-[13px] text-muted">{s.active ? `Próxima cobrança perto de ${date(s.activeUntil)}.` : 'Pague com Pix e a liberação é na hora.'}</p>
                </div>
              ) : (
                <form onSubmit={subscribe} className="grid gap-3">
                  <label className="grid gap-1.5">
                    <span className="text-[13px] font-semibold">CPF ou CNPJ</span>
                    <input className={`${input} bg-white`} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00"
                      value={doc} onChange={(e) => setDoc(maskDoc(e.target.value))} required aria-describedby="doc-hint" />
                    <span id="doc-hint" className="text-[12px] text-muted">Exigido pelo banco para emitir a cobrança.</span>
                  </label>
                  <button className={primary} disabled={busy || (digits !== 11 && digits !== 14)}>{busy ? 'Abrindo fatura...' : 'Assinar'}</button>
                </form>
              )}

              <div className="grid gap-2">
                <p className="text-[12px] font-medium text-muted">Formas de pagamento</p>
                <div className="flex flex-wrap gap-1.5">
                  {[[QrCode, 'Pix'], [Barcode, 'Boleto'], [CreditCard, 'Cartão']].map(([Icon, label]) => {
                    const I = Icon as typeof QrCode
                    return <span key={label as string} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-medium"><I size={15} aria-hidden="true" />{label as string}</span>
                  })}
                </div>
              </div>
              <p className="flex items-center gap-1.5 text-[12px] text-muted"><LockSimple size={13} aria-hidden="true" /> Pagamento processado pelo Asaas, instituição autorizada pelo Banco Central.</p>
              <Errors text={error} />
            </div>
          </section>

          <ul className="grid gap-3 sm:grid-cols-3">
            {PROMISES.map(({ Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3 rounded-[20px] bg-[#f5f5f7] p-4">
                <Icon size={22} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <span><span className="block text-[15px] font-semibold">{title}</span><span className="block text-[13px] text-muted">{text}</span></span>
              </li>
            ))}
          </ul>

          <Referral r={s.referral} />

          {s.subscribed && (
            <section className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
              <div>
                <h2 className="text-[15px] font-semibold">Cancelar assinatura</h2>
                <p className="text-[13px] text-muted">Depois do período pago, seus cartões ficam 5 dias no modo básico e então saem do ar.</p>
              </div>
              <button type="button" className={`${secondary} text-red-600`} disabled={busy} onClick={cancel}>Cancelar assinatura</button>
            </section>
          )}
        </>
      )}
    </div>
  )
}
