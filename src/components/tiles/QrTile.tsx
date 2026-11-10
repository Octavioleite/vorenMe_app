import { UserPlus } from '@phosphor-icons/react'
import { creator } from '../../config/creator'
import { pageUrl } from '../../config/derived'
import { tagged } from '../../lib/track'
import { QrCode } from '../QrCode'
import { SaveContact } from '../ui/SaveContact'

/** Desktop only: a pass the visitor "tears off" to their phone. (On mobile the QR lives in the top bar.)
 *  The tear line sits at .ticket's --notch-y (index.css): keep the QR box at 112px + mt-5. */
export function QrTile({ className = '' }: { className?: string }) {
  const url = tagged(pageUrl(), 'qr')
  const { labels } = creator
  return (
    <section aria-labelledby="qr-title" data-reveal className={`tile ticket flex-col p-6 ${className}`}>
      <div className="relative w-[112px] rounded-[var(--radius-ctl)] bg-[#FAFAF9] p-2.5 text-[#121214]">
        <QrCode value={url} label={`QR code para ${url}`} className="aspect-square w-full" />
        <span aria-hidden="true" className="scan" />
      </div>
      <div aria-hidden="true" className="-mx-6 mt-5 border-t border-dashed border-line-strong" />
      <h2 id="qr-title" className="mt-5 text-lg font-semibold tracking-[-0.02em]">
        {labels.qrTitle}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">{labels.qrText}</p>
      <SaveContact className="press mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold hover:text-accent">
        <UserPlus size={17} weight="bold" aria-hidden="true" />
        {labels.saveContact}
      </SaveContact>
    </section>
  )
}
