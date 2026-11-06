import { useMemo, type AnchorHTMLAttributes } from 'react'
import { buildVCard, vcardFileName } from '../../lib/vcard'

/** Downloads a .vcf so the visitor can add the creator straight to their phone's contacts. */
export function SaveContact({ children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const href = useMemo(() => `data:text/vcard;charset=utf-8,${encodeURIComponent(buildVCard())}`, [])
  return (
    <a href={href} download={vcardFileName()} {...rest}>
      {children}
    </a>
  )
}
