import { useState } from 'react'
import { creator } from '../config/creator'
import { pageUrl } from '../config/derived'

/** Native share sheet when available, otherwise copies the link. */
export function useShare() {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const data = { title: creator.seo.title, text: creator.bio, url: pageUrl() }
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data)
      } catch {
        /* user dismissed the sheet */
      }
      return
    }
    try {
      await navigator.clipboard.writeText(data.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }
  return { share, copied }
}

/** Copy arbitrary text with a transient confirmation flag. */
export function useCopy() {
  const [copied, setCopied] = useState(false)
  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked: the mailto link still works */
    }
  }
  return { copy, copied, canCopy }
}
