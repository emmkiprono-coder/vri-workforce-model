import { type ModelState, SHRINK_PLANNED, SHRINK_UNPLANNED, fmtK, fmt, appendActivity } from '../lib/modelState'
import { SectionTitle, MetricCard, Panel, Badge, GlobalStyles } from './ui-kit'

interface Props { state: ModelState; update: (p: Partial<ModelState>) => void }

function ShrinkRow({ label, benchLabel, benchPct, val, paidMins, minVal, maxVal, bench, onChange, fte, wdays }: {
  label: string; benchLabel: string; benchPct: number; val: number; paidMins: number
  minVal: number; maxVal: number; bench: number; onChange: (v: number) => void
  fte: number; wdays: number
}) {
  // ── Daily values ────────────────────────────────────────────────────────
  const minsPerDay = parseFloat((val / 100 * paidMins).toFixed(1))
  const maxMins    = parseFloat((maxVal / 100 * paidMins + 1).toFixed(1))

  const handlePct     = (v: number) => onChange(v)
  const handleMinsDay = (v: number) => onChange(parseFloat((v / paidMins * 100).toFixed(2)))

  // ── Monthly tabulation ───────────────────────────────────────────────────
  const workDaysPerMonth    = wdays / 12
  const teamMinsLostMonthly = minsPerDay * fte * workDaysPerMonth
  const teamHrsLostMonthly  = teamMinsLostMonthly / 60

  // Back-calculate % from entered monthly minutes
  const handleMonthlyMins = (entered: number) => {
    if (!fte || !workDaysPerMonth || !paidMins) return
    const perFteDay = entered / (fte * workDaysPerMonth)
    const pct = Math.min(maxVal, Math.max(minVal, (perFteDay / paidMins) * 100))
    onChange(parseFloat(pct.toFixed(2)))
  }

  // ── Status ───────────────────────────────────────────────────────────────
  const diff = val - bench
  let badgeV: 'success' | 'warning' | 'danger' | 'info' = 'success'
  let badgeLabel = 'On target'
  if (Math.abs(diff) <= 0.5) { badgeV = 'success'; badgeLabel = 'On target'    }
  else if (val > bench + 2)  { badgeV = 'danger';  badgeLabel = 'Above target'  }
  else if (val > bench)      { badgeV = 'warning'; badgeLabel = 'Slightly high' }
  else                       { badgeV = 'info';    badgeLabel = 'Below target'  }

  const barPct   = Math.min(100, (val / 20) * 100)
  const barColor = val > bench + 2 ? '#f87171' : val > bench ? '#fbbf24' : '#00D4A0'

  // Benchmark min/day for reference
  const benchMinsDay = parseFloat((benchPct / 100 * paidMins).toFixed(1))

  return (
    <div className="py-3 border-b border-white/6 last:border-0">

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-[12px] sm:text-[13px] text-white/80 leading-snug">{label}</div>
          {/* Benchmark hint: % and min/day side by side */}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-white/30">Benchmark:</span>
            <span className="text-[10px] text-white/50 font-medium">{benchLabel}</span>
            <span className="text-[10px] text-white/20">·</span>
            <span className="text-[10px] text-white/40 tabular-nums">{benchMinsDay}m/day</span>
          </div>
        </div>
        <Badge variant={badgeV}>{badgeLabel}</Badge>
      </div>

      {/* ── Daily section ── */}
      <div className="text-[9px] text-white/25 uppercase tracking-widest mb-1.5 font-semibold">Daily (per FTE)</div>

      {/* % per day */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-white/35 w-14 flex-shrink-0">% / day</span>
        <input
          type="range" min={minVal} max={maxVal} step={0.5} value={val}
          onChange={e => handlePct(parseFloat(e.target.value))}
          className="flex-1 rounded-full appearance-none cursor-pointer"
          style={{
            height: '6px',
            background: `linear-gradient(to right, ${barColor} 0%, ${barColor} ${((val - minVal) / (maxVal - minVal)) * 100}%, rgba(255,255,255,0.12) ${((val - minVal) / (maxVal - minVal)) * 100}%, rgba(255,255,255,0.12) 100%)`
          }}
        />
        <span className="text-[12px] font-semibold tabular-nums flex-shrink-0" style={{ color: barColor, minWidth: 38, textAlign: 'right' }}>
          {val.toFixed(1)}%
        </span>
      </div>

      {/* min / day */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/35 w-14 flex-shrink-0">min / day</span>
        <input
          type="range" min={0} max={maxMins} step={0.5} value={minsPerDay}
          onChange={e => handleMinsDay(parseFloat(e.target.value))}
          className="flex-1 rounded-full appearance-none cursor-pointer"
          style={{
            height: '6px',
            background: `linear-gradient(to right, ${barColor} 0%, ${barColor} ${maxMins > 0 ? (minsPerDay / maxMins) * 100 : 0}%, rgba(255,255,255,0.12) ${maxMins > 0 ? (minsPerDay / maxMins) * 100 : 0}%, rgba(255,255,255,0.12) 100%)`
          }}
        />
        <span className="text-[12px] font-semibold tabular-nums flex-shrink-0" style={{ color: barColor, minWidth: 38, textAlign: 'right' }}>
          {minsPerDay.toFixed(1)}m
        </span>
      </div>

      {/* ── Monthly tabulation ── */}
      <div className="mt-3 pt-2.5 border-t border-white/6">
        <div className="text-[9px] text-white/25 uppercase tracking-widest mb-1.5 font-semibold">Monthly (team total)</div>
        <div className="flex items-center gap-2"
          style={{ background: barColor + '0e', borderRadius: 8, padding: '5px 8px', border: `1px solid ${barColor}22` }}>
          <span className="text-[10px] flex-shrink-0" style={{ color: barColor }}>⏱</span>
          <input
            type="number"
            min={0}
            step={1}
            value={Math.round(teamMinsLostMonthly)}
            onChange={e => handleMonthlyMins(parseFloat(e.target.value) || 0)}
            className="flex-1 text-[13px] font-semibold tabular-nums focus:outline-none"
            style={{ background: 'transparent', border: 'none', color: barColor, minWidth: 0 }}
          />
          <span className="text-[10px] text-white/40 flex-shrink-0">min/mo</span>
          {teamHrsLostMonthly >= 0.1 && (
            <span className="text-[10px] tabular-nums flex-shrink-0 font-medium"
              style={{ color: barColor + 'bb' }}>
              = {teamHrsLostMonthly.toFixed(1)} hrs
            </span>
          )}
          <span className="text-[10px] text-white/20 flex-shrink-0 hidden sm:inline">{fte} FTEs × {workDaysPerMonth.toFixed(1)} days</span>
        </div>
      </div>

      {/* progress bar */}
      <div className="mt-2.5 h-1 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${barPct}%`, background: barColor }} />
      </div>
    </div>
  )
}

export function ShrinkageBreakdown({ state, update }: Props) {
  const paidMins   = state.paidHrs * 60
  const planned    = SHRINK_PLANNED.reduce((a, c)  => a + (state.shrinkVals[c.key] ?? 0), 0)
  const unplanned  = SHRINK_UNPLANNED.reduce((a, c) => a + (state.shrinkVals[c.key] ?? 0), 0)
  const total      = planned + unplanned
  const productive = 100 - total
  const costPerHr  = (state.salary * (1 + state.benefits / 100)) / (state.wdays * state.paidHrs)

  const setShrink = (key: string, v: number) => {
    const newVals  = { ...state.shrinkVals, [key]: v }
    const newTotal = Object.values(newVals).reduce((a, b) => a + b, 0)
    update({ shrinkVals: newVals, shrinkage: parseFloat(Math.min(70, newTotal).toFixed(1)) })
    appendActivity({ type: 'shrinkage_change', label: `Shrinkage: ${key}`, detail: `${v.toFixed(1)}% → total ${Math.min(70, newTotal).toFixed(1)}%` })
  }

  const all = [...SHRINK_PLANNED, ...SHRINK_UNPLANNED]

  // Monthly tabulation totals
  const workDaysPerMonth  = state.wdays / 12
  const totalMinsDay      = (total / 100) * paidMins                        // per FTE per day
  const totalMinsMonthly  = totalMinsDay * state.fte * workDaysPerMonth      // whole team
  const totalHrsMonthly   = totalMinsMonthly / 60
  const totalCostMonthly  = totalHrsMonthly * costPerHr * state.fte          // rough cost

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
        All values are <span className="text-white/70">per individual FTE, per day</span>. Monthly totals multiply across your {state.fte} FTEs and are editable to back-calculate the per-FTE daily rate.
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Planned shrinkage"   value={`${planned.toFixed(1)}%`}                          sub="Scheduled" />
        <MetricCard label="Unplanned shrinkage" value={`${unplanned.toFixed(1)}%`}                        sub="Unscheduled" />
        <MetricCard label="Total shrinkage"     value={`${total.toFixed(1)}%`}   variant={total > 35 ? 'danger' : total > 25 ? 'warning' : 'success'} sub="Combined" />
        <MetricCard label="Productive time"     value={`${Math.max(0, productive).toFixed(1)}%`} variant="success" sub="Of paid hours" />
      </div>

      {/* Monthly tabulation summary banner */}
      <div className="mb-5 rounded-xl border border-white/10 bg-[#111520] px-4 py-3">
        <div className="text-[10px] text-white/35 uppercase tracking-widest font-semibold mb-2">Monthly Tabulation — Team Total ({state.fte} FTEs × {(state.wdays/12).toFixed(1)} days)</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Lost min / FTE / day',  value: `${totalMinsDay.toFixed(1)} min`,       sub: 'Per interpreter, per day' },
            { label: 'Team min lost/mo',     value: `${fmt(Math.round(totalMinsMonthly), 0)} min`, sub: `${state.fte} FTEs × ${workDaysPerMonth.toFixed(1)} days/mo` },
            { label: 'Team hrs lost/mo',     value: `${totalHrsMonthly.toFixed(1)} hrs`,    sub: 'Equivalent hours' },
            { label: 'Est. monthly cost',    value: fmtK(totalCostMonthly),                 sub: 'Loaded wage cost', variant: 'warning' as const },
          ].map(({ label, value, sub, variant }) => (
            <div key={label} className={`rounded-lg border p-3 ${variant === 'warning' ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/8 bg-white/3'}`}>
              <div className="text-[10px] text-white/40 mb-1 leading-tight">{label}</div>
              <div className={`text-[15px] font-semibold tabular-nums ${variant === 'warning' ? 'text-amber-400' : 'text-white'}`}>{value}</div>
              <div className="text-[10px] text-white/25 mt-0.5 leading-tight">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Shrinkage panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <Panel>
          <SectionTitle>Planned / Scheduled</SectionTitle>
          {SHRINK_PLANNED.map(c => (
            <ShrinkRow
              key={c.key} label={c.label} benchLabel={c.benchLabel} benchPct={c.bench}
              val={state.shrinkVals[c.key] ?? c.val} paidMins={paidMins}
              minVal={c.min} maxVal={c.max} bench={c.bench}
              fte={state.fte} wdays={state.wdays}
              onChange={v => setShrink(c.key, v)}
            />
          ))}
        </Panel>
        <Panel>
          <SectionTitle>Unplanned / Unscheduled</SectionTitle>
          {SHRINK_UNPLANNED.map(c => (
            <ShrinkRow
              key={c.key} label={c.label} benchLabel={c.benchLabel} benchPct={c.bench}
              val={state.shrinkVals[c.key] ?? c.val} paidMins={paidMins}
              minVal={c.min} maxVal={c.max} bench={c.bench}
              fte={state.fte} wdays={state.wdays}
              onChange={v => setShrink(c.key, v)}
            />
          ))}
        </Panel>
      </div>

      {/* Component detail table */}
      <SectionTitle>Component Detail Table</SectionTitle>
      <div className="table-wrap mb-6">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Component</th>
              <th>Rate %</th>
              <th>Min/FTE/day</th>
              <th>Team min/mo</th>
              <th>Team hrs/mo</th>
              <th>Ann. cost ({state.fte} FTE)</th>
              <th>Bench %</th>
              <th>Bench min/day</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {all.map(c => {
              const v              = state.shrinkVals[c.key] ?? c.val
              const minsDay        = (v / 100) * paidMins
              const teamMinsMonthly= minsDay * state.fte * workDaysPerMonth
              const teamHrsMonthly = teamMinsMonthly / 60
              const annualHrs      = (minsDay / 60) * state.wdays * state.fte
              const annualCost     = annualHrs * costPerHr
              const type           = SHRINK_PLANNED.find(x => x.key === c.key) ? 'Planned' : 'Unplanned'
              const diff           = v - c.bench
              const benchMinsDay   = parseFloat((c.bench / 100 * paidMins).toFixed(1))
              const bV = Math.abs(diff) <= 0.5 ? 'success' : v > c.bench + 2 ? 'danger' : v > c.bench ? 'warning' : 'info'
              const bL = Math.abs(diff) <= 0.5 ? 'On target' : v > c.bench + 2 ? 'Above' : v > c.bench ? 'High' : 'Below'
              return (
                <tr key={c.key}>
                  <td><Badge variant={type === 'Planned' ? 'info' : 'warning'}>{type}</Badge></td>
                  <td className="whitespace-nowrap font-medium">{c.label}</td>
                  <td className="tabular-nums font-semibold" style={{ color: v > c.bench + 2 ? '#f87171' : v > c.bench ? '#fbbf24' : 'rgba(255,255,255,0.75)' }}>
                    {v.toFixed(1)}%
                  </td>
                  <td className="tabular-nums">{minsDay.toFixed(1)}m</td>
                  <td className="tabular-nums font-semibold">{fmt(Math.round(teamMinsMonthly), 0)}m</td>
                  <td className="tabular-nums">{teamHrsMonthly.toFixed(1)}h</td>
                  <td className="tabular-nums">{fmtK(annualCost)}</td>
                  {/* Benchmark: both % and min/day */}
                  <td className="tabular-nums text-white/40">{c.benchLabel}</td>
                  <td className="tabular-nums text-white/40">{benchMinsDay}m/day</td>
                  <td><Badge variant={bV as any}>{bL}</Badge></td>
                </tr>
              )
            })}
            {/* Totals row */}
            <tr style={{ borderTop: '2px solid rgba(255,255,255,0.12)' }}>
              <td colSpan={2} className="font-semibold text-white/70">Total</td>
              <td className="tabular-nums font-semibold text-white">{total.toFixed(1)}%</td>
              <td className="tabular-nums font-semibold text-white">{totalMinsDay.toFixed(1)}m</td>
              <td className="tabular-nums font-semibold text-white">{fmt(Math.round(totalMinsMonthly), 0)}m</td>
              <td className="tabular-nums font-semibold text-white">{totalHrsMonthly.toFixed(1)}h</td>
              <td className="tabular-nums font-semibold text-white">{fmtK(totalCostMonthly * 12)}</td>
              <td colSpan={3} className="text-white/25 text-[11px]">{state.fte} FTEs · {state.wdays} days/yr</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Visual bars */}
      <SectionTitle>Visual Distribution</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {all.map(c => {
          const v      = state.shrinkVals[c.key] ?? c.val
          const barPct = Math.min(100, (v / 20) * 100)
          const color  = v > c.bench + 2 ? '#f87171' : v > c.bench ? '#fbbf24' : '#00D4A0'
          const minsDay = (v / 100) * paidMins
          return (
            <div key={c.key} className="flex items-center gap-3 py-1">
              <div className="text-[11px] text-white/50 w-36 flex-shrink-0 truncate leading-tight">{c.label}</div>
              <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${barPct}%`, background: color }} />
              </div>
              <div className="text-right flex-shrink-0" style={{ minWidth: 90 }}>
                <span className="text-[12px] font-semibold tabular-nums" style={{ color }}>{v.toFixed(1)}%</span>
                <span className="text-[10px] text-white/30 ml-1.5 tabular-nums">{minsDay.toFixed(1)}m/day</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
