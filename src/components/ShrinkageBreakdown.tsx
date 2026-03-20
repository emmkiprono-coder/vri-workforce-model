import { type ModelState, SHRINK_PLANNED, SHRINK_UNPLANNED, fmtK, fmt, appendActivity } from '../lib/modelState'
import { SectionTitle, MetricCard, Panel, Badge, GlobalStyles } from './ui-kit'

interface Props { state: ModelState; update: (p: Partial<ModelState>) => void }

function ShrinkRow({ label, benchLabel, val, paidMins, minVal, maxVal, bench, onChange }: {
  label: string; benchLabel: string; val: number; paidMins: number
  minVal: number; maxVal: number; bench: number; onChange: (v: number) => void
}) {
  const mins    = parseFloat((val / 100 * paidMins).toFixed(1))
  const maxMins = parseFloat((maxVal / 100 * paidMins + 1).toFixed(1))

  const handlePct  = (v: number) => onChange(v)
  const handleMins = (v: number) => onChange(parseFloat((v / paidMins * 100).toFixed(2)))

  const diff    = val - bench
  let badgeV: 'success' | 'warning' | 'danger' | 'info' = 'success'
  let badgeLabel = 'On target'
  if (Math.abs(diff) <= 0.5)   { badgeV = 'success'; badgeLabel = 'On target'    }
  else if (val > bench + 2)    { badgeV = 'danger';  badgeLabel = 'Above target'  }
  else if (val > bench)        { badgeV = 'warning'; badgeLabel = 'Slightly high' }
  else                         { badgeV = 'info';    badgeLabel = 'Below target'  }

  const barPct  = Math.min(100, (val / 20) * 100)
  const barColor = val > bench + 2 ? '#f87171' : val > bench ? '#fbbf24' : '#00D4A0'

  return (
    <div className="py-3 border-b border-white/6 last:border-0">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[12px] sm:text-[13px] text-white/80 leading-snug">{label}</div>
          <div className="text-[10px] sm:text-[11px] text-white/35 mt-0.5">Benchmark: {benchLabel}</div>
        </div>
        <Badge variant={badgeV}>{badgeLabel}</Badge>
      </div>

      {/* % slider row — always full width */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-white/35 w-6 flex-shrink-0">%</span>
        <input
          type="range" min={minVal} max={maxVal} step={0.5} value={val}
          onChange={e => handlePct(parseFloat(e.target.value))}
          className="flex-1 rounded-full appearance-none cursor-pointer"
          style={{
            height: '6px',
            background: `linear-gradient(to right, ${barColor} 0%, ${barColor} ${((val - minVal) / (maxVal - minVal)) * 100}%, rgba(255,255,255,0.12) ${((val - minVal) / (maxVal - minVal)) * 100}%, rgba(255,255,255,0.12) 100%)`
          }}
        />
        <span className="text-[12px] font-semibold tabular-nums flex-shrink-0" style={{ color: barColor, minWidth: 36, textAlign: 'right' }}>
          {val.toFixed(1)}%
        </span>
      </div>

      {/* min slider row */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/35 w-6 flex-shrink-0">m</span>
        <input
          type="range" min={0} max={maxMins} step={0.5} value={mins}
          onChange={e => handleMins(parseFloat(e.target.value))}
          className="flex-1 rounded-full appearance-none cursor-pointer"
          style={{
            height: '6px',
            background: `linear-gradient(to right, ${barColor} 0%, ${barColor} ${maxMins > 0 ? (mins / maxMins) * 100 : 0}%, rgba(255,255,255,0.12) ${maxMins > 0 ? (mins / maxMins) * 100 : 0}%, rgba(255,255,255,0.12) 100%)`
          }}
        />
        <span className="text-[12px] font-semibold tabular-nums flex-shrink-0" style={{ color: barColor, minWidth: 36, textAlign: 'right' }}>
          {mins.toFixed(1)}m
        </span>
      </div>

      {/* progress bar */}
      <div className="mt-2 h-1 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${barPct}%`, background: barColor }} />
      </div>
    </div>
  )
}

export function ShrinkageBreakdown({ state, update }: Props) {
  const paidMins   = state.paidHrs * 60
  const planned    = SHRINK_PLANNED.reduce((a, c) => a + (state.shrinkVals[c.key] ?? 0), 0)
  const unplanned  = SHRINK_UNPLANNED.reduce((a, c) => a + (state.shrinkVals[c.key] ?? 0), 0)
  const total      = planned + unplanned
  const productive = 100 - total
  const costPerHr  = (state.salary * (1 + state.benefits / 100)) / (230 * 8)
  const fteRef     = 10

  const setShrink = (key: string, v: number) => {
    const newVals  = { ...state.shrinkVals, [key]: v }
    const newTotal = Object.values(newVals).reduce((a, b) => a + b, 0)
    update({ shrinkVals: newVals, shrinkage: parseFloat(Math.min(70, newTotal).toFixed(1)) })
    appendActivity({ type: 'shrinkage_change', label: `Shrinkage: ${key}`, detail: `${v.toFixed(1)}% → total ${Math.min(70, newTotal).toFixed(1)}%` })
  }

  const all = [...SHRINK_PLANNED, ...SHRINK_UNPLANNED]

  return (
    <div>
      <GlobalStyles />
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance:none; width:22px; height:22px; border-radius:50%;
          background:#00D4A0; cursor:pointer; border:3px solid #0B0E14;
          box-shadow:0 0 0 2px #00D4A0;
        }
        input[type=range]::-moz-range-thumb {
          width:22px; height:22px; border-radius:50%;
          background:#00D4A0; cursor:pointer; border:3px solid #0B0E14;
        }
      `}</style>

      <div className="mb-4 text-[12px] sm:text-[13px] text-white/45 pb-4 border-b border-white/8">
        Each component adjustable by <span className="text-white/70">%</span> or <span className="text-white/70">minutes/day</span> — both stay in sync. Total feeds Competitive Analysis automatically.
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Planned shrinkage"    value={`${planned.toFixed(1)}%`}    sub="Scheduled" />
        <MetricCard label="Unplanned shrinkage"  value={`${unplanned.toFixed(1)}%`}  sub="Unscheduled" />
        <MetricCard label="Total shrinkage"      value={`${total.toFixed(1)}%`}       variant={total > 35 ? 'danger' : total > 25 ? 'warning' : 'success'} sub="Combined" />
        <MetricCard label="Productive time"      value={`${Math.max(0, productive).toFixed(1)}%`} variant="success" sub="Of paid hours" />
      </div>

      {/* Shrinkage panels — stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <Panel>
          <SectionTitle>Planned / Scheduled</SectionTitle>
          {SHRINK_PLANNED.map(c => (
            <ShrinkRow
              key={c.key} label={c.label} benchLabel={c.benchLabel}
              val={state.shrinkVals[c.key] ?? c.val} paidMins={paidMins}
              minVal={c.min} maxVal={c.max} bench={c.bench}
              onChange={v => setShrink(c.key, v)}
            />
          ))}
        </Panel>
        <Panel>
          <SectionTitle>Unplanned / Unscheduled</SectionTitle>
          {SHRINK_UNPLANNED.map(c => (
            <ShrinkRow
              key={c.key} label={c.label} benchLabel={c.benchLabel}
              val={state.shrinkVals[c.key] ?? c.val} paidMins={paidMins}
              minVal={c.min} maxVal={c.max} bench={c.bench}
              onChange={v => setShrink(c.key, v)}
            />
          ))}
        </Panel>
      </div>

      {/* Micro table — scrollable on mobile */}
      <SectionTitle>Component Detail Table</SectionTitle>
      <div className="table-wrap mb-6">
        <table>
          <thead>
            <tr>
              <th>Type</th><th>Component</th><th>Rate</th>
              <th>Min/FTE/day</th><th>Ann. hrs (10 FTE)</th>
              <th>Ann. cost (10 FTE)</th><th>Benchmark</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {all.map(c => {
              const v         = state.shrinkVals[c.key] ?? c.val
              const minsLost  = (v / 100) * paidMins
              const annualHrs = (minsLost / 60) * 230 * fteRef
              const annualCost= annualHrs * costPerHr
              const type      = SHRINK_PLANNED.find(x => x.key === c.key) ? 'Planned' : 'Unplanned'
              const diff      = v - c.bench
              const bV = Math.abs(diff) <= 0.5 ? 'success' : v > c.bench + 2 ? 'danger' : v > c.bench ? 'warning' : 'info'
              const bL = Math.abs(diff) <= 0.5 ? 'On target' : v > c.bench + 2 ? 'Above' : v > c.bench ? 'High' : 'Below'
              return (
                <tr key={c.key}>
                  <td><Badge variant={type === 'Planned' ? 'info' : 'warning'}>{type}</Badge></td>
                  <td className="whitespace-nowrap">{c.label}</td>
                  <td className="tabular-nums font-semibold">{v.toFixed(1)}%</td>
                  <td className="tabular-nums">{fmt(minsLost, 1)}m</td>
                  <td className="tabular-nums">{fmt(annualHrs, 0)}h</td>
                  <td className="tabular-nums">{fmtK(annualCost)}</td>
                  <td className="text-white/40 whitespace-nowrap">{c.benchLabel}</td>
                  <td><Badge variant={bV as any}>{bL}</Badge></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Visual bars — 1 col on mobile, 2 col on lg */}
      <SectionTitle>Visual Distribution</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {all.map(c => {
          const v      = state.shrinkVals[c.key] ?? c.val
          const barPct = Math.min(100, (v / 20) * 100)
          const color  = v > c.bench + 2 ? '#f87171' : v > c.bench ? '#fbbf24' : '#00D4A0'
          return (
            <div key={c.key} className="flex items-center gap-3 py-1">
              <div className="text-[11px] text-white/50 w-40 flex-shrink-0 truncate leading-tight">{c.label}</div>
              <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${barPct}%`, background: color }} />
              </div>
              <div className="text-[12px] font-semibold w-12 text-right tabular-nums flex-shrink-0" style={{ color }}>
                {v.toFixed(1)}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
