import { MagnifyingGlass } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../painel/api'
import { Errors, Thumb, ask, input, secondary } from '../painel/ui'
import { date, fmt, navigate, type Fail } from './Admin'

export interface ModCard {
  id: string; slug: string; template: string; name: string; photo: string | null; bio: string | null
  createAt: string; updateAt: string; disabledAt: string | null; disabledReason: string | null
  user: { id: string; name: string | null; email: string }
}

/** Tira do ar (pede o motivo) ou recoloca. Devolve true se mudou. */
export async function toggleCard(c: { id: string; slug: string; disabledAt: string | null }) {
  if (c.disabledAt) {
    if (!(await ask({ title: `Recolocar /${c.slug} no ar?`, text: 'O cartão volta a abrir normalmente (se a assinatura do dono estiver em dia).', confirm: 'Recolocar' }))) return false
    await api(`/admin/cards/${c.id}/disabled`, 'PUT', { disabled: false })
    return true
  }
  const reason = prompt(`Motivo para tirar /${c.slug} do ar (fica no histórico):`)
  if (reason === null) return false
  await api(`/admin/cards/${c.id}/disabled`, 'PUT', { disabled: true, reason })
  return true
}

/** /admin/cartoes — moderação: os cartões editados por último primeiro. */
export function Cards({ fail }: { fail: Fail }) {
  const q = new URLSearchParams(location.search)
  const [term, setTerm] = useState(q.get('q') ?? '')
  const [data, setData] = useState<{ cards: ModCard[]; total: number; page: number; pageSize: number } | null>(null)
  const [error, setError] = useState('')
  const onlyOff = q.get('disabled') === '1'

  const load = () => api<NonNullable<typeof data>>(`/admin/cards?${q}`).then(setData, (e) => fail(e, setError))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (patch: Record<string, string>) => {
    const next = new URLSearchParams(location.search)
    for (const [k, v] of Object.entries({ page: '', ...patch })) v ? next.set(k, v) : next.delete(k)
    navigate(`/admin/cartoes${next.size ? `?${next}` : ''}`)
  }
  const search = (e: FormEvent) => { e.preventDefault(); go({ q: term.trim() }) }
  const toggle = (c: ModCard) => toggleCard(c).then((changed) => { if (changed) load() }, (e) => fail(e, setError))
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const pill = (on: boolean) => `press shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-medium ${on ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`

  return (
    <div className="rise grid gap-5">
      <div>
        <h1 className="text-[40px] leading-[1.05] font-semibold tracking-[-0.045em]">Cartões</h1>
        <p className="mt-1 text-muted">Os editados por último aparecem primeiro. Confira o conteúdo e tire do ar o que não puder ficar público.</p>
      </div>
      <form onSubmit={search} className="flex gap-2">
        <input type="search" className={`${input} max-w-md`} placeholder="Link do cartão" aria-label="Buscar cartão" value={term} onChange={(e) => setTerm(e.target.value)} />
        <button type="submit" className={secondary} aria-label="Buscar"><MagnifyingGlass size={16} aria-hidden="true" /></button>
      </form>
      <div role="group" aria-label="Filtro" className="flex gap-1 justify-self-start rounded-full bg-[#f5f5f7] p-1">
        <button type="button" aria-pressed={!onlyOff} className={pill(!onlyOff)} onClick={() => go({ disabled: '' })}>Todos</button>
        <button type="button" aria-pressed={onlyOff} className={pill(onlyOff)} onClick={() => go({ disabled: '1' })}>Fora do ar</button>
      </div>

      <Errors text={error} />
      {!data ? !error && <p className="text-sm text-muted">Carregando...</p> : (
        <>
          <p className="text-[13px] text-muted">{fmt(data.total)} cartão(ões)</p>
          {data.cards.length === 0 ? <p className="text-sm text-muted">Nenhum cartão.</p> : (
            <ul className="grid gap-3 md:grid-cols-2">
              {data.cards.map((c) => (
                <li key={c.id} className={`tile flex gap-4 p-4 ${c.disabledAt ? 'ring-2 ring-red-500/30' : ''}`}>
                  <Thumb src={c.photo ?? undefined} className="size-16 rounded-full" fallback={<span className="text-[13px] font-semibold">{(c.name || c.slug)[0]?.toUpperCase()}</span>} />
                  <div className="grid min-w-0 flex-1 content-start gap-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <a href={`/${c.slug}`} target="_blank" rel="noreferrer" className="truncate font-semibold hover:underline">{c.name || c.slug}</a>
                      <span className="shrink-0 text-[12px] text-muted">editado {date(c.updateAt)}</span>
                    </div>
                    <p className="truncate text-[13px] text-muted">/{c.slug} · {c.template}</p>
                    {c.bio && <p className="line-clamp-2 text-[13px]">{c.bio}</p>}
                    <p className="truncate text-[13px]">
                      Dono: <a href={`/admin/usuarios/${c.user.id}`} onClick={(e) => { e.preventDefault(); navigate(`/admin/usuarios/${c.user.id}`) }} className="font-medium hover:underline">{c.user.name || c.user.email}</a>
                    </p>
                    {c.disabledAt && <p className="text-[13px] font-medium text-red-600">Fora do ar desde {date(c.disabledAt)}{c.disabledReason && `: ${c.disabledReason}`}</p>}
                    <button type="button" onClick={() => toggle(c)} className={`mt-1 justify-self-start text-[13px] font-semibold hover:underline ${c.disabledAt ? 'text-accent' : 'text-red-600'}`}>
                      {c.disabledAt ? 'Recolocar no ar' : 'Tirar do ar'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 text-[13px]">
              <button type="button" className={secondary} disabled={data.page <= 1} onClick={() => go({ ...Object.fromEntries(q), page: String(data.page - 1) })}>Anterior</button>
              <span className="text-muted">{data.page} de {pages}</span>
              <button type="button" className={secondary} disabled={data.page >= pages} onClick={() => go({ ...Object.fromEntries(q), page: String(data.page + 1) })}>Próxima</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
