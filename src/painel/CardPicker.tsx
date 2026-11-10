import { ArrowRight } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { api, ApiError, type Card } from './api'
import { Errors, Thumb, errorText } from './ui'

/** Passo 1 de Estatísticas e Imprimir: escolher o cartão. */
export function CardPicker({ title, text, onPick, onAuthLost }: { title: string; text: string; onPick: (id: string) => void; onAuthLost: () => void }) {
  const [cards, setCards] = useState<Card[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Card[]>('/cards').then(setCards, (e) => (e instanceof ApiError && e.status === 401 ? onAuthLost() : setError(errorText(e))))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rise grid gap-6">
      <div>
        <h1 className="text-[40px] leading-[1.02] font-semibold tracking-[-0.045em]">{title}</h1>
        <p className="mt-2 text-[17px] text-muted">{text}</p>
      </div>
      <Errors text={error} />
      {cards === null && !error && <p className="text-sm text-muted">Carregando seus cartões...</p>}
      {cards?.length === 0 && <p className="text-muted">Você ainda não tem cartões. Crie um na aba Cartões.</p>}
      {cards && cards.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onPick(c.id)}
                className="tile press group flex w-full items-center gap-4 p-4 text-left hover:bg-surface-2/60">
                <Thumb src={c.config.photo?.src} className="size-14 rounded-full" fallback={c.config.name.first[0]} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{`${c.config.name.first} ${c.config.name.last}`.trim()}</span>
                  <span className="block truncate text-[14px] text-muted">/{c.slug}</span>
                </span>
                <ArrowRight size={18} className="text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
