import { AddressBook, ArrowDown, ArrowRight, ArrowUp, CalendarCheck, ChartBar, Handshake, Plus, Receipt, ShoppingBag, Trash, UsersThree, WarningCircle, type Icon } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { GOALS, type Channel, type ConnectAction, type ConnectConfig, type CreatorConfig, type Goal } from '../config/types'
import { CHANNEL_ICON } from '../components/icons'
import { Field, ask, iconBtn, input, secondary } from './ui'

export const GOAL_LABEL: Record<Goal, string> = {
  clientes: 'Conseguir novos clientes', orcamento: 'Receber pedidos de orçamento', agendamento: 'Agendar serviços',
  parcerias: 'Receber propostas de parceria', vendas: 'Vender produtos ou serviços', contatos: 'Gerar contatos profissionais',
}
/** Ícone e um exemplo curto de cada objetivo: a pessoa se reconhece sem ler explicação. */
const GOAL_META: Record<Goal, [Icon, string]> = {
  clientes: [UsersThree, 'Quem chega vira atendimento'], orcamento: [Receipt, 'Pedidos chegam com o serviço escolhido'],
  agendamento: [CalendarCheck, 'Consultas, horários e sessões'], parcerias: [Handshake, 'Marcas e propostas comerciais'],
  vendas: [ShoppingBag, 'Pedidos de produtos e serviços'], contatos: [AddressBook, 'Networking e novos contatos'],
}
export const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: 'WhatsApp', form: 'Formulário de contato', phone: 'Ligação', email: 'E-mail', link: 'Link (site, agenda, loja)',
}
const MAX_ACTIONS = 6
const MAX_SERVICES = 20
const newId = () => Math.random().toString(36).slice(2, 8)
const hi = 'Olá! Encontrei seu cartão no VorenMe e gostaria de'

/** Sugestões por objetivo: um ponto de partida, a pessoa edita tudo. Sem WhatsApp cadastrado, vira formulário. */
const PRESETS: Record<Goal, [string, Channel, string?][]> = {
  clientes: [['Quero ser atendido', 'whatsapp', `${hi} mais informações.`], ['Deixar meu contato', 'form']],
  orcamento: [['Pedir orçamento', 'whatsapp', `${hi} pedir um orçamento.`], ['Deixar meu contato', 'form']],
  agendamento: [['Agendar horário', 'whatsapp', `${hi} agendar um horário.`], ['Deixar meu contato', 'form']],
  parcerias: [['Proposta de parceria', 'whatsapp', `${hi} conversar sobre uma parceria.`], ['Enviar proposta por e-mail', 'email'], ['Deixar contato da marca', 'form']],
  vendas: [['Fazer pedido', 'whatsapp', `${hi} fazer um pedido.`], ['Deixar meu contato', 'form']],
  contatos: [['Conversar no WhatsApp', 'whatsapp', `${hi} me conectar com você.`], ['Enviar e-mail', 'email']],
}
const preset = (goal: Goal, c: CreatorConfig): ConnectAction[] =>
  PRESETS[goal]
    .filter(([, ch]) => ch !== 'email' || c.email)
    .map(([label, ch, message]) => (ch === 'whatsapp' && !c.whatsapp ? { id: newId(), label, channel: 'form' } : { id: newId(), label, channel: ch, message }))

/** Ativar = escolher o objetivo. Já entra com ações sugeridas e com os serviços que o cartão mostra (etiquetas da chamada
 *  ou do bloco extra), ligados à ação principal: a pessoa ajusta em vez de começar do zero. */
const start = (goal: Goal, x: CreatorConfig): ConnectConfig => {
  const actions = preset(goal, x)
  const names = [...new Set(x.partnership.formats?.length ? x.partnership.formats : x.now?.interests ?? [])].slice(0, 8)
  return { goal, actions, services: names.map((name) => ({ id: newId(), name: name.slice(0, 60), action: actions[0].id })) }
}

/** Seção "Conecta" do editor. Ordem das ações = prioridade (a 1ª é o botão principal do cartão). */
export function ConnectEditor({ c, set, cardId }: { c: CreatorConfig; set: (fn: (c: CreatorConfig) => void) => void; cardId: string }) {
  const k = c.connect
  if (!k) {
    return (
      <div className="grid gap-5">
        <div className="grid gap-1.5">
          <p className="text-[20px] leading-tight font-semibold tracking-[-0.025em]">O que você quer que o visitante faça?</p>
          <p className="max-w-[58ch] text-[14px] text-muted">
            Escolha um objetivo. Seu cartão ganha um botão principal, seus serviços levam à ação certa e o WhatsApp já abre com a mensagem pronta.
          </p>
        </div>
        <div className="grid gap-2 @md:grid-cols-2 @2xl:grid-cols-3">
          {GOALS.map((g, i) => {
            const [Icon, example] = GOAL_META[g]
            return (
              <button key={g} type="button" onClick={() => set((x) => { x.connect = start(g, x) })} style={{ '--i': i } as CSSProperties}
                className="rise press group flex items-center gap-3 rounded-[16px] border border-line bg-surface p-3.5 text-left transition-colors hover:border-accent hover:bg-accent/6 focus-visible:border-accent">
                <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-accent/12 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-fg">
                  <Icon size={22} weight="bold" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-tight font-semibold">{GOAL_LABEL[g]}</span>
                  <span className="mt-0.5 block text-[13px] text-muted">{example}</span>
                </span>
                <ArrowRight size={16} weight="bold" aria-hidden="true" className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </button>
            )
          })}
        </div>
        <p className="text-[12px] text-muted">Dá para mudar tudo depois: textos, ordem dos botões e serviços.</p>
      </div>
    )
  }

  const setAction = (i: number, patch: Partial<ConnectAction>) => set((x) => { Object.assign(x.connect!.actions[i], patch) })
  const move = (i: number, d: -1 | 1) => set((x) => { const a = x.connect!.actions; [a[i], a[i + d]] = [a[i + d], a[i]] })
  const usePreset = async () => {
    if (k.actions.some((a) => a.label.trim()) && !(await ask({ title: 'Trocar as ações pelas sugestões?', text: `As ações atuais serão substituídas pelas sugeridas para "${GOAL_LABEL[k.goal]}". Os serviços ligados a elas ficam sem ação.`, confirm: 'Usar sugestões' }))) return
    set((x) => { x.connect!.actions = preset(x.connect!.goal, x) })
  }
  const turnOff = async () => {
    if (await ask({ title: 'Desligar o Conecta?', text: 'O bloco sai do cartão e as ações e serviços configurados aqui são apagados. Contatos e estatísticas já recebidos continuam no painel.', confirm: 'Desligar', danger: true })) {
      set((x) => { x.connect = undefined })
    }
  }

  const main = k.actions[0]
  const MainIcon = main && CHANNEL_ICON[main.channel]
  return (
    <div className="grid gap-6">
      {/* Situação em uma linha: o que o visitante vê primeiro e onde acompanhar. */}
      <div className="flex flex-wrap items-center gap-3 rounded-[16px] bg-accent/8 p-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-fg">
          {MainIcon ? <MainIcon size={19} weight="bold" aria-hidden="true" /> : <WarningCircle size={19} weight="bold" aria-hidden="true" />}
        </span>
        <p className="min-w-0 flex-1 basis-[12rem] text-[14px] leading-snug">
          {main?.label.trim()
            ? <><span className="block text-[12px] text-muted">Botão principal do seu cartão</span><b className="font-semibold">{main.label}</b> · {CHANNEL_LABEL[main.channel]}</>
            : <b className="font-semibold">Adicione uma ação para o Conecta aparecer no cartão.</b>}
        </p>
        <a href={`/painel/estatisticas/${cardId}#conecta`} className={`${secondary} bg-surface py-2 text-[13px] max-sm:w-full`}>
          <ChartBar size={15} weight="bold" aria-hidden="true" /> Ver resultados
        </a>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[13px] font-medium">Objetivo principal do cartão</legend>
        <div className="grid gap-2 @md:grid-cols-2 @2xl:grid-cols-3">
          {GOALS.map((g) => {
            const on = k.goal === g
            return (
              <label key={g} className={`press cursor-pointer rounded-[12px] border px-3 py-2.5 text-[14px] font-medium ${on ? 'border-accent bg-accent/6 ring-1 ring-accent' : 'border-line hover:border-line-strong'}`}>
                <input type="radio" name="connect-goal" className="sr-only" checked={on} onChange={() => set((x) => { x.connect!.goal = g })} />
                {GOAL_LABEL[g]}
              </label>
            )
          })}
        </div>
        <button type="button" onClick={usePreset} className="justify-self-start text-[13px] font-semibold text-accent hover:underline">
          Usar ações sugeridas para este objetivo
        </button>
      </fieldset>

      <div className="grid gap-4 @md:grid-cols-2">
        <Field label="Título do bloco (opcional)" hint="Vazio usa um título pronto para o objetivo.">
          <input className={input} maxLength={60} value={k.title ?? ''} onChange={(e) => set((x) => { x.connect!.title = e.target.value || undefined })} />
        </Field>
        <Field label="Para quem é (opcional)" hint="Ex: Pacientes que querem um sorriso mais claro.">
          <input className={input} maxLength={80} value={k.audience ?? ''} onChange={(e) => set((x) => { x.connect!.audience = e.target.value || undefined })} />
        </Field>
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-[13px] font-medium">Ações do visitante</p>
          <p className="text-[12px] text-muted">A primeira é o botão principal. Use as setas para mudar a ordem.</p>
        </div>
        {k.actions.length === 0 && <p className="rounded-[14px] border border-dashed border-line p-4 text-center text-sm text-muted">Nenhuma ação ainda. Adicione uma ou use as sugestões acima.</p>}
        {k.actions.map((a, i) => {
          const Icon = CHANNEL_ICON[a.channel]
          const missing = (a.channel === 'whatsapp' && !c.whatsapp && 'Cadastre o número do WhatsApp na seção Contato.')
            || (a.channel === 'email' && !c.email && 'Cadastre o e-mail na seção Contato.')
          return (
            <div key={a.id} className="grid gap-3 rounded-[14px] border border-line p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/12 text-accent"><Icon size={17} weight="bold" aria-hidden="true" /></span>
                <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${i === 0 ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-muted'}`}>
                  {i === 0 ? 'Principal' : `${i + 1}ª opção`}
                </span>
                <span className="flex-1" />
                <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Subir "${a.label || 'ação'}"`} title="Subir"><ArrowUp size={16} /></button>
                <button type="button" className={iconBtn} disabled={i === k.actions.length - 1} onClick={() => move(i, 1)} aria-label={`Descer "${a.label || 'ação'}"`} title="Descer"><ArrowDown size={16} /></button>
                <button type="button" className={`${iconBtn} hover:text-red-500`} aria-label={`Remover "${a.label || 'ação'}"`} title="Remover"
                  onClick={() => set((x) => { x.connect!.actions.splice(i, 1) })}><Trash size={16} /></button>
              </div>
              <div className="grid gap-3 @md:grid-cols-2">
                <Field label="Texto do botão"><input className={input} maxLength={40} placeholder="Ex: Solicitar avaliação" value={a.label} onChange={(e) => setAction(i, { label: e.target.value })} /></Field>
                <Field label="Leva para">
                  <select className={input} value={a.channel} onChange={(e) => setAction(i, { channel: e.target.value as Channel })}>
                    {(Object.keys(CHANNEL_LABEL) as Channel[]).map((ch) => <option key={ch} value={ch}>{CHANNEL_LABEL[ch]}</option>)}
                  </select>
                </Field>
                {(a.channel === 'whatsapp' || a.channel === 'email') && (
                  <div className="@md:col-span-2">
                    <Field label={a.channel === 'whatsapp' ? 'Mensagem pronta' : 'Texto do e-mail (opcional)'}
                      hint="Já vem escrita para o visitante. Se ele escolher um serviço, o nome do serviço vai junto (ou onde você escrever {servico}).">
                      <textarea rows={2} maxLength={300} className={input} value={a.message ?? ''} placeholder={`${hi} solicitar informações sobre uma avaliação.`}
                        onChange={(e) => setAction(i, { message: e.target.value })} />
                    </Field>
                  </div>
                )}
                {a.channel === 'phone' && (
                  <Field label="Telefone" hint="Só números, com DDD.">
                    <input inputMode="numeric" className={input} placeholder="1133334444" value={a.phone ?? ''} onChange={(e) => setAction(i, { phone: e.target.value.replace(/\D/g, '').slice(0, 15) })} />
                  </Field>
                )}
                {a.channel === 'link' && (
                  <Field label="Link"><input type="url" className={input} placeholder="https://" value={a.url ?? ''} onChange={(e) => setAction(i, { url: e.target.value })} /></Field>
                )}
                {a.channel === 'form' && (
                  <p className="text-[12px] text-muted @md:col-span-2">Abre um formulário curto (nome, WhatsApp ou e-mail e mensagem), com autorização do visitante. Você recebe um aviso por e-mail e vê o contato em Estatísticas.</p>
                )}
              </div>
              {missing && <p className="flex items-center gap-1.5 text-[13px] font-medium text-red-500"><WarningCircle size={15} weight="bold" aria-hidden="true" /> {missing}</p>}
            </div>
          )
        })}
        {k.actions.length < MAX_ACTIONS && (
          <button type="button" className={`${secondary} justify-self-start`}
            onClick={() => set((x) => { x.connect!.actions.push({ id: newId(), label: '', channel: x.whatsapp ? 'whatsapp' : 'form' }) })}>
            <Plus size={15} weight="bold" aria-hidden="true" /> Adicionar ação
          </button>
        )}
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-[13px] font-medium">Serviços, produtos ou oportunidades</p>
          <p className="text-[12px] text-muted">Cada um leva a uma ação. Ex: Clareamento → Solicitar avaliação. A mensagem do WhatsApp já chega dizendo o que a pessoa escolheu.</p>
        </div>
        {(k.services ?? []).map((s, i) => (
          <div key={s.id} className="grid gap-2 rounded-[14px] border border-line p-3 @xl:grid-cols-[1fr_1.2fr_1fr_auto] @xl:items-center">
            <input aria-label="Nome do serviço" placeholder="Ex: Clareamento" maxLength={60} className={input} value={s.name} onChange={(e) => set((x) => { x.connect!.services![i].name = e.target.value })} />
            <input aria-label="Descrição curta (opcional)" placeholder="Descrição curta (opcional)" maxLength={120} className={input} value={s.description ?? ''} onChange={(e) => set((x) => { x.connect!.services![i].description = e.target.value || undefined })} />
            <select aria-label={`Ação de ${s.name || 'serviço'}`} className={input} value={s.action} onChange={(e) => set((x) => { x.connect!.services![i].action = e.target.value })}>
              {!k.actions.some((a) => a.id === s.action) && <option value={s.action}>Escolha a ação</option>}
              {k.actions.map((a) => <option key={a.id} value={a.id}>{a.label || 'Ação sem nome'}</option>)}
            </select>
            <button type="button" className={`${iconBtn} hover:text-red-500`} aria-label={`Remover ${s.name || 'serviço'}`} title="Remover"
              onClick={() => set((x) => { x.connect!.services!.splice(i, 1) })}><Trash size={16} /></button>
          </div>
        ))}
        {(k.services?.length ?? 0) < MAX_SERVICES && (
          <button type="button" className={`${secondary} justify-self-start`} disabled={!k.actions.length}
            onClick={() => set((x) => { (x.connect!.services ??= []).push({ id: newId(), name: '', action: x.connect!.actions[0].id }) })}>
            <Plus size={15} weight="bold" aria-hidden="true" /> Adicionar serviço
          </button>
        )}
      </div>

      <button type="button" className={`${secondary} justify-self-start hover:text-red-500`} onClick={turnOff}>
        <Trash size={15} aria-hidden="true" /> Desligar Conecta
      </button>
    </div>
  )
}
