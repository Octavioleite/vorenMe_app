import {
  ArrowLeft, ArrowRight, ChartLineUp, ChatCircleText, Check, CreditCard, CurrencyDollar, EnvelopeSimple, Eye, IdentificationCard, LinkSimple, ListBullets, MapPin, Megaphone,
  Palette, Plus, Printer, Question, ShareNetwork, Sparkle, SquaresFour, Star, TextAa, Ticket, X, type Icon,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { iconBtn, primary, secondary } from './ui'

type Step = { id: string; chapter: string; icon: Icon; title: string; text: string; tips: string[]; section?: string }

/** Do zero ao cartão divulgado. Os textos seguem o que as telas fazem de verdade (Cards, Editor, PrintKit, Stats, Billing).
 *  `section` = id da seção no Editor (NAV em Editor.tsx): lá dentro, o passo ganha o botão "Mostrar no editor". */
const STEPS: Step[] = [
  // Começar
  { id: 'email', chapter: 'Começar', icon: EnvelopeSimple, title: 'Confirme seu e-mail',
    text: 'Logo depois do cadastro, enviamos um link para o seu e-mail. Abra esse link para liberar a criação de cartões.',
    tips: ['Enquanto o e-mail não for confirmado, o botão Novo cartão não aparece.', 'Não chegou? Olhe a caixa de spam ou toque em Suporte, no topo da tela.'] },
  { id: 'modelo', chapter: 'Começar', icon: SquaresFour, title: 'Escolha um modelo',
    text: 'Na tela Cartões, toque em Novo cartão. Aparece uma grade de modelos prontos, cada um pensado para um tipo de negócio.',
    tips: ['Use a busca (barbearia, unhas, dentista...) ou os filtros por categoria.', 'Escolha o mais parecido com você. Foto, cores e textos você troca depois.', 'Escolheu errado? Toque em Trocar modelo antes de criar.'] },
  { id: 'endereco', chapter: 'Começar', icon: LinkSimple, title: 'Escolha seu endereço',
    text: 'O endereço é o final do link que você vai mandar para os clientes. Sugerimos um pelo seu nome, mas você pode mudar.',
    tips: ['De 3 a 31 caracteres: letras minúsculas, números, ponto, hífen ou _.', 'Se aparecer "já está em uso", tente outra variação, como o nome da cidade no final.', 'Toque em Criar cartão. O editor abre na hora.'] },

  // Montar o cartão
  { id: 'identidade', chapter: 'Montar', section: 'identidade', icon: IdentificationCard, title: 'Sobre você',
    text: 'É a parte de cima do cartão, a primeira coisa que o cliente vê. Preencha nome, sobrenome, especialidade e cidade.',
    tips: ['Especialidade é o que você faz, ex: "Psicóloga · CRP 06/000000" ou "Barbeiro".', 'A bio ideal tem até 20 palavras. O contador avisa se passar.', 'O @ exibido e o link do cartão ficam em Configurações avançadas, no fim do editor.'] },
  { id: 'foto', chapter: 'Montar', section: 'identidade', icon: TextAa, title: 'Foto e textos sobre a foto',
    text: 'Troque a foto do modelo por uma sua. Ela ocupa o fundo do cartão, com seu nome por cima.',
    tips: ['Prefira foto vertical, com o rosto bem visível e boa luz.', 'Na prévia ao lado, arraste cada texto para mudar de lugar e puxe a bolinha do canto para mudar o tamanho.', 'Ficou estranho? Em Configurações avançadas, toque em Restaurar padrão.'] },
  { id: 'aparencia', chapter: 'Montar', section: 'aparencia', icon: Palette, title: 'Visual',
    text: 'Defina o estilo do cartão, a cor de destaque e se ele abre claro ou escuro.',
    tips: ['Cada estilo muda as fontes e o clima: Tinta para barbearia, Clínica para saúde, Glam para unhas.', 'A cor de destaque vai nos botões. Toque no + para usar a cor exata da sua marca.', 'O texto sobre a cor ajusta sozinho para continuar legível.'] },
  { id: 'contato', chapter: 'Montar', section: 'contato', icon: ChatCircleText, title: 'Contato',
    text: 'É o que faz o cliente falar com você. O botão de WhatsApp já abre a conversa com uma mensagem pronta.',
    tips: ['Digite o WhatsApp com DDD, do jeito que quiser. Ex: (11) 98765-4321.', 'Escreva a mensagem pronta como o cliente falaria: "Oi! Vi seu cartão e quero agendar."', 'E-mail, site e disponibilidade são opcionais. Vazios, não aparecem.'] },
  { id: 'redes', chapter: 'Montar', section: 'redes', icon: LinkSimple, title: 'Redes e links',
    text: 'Toque na rede que quer adicionar: Instagram, TikTok, YouTube, Pinterest, Spotify, X ou site.',
    tips: ['Escreva só o @ ou cole o link do perfil. O resto a gente monta.', 'Para remover, toque na lixeira ao lado.'] },

  // Extras (todos opcionais)
  { id: 'local', chapter: 'Extras', section: 'local', icon: MapPin, title: 'Endereço e avaliações',
    text: 'Se você atende em um lugar físico, o cliente chega com um toque pelo Google Maps, Waze ou Uber.',
    tips: ['Digite o endereço como digitaria no Google Maps.', 'Adicione os horários de funcionamento, ex: "Seg a Sex" e "9h às 18h".', 'O link de avaliação do Google fica no Perfil da Empresa, em Pedir avaliações.'] },
  { id: 'pix', chapter: 'Extras', section: 'pix', icon: CurrencyDollar, title: 'Pix',
    text: 'O cliente copia sua chave ou o Pix copia e cola direto do cartão, sem pedir no WhatsApp.',
    tips: ['Aceita CPF, CNPJ, e-mail, celular (+55...) ou chave aleatória.', 'Confira nome e cidade: é o que aparece no banco de quem paga.'] },
  { id: 'chamada', chapter: 'Extras', section: 'chamada', icon: Megaphone, title: 'Chamada principal',
    text: 'É o convite para trabalhar com você: um título, um texto curto e etiquetas.',
    tips: ['Ex: título "Agende sua avaliação", etiquetas "Convênios", "Atendimento online".', 'Nas etiquetas, digite e aperte Enter para cada uma.'] },
  { id: 'cupons', chapter: 'Extras', section: 'cupons', icon: Ticket, title: 'Cupons de desconto',
    text: 'Códigos de marcas parceiras que o visitante copia com um toque.',
    tips: ['Preencha marca, código e o desconto, ex: "15% OFF".', 'Sem nenhum cupom, a seção some do cartão.'] },
  { id: 'destaque', chapter: 'Extras', section: 'destaque', icon: Star, title: 'Destaque',
    text: 'Um vídeo, post ou projeto em evidência, com imagem grande.',
    tips: ['Use uma imagem horizontal, como a capa de um vídeo.', 'Cole o link de onde está o conteúdo e escolha o tipo: vídeo, post ou projeto.'] },
  { id: 'extra', chapter: 'Extras', section: 'extra', icon: Sparkle, title: 'Bloco extra',
    text: 'Um bloco livre para o que quiser mostrar: especialidades, convênios aceitos, o que está fazendo agora.',
    tips: ['Você escolhe o título do bloco.', 'Com um link, aparece o botão Ver mais.'] },
  { id: 'marcas', chapter: 'Extras', section: 'marcas', icon: ListBullets, title: 'Marcas parceiras',
    text: 'Marcas com quem você já trabalhou. Coloque só parcerias de verdade.',
    tips: ['O logo é opcional: cole o link da imagem.'] },
  { id: 'compartilhar', chapter: 'Extras', section: 'compartilhar', icon: ShareNetwork, title: 'Como o link aparece',
    text: 'Título e descrição que aparecem quando alguém manda seu link no WhatsApp ou procura no Google.',
    tips: ['Ex: "Ana Lima · Nail designer em Campinas".'] },

  // Divulgar
  { id: 'salvar', chapter: 'Divulgar', icon: Eye, title: 'Salve e confira',
    text: 'Tudo é salvo sozinho enquanto você edita. O selo no topo mostra Salvando... e depois Salvo.',
    tips: ['Se aparecer Não salvo, leia o aviso em vermelho e corrija o campo indicado.', 'Toque em Abrir para ver o cartão como o cliente vê. No celular, use Ver prévia.', 'Mudar o endereço depois faz o link e os QR codes antigos pararem de funcionar.'] },
  { id: 'divulgar', chapter: 'Divulgar', icon: Printer, title: 'Divulgue',
    text: 'Na tela Cartões, o botão de link copia seu endereço para colar na bio, no WhatsApp ou onde quiser.',
    tips: ['Na aba Imprimir, gere QR codes prontos para balcão, mesa e cartão de visita.', 'Escreva uma frase de chamada, escolha quantas cópias e imprima.'] },
  { id: 'stats', chapter: 'Divulgar', icon: ChartLineUp, title: 'Acompanhe os resultados',
    text: 'Na aba Estatísticas, escolha o cartão e veja visitas, cliques e de onde as pessoas vieram.',
    tips: ['Veja o que mais clicam (WhatsApp, Instagram, Pix...) e os horários de pico.', 'Toque numa origem para filtrar só as visitas dela.'] },
  { id: 'assinatura', chapter: 'Divulgar', icon: CreditCard, title: 'Assinatura',
    text: 'Você começa com 3 dias grátis. Para o cartão continuar no ar depois disso, assine no menu da sua conta, em Assinatura.',
    tips: ['Um plano só, R$ 9,99 por mês, com tudo incluso. Você pode ter até 3 cartões.', 'Indique amigos pelo seu link e ganhe meses grátis.'] },
]
const CHAPTERS = ['Começar', 'Montar', 'Extras', 'Divulgar']

const SEEN = 'vorenme:guide-seen'
const seen = () => { try { return !!localStorage.getItem(SEEN) } catch { return true } }
const markSeen = () => { try { localStorage.setItem(SEEN, '1') } catch { /* sem storage: só não lembra */ } }

/** Botão que abre o tutorial.
 *  autoOpen: abre sozinho na primeira visita. onStart: no fim de "Começar" o botão vira "Criar meu cartão".
 *  onSection: (dentro do editor) mostra "Mostrar no editor" nos passos de seção. start: passo inicial. */
export function GuideButton({ onStart, onSection, verified = true, autoOpen, compact, start }: {
  onStart?: () => void; onSection?: (id: string) => void; verified?: boolean; autoOpen?: boolean; compact?: boolean; start?: string
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const next = useRef<HTMLButtonElement>(null)
  const steps = verified ? STEPS.filter((s) => s.id !== 'email') : STEPS
  const startAt = Math.max(0, steps.findIndex((s) => s.id === start))
  const [i, setI] = useState(startAt)
  const step = steps[Math.min(i, steps.length - 1)]
  const last = i >= steps.length - 1
  // Quem ainda não tem cartão pode criar logo depois de aprender a criar; o resto do guia continua acessível.
  const createNow = !!onStart && verified && step.id === 'endereco'

  const open = () => { setI(startAt); dialog.current?.showModal(); next.current?.focus(); markSeen() }
  // showModal() focaria o X; o foco fica sempre na ação principal.
  useEffect(() => { if (dialog.current?.open) next.current?.focus() }, [i])
  useEffect(() => { if (autoOpen && !seen()) open() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => dialog.current?.close()
  const go = (d: number) => setI((n) => Math.max(0, Math.min(steps.length - 1, n + d)))
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(1)
    if (e.key === 'ArrowLeft') go(-1)
  }
  const Icon = step.icon

  return (
    <>
      {compact ? (
        <button type="button" onClick={open} aria-haspopup="dialog" className={iconBtn} aria-label="Tutorial: como criar um cartão" title="Tutorial">
          <Question size={18} />
        </button>
      ) : (
        <button type="button" onClick={open} aria-haspopup="dialog" className={`${secondary} h-12 px-6 text-[15px]`}>
          <Question size={17} aria-hidden="true" /> Ver tutorial
        </button>
      )}

      <dialog ref={dialog} className="qr-dialog w-[520px]" aria-labelledby="guide-title" aria-describedby="guide-text"
        onKeyDown={onKey} onClick={(e) => e.target === e.currentTarget && close()}>
        <div className="tile flex max-h-[calc(100dvh-32px)] flex-col overflow-hidden">
          {/* Capítulos: pular direto para a parte que interessa */}
          <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
            <nav aria-label="Partes do tutorial" className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
              {CHAPTERS.map((ch) => {
                const at = steps.findIndex((s) => s.chapter === ch)
                const on = step.chapter === ch
                return (
                  <button key={ch} type="button" onClick={() => setI(at)} aria-current={on ? 'step' : undefined}
                    className={`press shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${on ? 'bg-ink text-bg' : 'bg-[#f2f2f4] text-muted hover:text-ink'}`}>
                    {ch}
                  </button>
                )
              })}
            </nav>
            <button type="button" className={`${iconBtn} size-9`} onClick={close} aria-label="Fechar tutorial">
              <X size={16} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-7">
            <div key={step.id} className="step-in" style={{ animationDelay: '0s' }}>
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-[16px] bg-accent/12 text-accent">
                  <Icon size={24} weight="bold" aria-hidden="true" />
                </span>
                <p className="text-[13px] font-medium text-muted" aria-live="polite">{i + 1} de {steps.length}</p>
              </div>
              <h2 id="guide-title" className="mt-4 text-[26px] leading-[1.1] font-semibold tracking-[-0.03em]">{step.title}</h2>
              <p id="guide-text" className="mt-2 text-[16px] leading-relaxed text-ink/80">{step.text}</p>
              {step.id === 'endereco' && (
                <p className="mt-4 rounded-[12px] bg-[#f2f2f4] px-3.5 py-2.5 text-[15px]">
                  <span className="text-muted">{location.host}/</span><span className="font-semibold">seunome</span>
                </p>
              )}
              <ul className="mt-5 grid gap-2.5">
                {step.tips.map((t) => (
                  <li key={t} className="flex gap-2.5 text-[14px] leading-snug">
                    <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              {onSection && step.section && (
                <button type="button" onClick={() => { close(); onSection(step.section!) }}
                  className="press mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent hover:underline">
                  Mostrar no editor <ArrowRight size={14} weight="bold" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-line px-4 py-4 sm:px-6">
            <div className="h-1 overflow-hidden rounded-full bg-black/6" aria-hidden="true">
              <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => (i ? go(-1) : close())} className={secondary}>
                {i ? <><ArrowLeft size={16} weight="bold" aria-hidden="true" /> Voltar</> : 'Pular'}
              </button>
              {createNow ? (
                <button type="button" ref={next} onClick={() => { close(); onStart!() }} className={primary}>
                  <Plus size={16} weight="bold" aria-hidden="true" /> Criar meu cartão
                </button>
              ) : last ? (
                <button type="button" ref={next} onClick={close} className={primary}>Concluir</button>
              ) : (
                <button type="button" ref={next} onClick={() => go(1)} className={primary}>
                  Próximo <ArrowRight size={16} weight="bold" aria-hidden="true" />
                </button>
              )}
            </div>
            {createNow && (
              <button type="button" onClick={() => go(1)} className="mt-3 w-full text-center text-[13px] font-medium text-muted hover:text-ink">
                Continuar o tutorial antes
              </button>
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}
