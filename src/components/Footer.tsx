import { creator } from '../config/creator'
import { fullName } from '../config/derived'
import { ArrowUpRight } from '@phosphor-icons/react'
import { ExternalLink } from './ui/ExternalLink'

// Selo da plataforma: é o canal de aquisição da VorenMe, por isso não sai da config do cartão (não dá para esconder ou trocar o texto).
// VITE_VOREN_URL = landing page quando existir; sem ela, vai direto para o cadastro do painel.
// ponytail: o slug vai só na UTM; gravar "indicado por" no usuário quando houver programa de indicação.
export const vorenHref = (medium: 'selo' | 'topo' = 'selo') => {
  const base = import.meta.env.VITE_VOREN_URL || `${location.origin}/painel`
  const slug = location.pathname.split('/').filter(Boolean)[0] ?? 'cartao'
  return `${base}?cadastro=1&utm_source=cartao&utm_medium=${medium}&utm_campaign=${encodeURIComponent(slug)}`
}

export function Footer() {
  const { website } = creator
  return (
    <footer className="mt-16 flex flex-col gap-3 border-t border-line pt-6 pb-32 text-sm text-muted md:flex-row md:items-center md:justify-between md:pb-12 lg:mt-24">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-semibold text-ink">{fullName}</span>
        <span>© {new Date().getFullYear()}</span>
        {website && (
          <ExternalLink href={website.url} className="underline-offset-4 transition-colors hover:text-ink hover:underline">
            {website.label}
          </ExternalLink>
        )}
      </p>
      <ExternalLink
        href={vorenHref()}
        className="press group inline-flex items-center gap-2.5 self-start rounded-full border border-line bg-surface py-1.5 pr-3.5 pl-1.5 text-[13px] transition-colors hover:border-line-strong hover:bg-surface-2 md:self-auto"
      >
        <img src="/favicon.png" alt="" width={24} height={24} className="rounded-full" />
        <span>
          <span className="text-muted">Feito com </span>
          <span className="font-semibold text-ink">VorenMe</span>
          <span className="text-muted"> · Crie o seu grátis</span>
        </span>
        <ArrowUpRight size={14} weight="bold" aria-hidden="true" className="text-muted transition-transform group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-ink" />
      </ExternalLink>
    </footer>
  )
}
