import { DesktopTower, DeviceMobile, DeviceTablet } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type RefObject } from 'react'

/* Resoluções reais (CSS px). O iframe é renderizado nesse tamanho e reduzido com transform,
   então os breakpoints do cartão (md, lg) respondem como no aparelho de verdade. */
const DEVICES = {
  celular: { label: 'Celular', icon: DeviceMobile, w: 390, h: 844, bezel: 10, radius: 44 },
  tablet: { label: 'Tablet', icon: DeviceTablet, w: 820, h: 1180, bezel: 14, radius: 32 },
  computador: { label: 'Computador', icon: DesktopTower, w: 1440, h: 900, bezel: 8, radius: 14 },
} as const
type Device = keyof typeof DEVICES

const KEY = 'vorenme-preview-device'

export function DevicePreview({ frame, src }: { frame: RefObject<HTMLIFrameElement>; src: string }) {
  const [device, setDevice] = useState<Device>(() => {
    try {
      const d = localStorage.getItem(KEY)
      if (d && d in DEVICES) return d as Device
    } catch {
      /* storage indisponível */
    }
    return 'celular'
  })
  const box = useRef<HTMLDivElement>(null)
  const [space, setSpace] = useState({ w: 360, h: 700 })

  // Espaço disponível: largura da coluna e altura da janela (o preview fica fixo ao rolar).
  useEffect(() => {
    const measure = () => setSpace({ w: box.current?.clientWidth ?? 360, h: innerHeight - 170 })
    measure()
    const ro = new ResizeObserver(measure)
    if (box.current) ro.observe(box.current)
    addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      removeEventListener('resize', measure)
    }
  }, [])

  const d = DEVICES[device]
  const outerW = d.w + d.bezel * 2
  const outerH = d.h + d.bezel * 2
  const scale = Math.min(1, space.w / outerW, space.h / outerH)

  const pick = (next: Device) => {
    setDevice(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* ok */
    }
  }

  return (
    <div className="sticky top-24" data-device={device}>
      <div role="radiogroup" aria-label="Tamanho da tela" className="mx-auto mb-4 flex w-fit gap-1 rounded-full border border-line bg-surface p-1">
        {(Object.keys(DEVICES) as Device[]).map((key) => {
          const { label, icon: Icon } = DEVICES[key]
          const on = key === device
          return (
            <button key={key} type="button" role="radio" aria-checked={on} onClick={() => pick(key)}
              className={`press flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium ${on ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink'}`}>
              <Icon size={16} weight={on ? 'fill' : 'regular'} aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>

      <div ref={box} className="grid justify-items-center">
        {/* Caixa no tamanho já reduzido, para o layout em volta não reservar o tamanho real */}
        <div style={{ width: outerW * scale, height: outerH * scale }}>
          <div className="origin-top-left overflow-hidden bg-surface-2 shadow-2xl transition-[width,height] duration-300"
            style={{ width: outerW, height: outerH, padding: d.bezel, borderRadius: d.radius, transform: `scale(${scale})` }}>
            <iframe ref={frame} title={`Pré-visualização do cartão: ${d.label}`} src={src}
              className="block bg-bg" style={{ width: d.w, height: d.h, borderRadius: d.radius - d.bezel }} />
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[13px] text-muted">
        Ao vivo · {d.w} × {d.h}
      </p>
    </div>
  )
}
