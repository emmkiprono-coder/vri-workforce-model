import { type ModelState, SHRINK_PLANNED, SHRINK_UNPLANNED, fmtK, fmt } from '../lib/modelState'
import { SectionTitle, MetricCard, Panel, Badge, GlobalStyles } from './ui-kit'

interface Props { state: ModelState; update: (p: Partial<ModelState>) => void }

function ShrinkRow({ label, benchLabel, val, paidMins, minVal, maxVal, bench, onChange }: {
  label: string; benchLabel: string; val: number; paidMins: number; minVal: number; maxVal: number; bench: number; onChange: (v: number) => void
}) {
  const mins = parseFloat((val / 100 * paidMins).toFixed(1))
  const maxMins = parseFloat((maxVal / 100 * paidMins + 1).toFixed(1))

  const handlePct = (v: number) => onChange(v)
  const handleMins = (v: number) => onChange(parseFloat((v / paidMins * 100).toFixed(2)))

  const diff = val - bench
  let badgeV: 'success' | 'warning' | 'danger' | 'info' = 'success'
  let badgeLabel = 'On target'
  if (Math.abs(diff) <= 0.5) { badgeV = 'success'; badgeLabel = 'On target' }
  else if (val > bench + 2) { badgeV = 'danger'; badgeLabel = 'Above target' }
  else if (val > bench) { badgeV = 'warning'; badgeLabel = 'Slightly high' }
  else { badgeV = 'info'; badgeLabel = 'Below target' }

  const barPct = Math.min(100, (val / 20) * 100)
  const barColor = val > bench + 2 ? '#f87171' : val > bench ? '#fbbf24' : '#00D4A0'

  return (
    <div className="py-3 border-b border-white/6 last:border-0">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="text-[13px] text-white/80">{label}</div>
          <div className="text-[11px] text-white/35 mt-0.5">Benchmark: {benchLabel}</div>
        </div>
        <Badge variant={badgeV}>{badgeLabel}</Badge>
      </div>

      {/* % row */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] text-white/35 w-7">%</span>
        <input
          type="range" min={minVal} max={maxVal} step={0.5} value={val}
          onChange={e => handlePct(parseFloat(e.target.value))}
          className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, ${barColor} 0%, ${barColor} ${((val - minVal) / (maxVal - minVal)) * 100}%, rgba(255,255,255,0.12) ${((val - minVal) / (maxVal - minVal)) * 100}%, rgba(255,255,255,0.12) 100%)` }}
        />
        <input type="number" min={minVal} max={maxVal} step={0.5} value={val.toFixed(1)}
          onChange={e => handlePct(parseFloat(e.target.value) || 0)}
          className="w-16 text-right text-[13px]" />
        <span className="text-[11px] text-white/35 w-3">%</span>
      </div>

      {/* min row */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-white/35 w-7">min</span>
        <input
          type="range" min={0} max={maxMins} step={0.5} value={mins}
          onChange={e => handleMins(parseFloat(e.target.value))}
          className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, ${barColor} 0%, ${barColor} ${(mins / maxMins) * 100}%, rgba(255,255,255,0.12) ${(mins / maxMins) * 100}%, rgba(255,255,255,0.12) 100%)` }}
        />
        <input type="number" min={0} max={maxMins} step={0.5} value={mins.toFixed(1)}
          onChange={e => handleMins(parseFloat(e.target.value) || 0)}
          className="w-16 text-right text-[13px]" />
        <span className="text-[11px] text-white/35 w-3">m</span>
      </div>

      {/* bar */}
      <div className="mt-2 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${barPct}%`, background: barColor }} />
      </div>
    </div>
  )
}

export function ShrinkageBreakdown({ state, update }: Props) {
  const paidMins = state.paidHrs * 60
  const planned = SHRINK_PLANNED.reduce((a, c) => a + state.shrinkVals[c.key], 0)
  const unplanned = SHRINK_UNPLANNED.reduce((a, c) => a + state.shrinkVals[c.key], 0)
  const total = planned + unplanned
  const productive = 100 - total
  const salary = state.salary
  const benefitsPct = state.benefits
  const costPerHr = (salary * (1 + benefitsPct / 100)) / (230 * 8)
  const fteRef = 10

  const setShrink = (key: string, v: number) => {
    const newVals = { ...state.shrinkVals, [key]: v }
    const newTotal = Object.values(newVals).reduce((a, b) => a + b, 0)
    update({ shrinkVals: newVals, shrinkage: parseFloat(Math.min(70, newTotal).toFixed(1)) })
  }

  const all = [...SHRINK_PLANNED, ...SHRINK_UNPLANNED]

  return (
    <div>
      <GlobalStyles />
      <style>{`
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; background:#00D4A0; cursor:pointer; border:2px solid #0B0E14; }
        input[type=range]::-moz-range-thumb { width:12px; height:12px; border-radius:50%; background:#00D4A0; cursor:pointer; border:2px solid #0B0E14; }
      `}</style>

      <div className="mb-2 text-[13px] text-white/45 pb-4 border-b border-white/8">
        Each component can be adjusted by <span className="text-white/70">percentage</span> or <span className="text-white/70">minutes per day</span> — both stay in sync. Total shrinkage feeds automatically into the Productivity Model.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 mt-5">
        <Panel>
          <SectionTitle>Planned / Scheduled Shrinkage</SectionTitle>
          {SHRINK_PLANNED.map(c => (
            <ShrinkRow key={c.key} label={c.label} benchLabel={c.benchLabel} val={state.shrinkVals[c.key]} paidMins={paidMins} minVal={c.min} maxVal={c.max} bench={c.bench} onChange={v => setShrink(c.key, v)} />
          ))}
        </Panel>
        <Panel>
          <SectionTitle>Unplanned / Unscheduled Shrinkage</SectionTitle>
          {SHRINK_UNPLANNED.map(c => (
            <ShrinkRow key={c.key} label={c.label} benchLabel={c.benchLabel} val={state.shrinkVals[c.key]} paidMins={paidMins} minVal={c.min} maxVal={c.max} bench={c.bench} onChange={v => setShrink(c.key, v)} />
          ))}
        </Panel>
      </div>

      <SectionTitle>Shrinkage Summary</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <MetricCard label="Planned shrinkage" value={`${planned.toFixed(1)}%`} sub="Scheduled activities" />
        <MetricCard label="Unplanned shrinkage" value={`${unplanned.toFixed(1)}%`} sub="Unscheduled absences" />
        <MetricCard label="Total shrinkage" value={`${total.toFixed(1)}%`} variant={total > 35 ? 'danger' : total > 25 ? 'warning' : 'success'} sub="Combined impact" />
        <MetricCard label="Productive time remaining" value={`${Math.max(0, productive).toFixed(1)}%`} variant="success" sub="% of paid hours generating output" />
      </div>

      <SectionTitle>Micro-Level Detail</SectionTitle>
      <div className="overflow-x-auto rounded-2xl border border-white/8 mb-8">
        <table>
          <thead>
            <tr>
              <th>Type</th><th>Component</th><th>Rate</th><th>Min/FTE/day</th>
              <th>Annual hrs (10 FTE)</th><th>Annual cost (10 FTE)</th><th>Benchmark</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {all.map(c => {
              const v = state.shrinkVals[c.key]
              const minsLost = (v / 100) * paidMins
              const annualHrs = (minsLost / 60) * 230 * fteRef
              const annualCost = annualHrs * costPerHr
              const type = SHRINK_PLANNED.find(x => x.key === c.key) ? 'Planned' : 'Unplanned'
              const diff = v - c.bench
              const badgeV = Math.abs(diff) <= 0.5 ? 'success' : v > c.bench + 2 ? 'danger' : v > c.bench ? 'warning' : 'info'
              const badgeL = Math.abs(diff) <= 0.5 ? 'On target' : v > c.bench + 2 ? 'Above target' : v > c.bench ? 'Slightly high' : 'Below target'
              return (
                <tr key={c.key}>
                  <td><Badge variant={type === 'Planned' ? 'info' : 'warning'}>{type}</Badge></td>
                  <td>{c.label}</td>
                  <td className="font-semibold">{v.toFixed(1)}%</td>
                  <td>{fmt(minsLost, 1)} min</td>
                  <td>{fmt(annualHrs, 0)} hrs</td>
                  <td>{fmtK(annualCost)}</td>
                  <td className="text-white/40">{c.benchLabel}</td>
                  <td><Badge variant={badgeV as any}>{badgeL}</Badge></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <SectionTitle>Visual Distribution</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {all.map(c => {
          const v = state.shrinkVals[c.key]
          const barPct = Math.min(100, (v / 20) * 100)
          const color = v > c.bench + 2 ? '#f87171' : v > c.bench ? '#fbbf24' : '#00D4A0'
          return (
            <div key={c.key} className="flex items-center gap-3">
              <div className="text-[12px] text-white/50 w-48 flex-shrink-0 truncate">{c.label}</div>
              <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${barPct}%`, background: color }} />
              </div>
              <div className="text-[12px] font-semibold w-16 text-right" style={{ color }}>{v.toFixed(1)}%</div>
              <div className="text-[11px] text-white/30 w-14 text-right">{fmt(v / 100 * paidMins, 1)}m</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
