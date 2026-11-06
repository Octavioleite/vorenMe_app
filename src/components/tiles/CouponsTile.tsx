import { ArrowUpRight, Check, Copy, Scissors } from '@phosphor-icons/react'
import { creator } from '../../config/creator'
import type { Coupon } from '../../config/types'
import { useCopy } from '../../lib/share'
import { ExternalLink } from '../ui/ExternalLink'

function CouponRow({ c }: { c: Coupon }) {
  const { copy, copied, canCopy } = useCopy()
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto_auto]">
      <div className="min-w-0">
        {c.discount && <p className="text-[22px] leading-tight font-semibold tracking-[-0.03em] text-accent">{c.discount}</p>}
        {c.url ? (
          <ExternalLink href={c.url} className="press inline-flex items-center gap-1 text-[15px] font-medium hover:underline">
            {c.brand}
            <ArrowUpRight size={14} className="nudge" aria-hidden="true" />
          </ExternalLink>
        ) : (
          <p className="text-[15px] font-medium">{c.brand}</p>
        )}
      </div>
      <button
        type="button"
        disabled={!canCopy}
        onClick={() => copy(c.code)}
        data-copied={copied ? '' : undefined}
        aria-label={`Copiar cupom ${c.code}`}
        className="coupon-code press col-span-2 flex items-center justify-between gap-3 rounded-[var(--radius-ctl)] px-4 py-2.5 font-mono text-[15px] font-semibold tracking-wider sm:col-span-1 sm:col-start-3"
      >
        {c.code}
        {copied ? <Check size={17} weight="bold" aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
      </button>
      <span aria-live="polite" className="sr-only">{copied ? 'Cupom copiado' : ''}</span>
    </li>
  )
}

/** Discount codes: the visitor's reason to come back. Rendered only when coupons exist. */
export function CouponsTile({ className = '' }: { className?: string }) {
  const coupons = creator.coupons ?? []
  if (coupons.length === 0) return null
  return (
    <section aria-labelledby="coupons-title" data-reveal className={`tile p-6 ${className}`}>
      <h2 id="coupons-title" className="mb-5 flex items-center gap-2 text-[13px] font-medium text-muted">
        <Scissors size={16} aria-hidden="true" />
        Cupons de desconto
      </h2>
      <ul className="divide-y divide-dashed divide-line-strong">
        {coupons.map((c) => <CouponRow key={c.brand + c.code} c={c} />)}
      </ul>
    </section>
  )
}
