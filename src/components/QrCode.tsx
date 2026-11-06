import { useMemo } from 'react'
import { encode } from 'uqr'

/** Crisp vector QR code; inherits `color` for the modules. Wrap it in a light surface with padding (quiet zone). */
export function QrCode({ value, label, className = '' }: { value: string; label: string; className?: string }) {
  const { d, size } = useMemo(() => {
    const qr = encode(value, { ecc: 'M', border: 0 })
    let path = ''
    qr.data.forEach((row, y) =>
      row.forEach((on, x) => {
        if (on) path += `M${x} ${y}h1v1h-1z`
      }),
    )
    return { d: path, size: qr.size }
  }, [value])

  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges" className={className}>
      <path d={d} fill="currentColor" />
    </svg>
  )
}
