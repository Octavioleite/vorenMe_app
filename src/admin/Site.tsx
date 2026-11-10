import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../painel/api'
import { Errors, input, secondary } from '../painel/ui'
import { Bars, Kpi, dayLabel, fmt, ymd, type Fail } from './Admin'

/** /admin/site — página inicial (/): de onde vêm as visitas e os cadastros. */
type Counts = { views: number; visitors: number; cta: number; signups: number; paid: number }
interface SiteData {
  from: string; to: string; days: number
  totals: Counts
  byDay: (Counts & { day: string })[]
  bySource: (Counts & { source: string })[]
  byCampaign: (Counts & { source: string; campaign: string })[]
  byDevice: { device: string; views: number }[]
}

const PRESETS = [7, 30, 90]
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : '—')

function Table({ title, note, rows, label }: { title: string; note: string; rows: (Counts & { key: string })[]; label: string }) {
  return (
    <section className="tile grid content-start gap-3 p-5 sm:p-6">
      <div>
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <p className="text-[13px] text-muted">{note}</p>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted">Nada no período.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] tabular-nums">
            <thead className="text-[12px] text-muted">
              <tr>{[label, 'Visitantes', 'Visitas', 'Cliques em testar', 'Cadastros', 'Conversão', 'Pagaram'].map((h, i) =>
                <th key={h} className={`py-2 pr-3 font-medium ${i ? 'text-right' : ''}`}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-line">
                  <td className="max-w-[260px] truncate py-2.5 pr-3 font-medium" title={r.key}>{r.key}</td>
                  <td className="py-2.5 pr-3 text-right">{fmt(r.visitors)}</td>
                  <td className="py-2.5 pr-3 text-right text-muted">{fmt(r.views)}</td>
                  <td className="py-2.5 pr-3 text-right">{fmt(r.cta)}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold">{fmt(r.signups)}</td>
                  <td className="py-2.5 pr-3 text-right">{pct(r.signups, r.visitors)}</td>
                  <td className="py-2.5 pr-3 text-right">{fmt(r.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function Site({ fail }: { fail: Fail }) {
  const today = ymd(new Date())
  const last = (n: number) => ({ from: ymd(new Date(Date.now() - (n - 1) * 864e5)), to: today })
  // preset 0 = personalizado (datas escolhidas à mão).
  const [preset, setPreset] = useState(30)
  const [range, setRange] = useState(() => last(30))
  const [draft, setDraft] = useState(range)
  const [d, setD] = useState<SiteData | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    setD(null)
    setError('')
    api<SiteData>(`/admin/site?from=${range.from}&to=${range.to}`).then(setD, (e) => fail(e, setError))
  }, [range.from, range.to]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (n: number) => { setPreset(n); if (n) { setRange(last(n)); setDraft(last(n)) } }
  const apply = (e: FormEvent) => { e.preventDefault(); if (draft.from && draft.to && draft.from <= draft.to) setRange(draft) }

  const t = d?.totals
  const devices = d?.byDevice.reduce((a, x) => a + x.views, 0) ?? 0
  return (
    <div className="rise grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[40px] leading-[1.05] font-semibold tracking-[-0.045em]">Site</h1>
          <p className="text-[15px] text-muted">Página inicial: de onde vêm as visitas e os cadastros (utm, anúncios, redes, selo dos cartões).</p>
        </div>
        <div className="flex gap-1 rounded-full bg-[#f5f5f7] p-1" role="group" aria-label="Período">
          {[...PRESETS, 0].map((n) => (
            <button key={n} type="button" aria-pressed={preset === n} onClick={() => pick(n)}
              className={`press rounded-full px-4 py-1.5 text-[14px] font-medium ${preset === n ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>{n ? `${n} dias` : 'Personalizado'}</button>
          ))}
        </div>
      </div>

      {preset === 0 && (
        <form onSubmit={apply} className="tile flex flex-wrap items-end gap-3 p-4">
          <label className="grid gap-1.5 text-[13px] font-medium">De
            <input type="date" required className={`${input} w-auto`} value={draft.from} max={draft.to || today} onChange={(e) => setDraft((x) => ({ ...x, from: e.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-[13px] font-medium">Até
            <input type="date" required className={`${input} w-auto`} value={draft.to} min={draft.from} max={today} onChange={(e) => setDraft((x) => ({ ...x, to: e.target.value }))} />
          </label>
          <button type="submit" className={secondary} disabled={!draft.from || !draft.to || draft.from > draft.to}>Aplicar</button>
          <span className="text-[13px] text-muted">Até 1 ano por consulta.</span>
        </form>
      )}

      <Errors text={error} />
      {!d || !t ? !error && <p className="text-sm text-muted">Carregando...</p> : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Indicadores">
            <Kpi label="Visitantes" value={fmt(t.visitors)} sub={`${fmt(t.views)} visitas`} />
            <Kpi label="Cliques em testar" value={fmt(t.cta)} sub={`${pct(t.cta, t.views)} das visitas`} />
            <Kpi label="Cadastros" value={fmt(t.signups)} sub="Todas as origens, inclusive direto no painel" />
            <Kpi label="Conversão" value={pct(t.signups, t.visitors)} sub="Cadastros por visitante" />
            <Kpi label="Pagaram" value={fmt(t.paid)} sub={`${pct(t.paid, t.signups)} dos cadastros do período`} />
          </section>

          <div className="grid gap-3 lg:grid-cols-2">
            <Bars title="Visitas por dia" total={`${fmt(t.views)} de ${dayLabel(d.from)} a ${dayLabel(d.to)}`}
              rows={d.byDay.map((x) => ({ key: x.day, label: dayLabel(x.day), value: x.views, tip: `${x.visitors} visitante(s) · ${x.cta} clique(s) · ${x.signups} cadastro(s)` }))} />
            <Bars title="Cadastros por dia" total={`${fmt(t.signups)} de ${dayLabel(d.from)} a ${dayLabel(d.to)}`}
              rows={d.byDay.map((x) => ({ key: x.day, label: dayLabel(x.day), value: x.signups, tip: `${x.signups} cadastro(s)` }))} />
          </div>

          <Table title="Por origem" label="Origem" rows={d.bySource.map((r) => ({ ...r, key: r.source }))}
            note="utm_source do link; sem utm, vem do app (Instagram, TikTok...) ou do site anterior. “cartao” = selo dos cartões, “desconhecido” = cadastros de antes do rastreio." />
          <Table title="Por campanha" label="Campanha" rows={d.byCampaign.map((r) => ({ ...r, key: `${r.campaign} (${r.source})` }))}
            note="utm_campaign. Para o selo dos cartões, a campanha é o cartão de onde a pessoa veio." />

          <section className="tile grid content-start gap-3 p-5 sm:p-6">
            <h2 className="text-[16px] font-semibold">Aparelho</h2>
            {d.byDevice.length === 0 ? <p className="text-sm text-muted">Sem visitas no período.</p> : (
              <ul className="grid gap-2">
                {d.byDevice.map((x) => (
                  <li key={x.device} className="grid gap-1">
                    <span className="flex justify-between text-[14px]"><span className="font-medium">{x.device === 'mobile' ? 'Celular' : 'Computador'}</span>
                      <span className="text-muted tabular-nums">{fmt(x.views)} · {pct(x.views, devices)}</span></span>
                    <span className="block h-2 rounded-full bg-accent/80" style={{ width: `${Math.max(2, (x.views / devices) * 100)}%` }} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
