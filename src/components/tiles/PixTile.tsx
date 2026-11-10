import { Check, Copy, QrCode as QrIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { creator } from '../../config/creator'
import { pixCode } from '../../lib/pix'
import { useCopy } from '../../lib/share'
import { QrCode } from '../QrCode'

function CopyButton({ text, label, done, track }: { text: string; label: string; done: string; track: string }) {
  const { copy, copied, canCopy } = useCopy()
  return (
    <button type="button" disabled={!canCopy} onClick={() => copy(text)} data-track={track} data-copied={copied ? '' : undefined}
      className="coupon-code press flex min-h-[48px] w-full items-center justify-between gap-3 rounded-[var(--radius-ctl)] px-4 text-left text-[15px] font-semibold">
      <span className="min-w-0 truncate">{copied ? done : label}</span>
      {copied ? <Check size={17} weight="bold" aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
      <span aria-live="polite" className="sr-only">{copied ? done : ''}</span>
    </button>
  )
}

/** Pix: copiar a chave, copiar o "copia e cola" e mostrar o QR para pagar de outro celular. */
export function PixTile({ className = '' }: { className?: string }) {
  const { pix } = creator
  const [showQr, setShowQr] = useState(false)
  const code = useMemo(() => (pix ? pixCode(pix) : ''), [pix])
  if (!pix) return null
  return (
    <section aria-labelledby="pix-title" data-reveal className={`tile p-6 ${className}`}>
      <h2 id="pix-title" className="mb-1 text-[13px] font-medium text-muted">Pague com Pix</h2>
      <p className="mb-4 text-[15px]">{pix.name} · <span className="font-mono text-[14px] break-all">{pix.key}</span></p>
      <div className="grid gap-2 sm:grid-cols-2">
        <CopyButton text={pix.key} label="Copiar chave Pix" done="Chave copiada" track="pix" />
        <CopyButton text={code} label="Copiar Pix copia e cola" done="Código copiado" track="pix" />
      </div>
      <button type="button" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr} data-track="pix"
        className="press mt-3 inline-flex items-center gap-1.5 text-sm font-semibold hover:text-accent">
        <QrIcon size={17} aria-hidden="true" />
        {showQr ? 'Esconder QR do Pix' : 'Mostrar QR do Pix'}
      </button>
      {showQr && (
        <div className="mt-4 w-[180px] rounded-[var(--radius-ctl)] bg-[#FAFAF9] p-3 text-[#121214]">
          <QrCode value={code} label={`QR code Pix para ${pix.name}`} className="aspect-square w-full" />
        </div>
      )}
      <p className="mt-3 text-[12px] text-muted">O valor você digita no app do seu banco.</p>
    </section>
  )
}
