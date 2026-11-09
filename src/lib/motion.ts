import { useEffect, useRef } from 'react'

/** Pointer-driven 3D tilt. Writes CSS variables directly (no React re-renders).
 *  Only on hover-capable fine pointers and when the user allows motion. */
export function useTilt<T extends HTMLElement>(max = 7) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return
    let raf = 0
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--ry', `${(x - 0.5) * max}deg`)
        el.style.setProperty('--rx', `${(0.5 - y) * max}deg`)
        el.style.setProperty('--mx', `${x * 100}%`)
        el.style.setProperty('--my', `${y * 100}%`)
        el.dataset.tilting = ''
      })
    }
    const leave = () => {
      cancelAnimationFrame(raf)
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
      delete el.dataset.tilting
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [max])
  return ref
}

/** Marks [data-reveal] elements as shown when they scroll into view.
 *  The `reveal-ready` class is set before first paint by the head script (vite.config.ts). */
/** `dep`: re-scan when content that renders later (e.g. after a fetch) changes. */
export function useReveal(dep?: unknown) {
  useEffect(() => {
    if (!document.documentElement.classList.contains('reveal-ready')) return
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          ;(e.target as HTMLElement).dataset.shown = ''
          io.unobserve(e.target)
        }),
      { rootMargin: '0px 0px -6% 0px', threshold: 0.1 },
    )
    document.querySelectorAll('[data-reveal]:not([data-shown])').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [dep])
}
