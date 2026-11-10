import type { CreatorConfig } from '../config/types'

const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`
const KEY = 'vorenme-session'

export interface User { id: string; name: string | null; email: string; createAt?: string; emailVerified?: boolean }
export interface Session { user: User; accessToken: string; refreshToken: string; support?: { by: string; expiresAt: string } }
export interface Card { id: string; slug: string; template: string; config: CreatorConfig; updateAt: string; disabled?: boolean }
export interface Template { id: string; name: string; category: string; config: CreatorConfig }

export class ApiError extends Error {
  constructor(message: string, public status: number, public errors: string[] = []) {
    super(message)
  }
}

/* Acesso do suporte: o admin abre /painel#suporte=<sessão> numa aba nova. A sessão fica só no
   sessionStorage daquela aba (a conta do admin no localStorage não é tocada). "null" = acesso encerrado. */
const SUPPORT = 'vorenme-support'
try {
  const m = location.hash.match(/^#suporte=(.+)$/)
  if (m) {
    sessionStorage.setItem(SUPPORT, decodeURIComponent(m[1]))
    history.replaceState(null, '', location.pathname + location.search)
  }
} catch { /* sem sessionStorage: segue normal */ }
export const supportTab = () => {
  try { return sessionStorage.getItem(SUPPORT) !== null } catch { return false }
}

export const session = {
  get(): Session | null {
    try {
      return JSON.parse((supportTab() ? sessionStorage.getItem(SUPPORT) : localStorage.getItem(KEY)) ?? 'null')
    } catch {
      return null
    }
  },
  set(s: Session | null) {
    if (supportTab()) return sessionStorage.setItem(SUPPORT, JSON.stringify(s))
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  },
}

/** fetch na API com o access token; num 401 tenta o refresh uma vez e repete. */
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const send = () =>
    fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': body instanceof Blob ? body.type : 'application/json',
        ...(session.get() && { Authorization: `Bearer ${session.get()!.accessToken}` }),
      },
      body: body === undefined ? undefined : body instanceof Blob ? body : JSON.stringify(body),
    })

  let res = await send()
  const s = session.get()
  if (res.status === 401 && s && !path.startsWith('/auth/')) {
    const r = await fetch(`${BASE}/auth/refresh-token`, { method: 'POST', headers: { 'x-refresh-token': s.refreshToken } })
    if (r.ok) {
      session.set({ ...s, ...(await r.json()).data })
      res = await send()
    } else {
      session.set(null)
    }
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(json.message ?? `Erro ${res.status}`, res.status, json.errors)
  return json.data as T
}

/** Reduz a foto no navegador (lado maior até `max` px, WebP) e envia. Devolve o link público. */
export async function uploadImage(file: File, max = 1600): Promise<string> {
  if (!file.type.startsWith('image/')) throw new ApiError('Escolha um arquivo de imagem.', 400)
  const bmp = await createImageBitmap(file).catch(() => {
    throw new ApiError('Não foi possível ler essa imagem. Tente JPG ou PNG.', 400)
  })
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) })
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  // Safari antigo não gera WebP e devolve PNG: aí cai para JPEG.
  const toBlob = (type: string) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, 0.85))
  let blob = await toBlob('image/webp')
  if (blob?.type !== 'image/webp') blob = await toBlob('image/jpeg')
  if (!blob) throw new ApiError('Não foi possível processar a imagem.', 400)
  const { id } = await api<{ id: string }>('/images', 'POST', blob)
  return `${BASE}/images/${id}`
}
