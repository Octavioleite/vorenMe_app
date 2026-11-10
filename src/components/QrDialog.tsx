import { UserPlus, X } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import { creator } from '../config/creator'
import { fullName, pageUrl } from '../config/derived'
import { tagged } from '../lib/track'
import { QrCode } from './QrCode'
import { SaveContact } from './ui/SaveContact'

/** Full-screen QR to show in person: "scan my card". Native <dialog> gives focus trapping and Esc to close. */
export function QrDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const url = tagged(pageUrl(), 'qr')

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="qr-dialog"
      aria-labelledby="qr-dialog-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[340px] max-w-full rounded-[var(--radius)] border border-line bg-surface p-6 text-ink shadow-[var(--card-shadow)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="qr-dialog-title" className="text-xl font-semibold tracking-[-0.03em]">
              {fullName}
            </h2>
            <p className="mt-0.5 text-sm text-muted">@{creator.username}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={creator.labels.close}
            className="press -mt-1 -mr-2 grid size-11 place-items-center rounded-full hover:bg-surface-2"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-5 rounded-[var(--radius-ctl)] bg-[#FAFAF9] p-4 text-[#121214]">
          <QrCode value={url} label={`QR code para ${url}`} className="aspect-square w-full" />
        </div>
        <p className="mt-4 text-center text-sm text-muted">{creator.labels.qrText}</p>
        <SaveContact className="press mt-5 flex h-12 items-center justify-center gap-2 rounded-[var(--radius-ctl)] bg-accent text-[15px] font-semibold text-accent-fg hover:brightness-110">
          <UserPlus size={19} weight="bold" aria-hidden="true" />
          {creator.labels.saveContact}
        </SaveContact>
      </div>
    </dialog>
  )
}
