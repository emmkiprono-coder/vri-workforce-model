import { useState } from 'react'
import { type ModelState, fmtM, fmtK, fmt } from '../lib/modelState'
import { SectionTitle, SliderRow, Panel, Badge, GlobalStyles } from './ui-kit'

interface Props { state: ModelState }

interface ScenarioConfig {
  name: string
  label: string
  fte: number
  cpd: number
  aht: number
  shrink: number
}

const DEFAULTS: ScenarioConfig[] = [
  { name: 'Scenario A', label: 'Conservative', fte: 8, cpd: 18, aht: 14, shrink: 35 },
  { name: 'Scenario B', label: 'Target State', fte: 10, cpd: 22, aht: 11, shrink: 28 },
  { name: 'Scenario C', label: 'Optimized', fte: 12, cpd: 26, aht: 9, shrink: 22 },
]

export function ScenarioPlanner({ state }: Props) {
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>(DEFAULTS)

  const update = (i: number, patch: Partial<ScenarioConfig>) =>
    setScenarios(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))

  const calc = (s: ScenarioConfig) => {
    const totalCost = s.fte * (state.salary * (1 + state.benefits / 100) + state.techCost)
    const totalMins = s.fte * s.cpd * state.wdays * s.aht
    const cpm = totalCost / totalMins
    const delta = cpm - state.vendorRate
    const vendorEquiv = totalMins * state.vendorRate
    const savings = vendorEquiv - totalCost
    return { totalCost, totalMins, cpm, delta, vendorEquiv, savings }
  }

  const calcs = scenarios.map(calc)

  const metrics = [
    { label: 'FTE count', fn: (_c: ReturnType<typeof calc>, s: ScenarioConfig) => fmt(s.fte, 0) },
    { label: 'Calls/day per FTE', fn: (_c: ReturnType<typeof calc>, s: ScenarioConfig) => fmt(s.cpd, 0) },
    { label: 'AHT (min)', fn: (_c: ReturnType<typeof calc>, s: ScenarioConfig) => fmt(s.aht, 1) + ' min' },
    { label: 'Shrinkage %', fn: (_c: ReturnType<typeof calc>, s: ScenarioConfig) => fmt(s.shrink, 0) + '%' },
    { label: 'Total annual cost', fn: (c: ReturnType<typeof calc>) => fmtK(c.totalCost) },
    { label: 'Billable min/yr', fn: (c: ReturnType<typeof calc>) => fmt(c.totalMins, 0) },
    { label: 'Cost per minute', fn: (c: ReturnType<typeof calc>) => fmtM(c.cpm, 3) },
    { label: 'vs Vendor', fn: (c: ReturnType<typeof calc>) => (c.delta >= 0 ? '+' : '') + fmtM(c.delta, 3), color: true },
    { label: 'Annual savings vs vendor', fn: (c: ReturnType<typeof calc>) => fmtK(Math.abs(c.savings)), savColor: true },
    { label: 'Competitive?', fn: (c: ReturnType<typeof calc>) => c.delta <= 0 ? 'Yes' : 'No', compColor: true },
  ]

  return (
    <div>
      <GlobalStyles />
      <div className="mb-6 text-[13px] text-white/45">
        Compare three staffing scenarios side by side against your current vendor benchmark of ${state.vendorRate.toFixed(3)}/min. Salary and tech overhead are inherited from Competitive Analysis.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {scenarios.map((s, i) => {
          const c = calcs[i]
          return (
            <Panel key={i} className={c.delta <= 0 ? 'border-emerald-500/30' : ''}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[10px] text-white/35 uppercase tracking-widest">{s.name}</div>
                  <div className="text-[15px] font-semibold text-white mt-0.5">{s.label}</div>
                </div>
                <Badge variant={c.delta <= 0 ? 'success' : 'danger'}>{c.delta <= 0 ? 'Competitive' : 'Above vendor'}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-white/4 rounded-xl">
                <div>
                  <div className="text-[11px] text-white/35">CPM</div>
                  <div className={`text-[16px] font-semibold ${c.delta <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtM(c.cpm, 3)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-white/35">vs Vendor</div>
                  <div className={`text-[16px] font-semibold ${c.delta <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(c.delta >= 0 ? '+' : '') + fmtM(c.delta, 3)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-white/35">Annual cost</div>
                  <div className="text-[14px] font-semibold text-white">{fmtK(c.totalCost)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-white/35">{c.savings >= 0 ? 'Savings' : 'Cost over'}</div>
                  <div className={`text-[14px] font-semibold ${c.savings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtK(Math.abs(c.savings))}</div>
                </div>
              </div>

              <SliderRow label="FTE count" value={s.fte} display={`${s.fte}`} min={1} max={350} step={1} onChange={v => update(i, { fte: v })} />
              <SliderRow label="Calls/day per FTE" value={s.cpd} display={`${s.cpd}`} min={1} max={80} step={1} onChange={v => update(i, { cpd: v })} />
              <SliderRow label="AHT (min)" value={s.aht} display={`${s.aht.toFixed(1)} min`} min={2} max={60} step={0.5} onChange={v => update(i, { aht: v })} />
              <SliderRow label="Shrinkage %" value={s.shrink} display={`${s.shrink.toFixed(0)}%`} min={5} max={65} step={1} onChange={v => update(i, { shrink: v })} />
            </Panel>
          )
        })}
      </div>

      <SectionTitle>Side-by-Side Comparison</SectionTitle>
      <div className="overflow-x-auto rounded-2xl border border-white/8">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              {scenarios.map((s, i) => <th key={i}>{s.name}: {s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, mi) => (
              <tr key={mi}>
                <td className="font-medium text-white/60">{m.label}</td>
                {scenarios.map((s, ci) => {
                  const c = calcs[ci]
                  const val = m.fn(c, s)
                  let color = ''
                  if (m.color) color = c.delta <= 0 ? '#34d399' : '#f87171'
                  if (m.savColor) color = c.savings >= 0 ? '#34d399' : '#f87171'
                  if (m.compColor) color = val === 'Yes' ? '#34d399' : '#f87171'
                  return (
                    <td key={ci} style={{ color: color || undefined }} className={color ? 'font-semibold' : ''}>
                      {m.compColor ? <Badge variant={val === 'Yes' ? 'success' : 'danger'}>{val}</Badge> : val}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
