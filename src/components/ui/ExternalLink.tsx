import type { AnchorHTMLAttributes } from 'react'

/** Anchor for off-site URLs: new tab + no opener/referrer leakage. mailto:/tel: stay in-tab. */
export function ExternalLink({ href = '', children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const offsite = /^https?:\/\//.test(href)
  return (
    <a href={href} {...(offsite ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
      {children}
    </a>
  )
}
