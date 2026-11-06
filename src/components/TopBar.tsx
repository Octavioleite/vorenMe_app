import { Check, QrCode as QrIcon, ShareNetwork } from '@phosphor-icons/react'
import { useState } from 'react'
import { creator } from '../config/creator'
import { useShare } from '../lib/share'
import { QrDialog } from './QrDialog'
import { vorenHref } from './Footer'
import { ThemeToggle } from './ThemeToggle'
import { ExternalLink } from './ui/ExternalLink'
import { IconButton } from './ui/IconButton'

export function TopBar() {
  const [qrOpen, setQrOpen] = useState(false)
  const { share, copied } = useShare()
  const { labels } = creator

  return (
    <div className="rise flex h-[72px] items-center justify-between" style={{ '--i': 0 } as React.CSSProperties}>
      {/* Logo da plataforma no lugar das iniciais: discreta, leva ao cadastro (rastreado como "topo"). */}
      <ExternalLink href={vorenHref('topo')} aria-label="Cartão criado com VorenMe. Crie o seu grátis" title="Crie o seu cartão grátis"
        className="press block size-10 shrink-0 overflow-hidden rounded-full opacity-90 transition-opacity hover:opacity-100">
        <img src="/favicon.png" alt="" width={40} height={40} className="size-full" />
      </ExternalLink>

      <div className="flex items-center gap-2">
        <IconButton aria-label={labels.showQr} onClick={() => setQrOpen(true)} className="lg:hidden">
          <QrIcon size={19} aria-hidden="true" />
        </IconButton>
        <div className="relative">
          <IconButton aria-label={labels.share} onClick={share}>
            {copied ? <Check size={19} className="text-accent" aria-hidden="true" /> : <ShareNetwork size={19} aria-hidden="true" />}
          </IconButton>
          <span
            role="status"
            className={`pointer-events-none absolute top-full right-0 mt-2 rounded-full bg-ink px-3 py-1.5 text-xs font-medium whitespace-nowrap text-bg transition-opacity duration-300 ${copied ? 'opacity-100' : 'opacity-0'}`}
          >
            {copied ? labels.linkCopied : ''}
          </span>
        </div>
        <ThemeToggle />
      </div>

      <QrDialog open={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  )
}
