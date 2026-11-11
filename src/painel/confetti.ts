/** Chuva de confete em tela cheia, saindo dos dois cantos de baixo. Canvas puro, some sozinha.
 *  Fica numa camada "popover" para aparecer por cima de um <dialog> aberto. Movimento reduzido: não faz nada. */
export function confetti(colors: string[]) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const c = document.createElement('canvas')
  c.setAttribute('popover', 'manual')
  c.setAttribute('aria-hidden', 'true')
  c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;pointer-events:none;overflow:visible'
  document.body.append(c)
  try { c.showPopover() } catch { /* navegador sem popover: fica atrás do diálogo, mas aparece */ }

  const W = innerWidth, H = innerHeight, dpr = devicePixelRatio || 1
  c.width = W * dpr
  c.height = H * dpr
  const ctx = c.getContext('2d')!
  ctx.scale(dpr, dpr)

  const parts = Array.from({ length: 180 }, (_, i) => {
    const left = i % 2 === 0
    const angle = ((left ? -62 : -118) * Math.PI) / 180 + (Math.random() - 0.5) * 0.8
    const speed = 11 + Math.random() * 10
    return {
      x: left ? -10 : W + 10, y: H * 0.95,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
      w: 6 + Math.random() * 6, h: 4 + Math.random() * 6,
      color: colors[i % colors.length],
    }
  })

  const LIFE = 3400
  const start = performance.now()
  let last = start
  const frame = (t: number) => {
    const age = t - start
    const dt = Math.min(3, (t - last) / 16.67) // mesma velocidade em telas de 60 e 120 Hz
    last = t
    ctx.clearRect(0, 0, W, H)
    ctx.globalAlpha = Math.min(1, Math.max(0, (LIFE - age) / 700))
    for (const p of parts) {
      p.vy += 0.32 * dt
      p.vx *= 0.985 ** dt
      p.vy *= 0.985 ** dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.r += p.vr * dt
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.r)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))) // "gira" no ar
      ctx.restore()
    }
    if (age < LIFE) requestAnimationFrame(frame)
    else c.remove()
  }
  requestAnimationFrame(frame)
}
