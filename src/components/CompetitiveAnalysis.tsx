import { type ModelState, calcCompetitive, fmtK, fmtM, fmt, appendActivity } from '../lib/modelState'
import { SectionTitle, MetricCard, SliderRow, StatusBanner, Panel, GlobalStyles } from './ui-kit'

interface Props { state: ModelState; update: (p: Partial<ModelState>) => void }

export function CompetitiveAnalysis({ state, update }: Props) {
  const c = calcCompetitive(state)
  const competitive = c.yourCPM <= state.vendorRate

  let status: 'green' | 'amber' | 'red' = 'green'
  let statusMsg = ''
  if (c.yourCPM <= state.vendorRate * 0.90) {
    status = 'green'; statusMsg = `Strongly competitive — CPM ${fmtM(c.yourCPM,3)} well below vendor $${state.vendorRate.toFixed(3)}.`
  } else if (c.yourCPM <= state.vendorRate) {
    status = 'green'; statusMsg = `Competitive — CPM ${fmtM(c.yourCPM,3)} below vendor rate.`
  } else if (c.yourCPM <= state.vendorRate * 1.10) {
    status = 'amber'; statusMsg = `Near break-even — gap of $${Math.abs(c.delta).toFixed(3)}/min. Adjust volume, AHT, or shrinkage.`
  } else {
    status = 'red'; statusMsg = `Not competitive — CPM exceeds vendor by $${Math.abs(c.delta).toFixed(3)}/min.`
  }

  return (
    <div>
      <GlobalStyles />
      <StatusBanner status={status} message={statusMsg} />

      {/* Shrinkage callout */}
      {state.shrinkage > 0 && (
        <div className="mb-5 rounded-xl border border-[#fbbf24]/30 bg-[#fbbf24]/5 px-4 py-3 flex items-start gap-3">
          <div className="text-[#fbbf24] text-base mt-0.5 flex-shrink-0">⚠</div>
          <div>
            <div className="text-[12px] font-semibold text-[#fbbf24] mb-0.5">Shrinkage reducing billable capacity</div>
            <div className="text-[11px] sm:text-[12px] text-white/60">
              <span className="text-white font-semibold">{state.shrinkage.toFixed(1)}%</span> shrinkage removes{' '}
              <span className="text-white font-semibold">{((1 - c.shrinkFactor) * 100).toFixed(1)}%</span> of paid hours from output.
              Tune in the <span className="text-[#00D4A0] font-semibold">Shrinkage</span> tab.
            </div>
          </div>
        </div>
      )}

      {/* Goal panel */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <SectionTitle>Target CPM Goal</SectionTitle>
          <button
            onClick={() => update({ goalMode: !state.goalMode })}
            className={`text-[11px] px-3 py-1 rounded-full border transition-all ${state.goalMode ? 'border-[#00D4A0] text-[#00D4A0] bg-[#00D4A0]/10' : 'border-white/20 text-white/40 hover:text-white/70'}`}>
            {state.goalMode ? 'Hide' : 'Show goal guidance'}
          </button>
        </div>
        {state.goalMode && (
          <div className="rounded-xl border border-white/10 bg-[#111520] p-4 sm:p-5 mb-4">
            <div className="flex flex-wrap items-end gap-4 mb-4">
              <div>
                <label className="text-[11px] text-white/50 mb-2 block">Target CPM ($/min)</label>
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-sm">$</span>
                  <input
                    type="number" min={0.10} max={2.00} step={0.005}
                    value={state.goalCPM.toFixed(3)}
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 0.60
                      update({ goalCPM: v })
                      appendActivity({ type: 'goal_set', label: `Goal CPM set to $${v.toFixed(3)}` })
                    }}
                    className="text-right text-[15px] font-semibold text-[#00D4A0]"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 10px', width: 100 }}
                  />
                  <span className="text-white/40 text-sm">/min</span>
                </div>
                <div className="mt-1.5 text-[11px] text-white/35">
                  Gap: <span className={c.goalGap > 0 ? 'text-[#f87171] font-semibold' : 'text-[#00D4A0] font-semibold'}>
                    {c.goalGap > 0 ? '+' : ''}{fmtM(c.goalGap, 3)}/min
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  title: 'Annual call minutes needed',
                  value: fmt(c.minutesNeededForGoal, 0),
                  sub: `vs current ${fmt(c.totalMins, 0)}`,
                  gap: c.minutesNeededForGoal > c.totalMins,
                  gapText: c.minutesNeededForGoal > c.totalMins ? `+${fmt(c.minutesNeededForGoal - c.totalMins, 0)} more needed` : 'Already achieved',
                },
                {
                  title: 'Daily calls (team)',
                  value: fmt(c.callsNeededForGoal / state.wdays, 0),
                  sub: `vs current ${fmt(c.effectiveCPD * state.fte, 0)}/day`,
                  gap: c.callsNeededForGoal / state.wdays > c.effectiveCPD * state.fte,
                  gapText: c.callsNeededForGoal / state.wdays > c.effectiveCPD * state.fte
                    ? `+${fmt(c.callsNeededForGoal / state.wdays - c.effectiveCPD * state.fte, 0)} more/day`
                    : 'Already achieved',
                },
                {
                  title: 'Shrinkage reduction',
                  value: c.goalGap > 0 ? `${(state.shrinkage * (1 - state.goalCPM / c.yourCPM)).toFixed(1)}%` : '—',
                  sub: `from current ${state.shrinkage.toFixed(1)}%`,
                  gap: true,
                  gapText: 'Tune in Shrinkage tab',
                },
              ].map((item, i) => (
                <div key={i} className="rounded-lg border border-white/8 p-3 bg-white/3">
                  <div className="text-[11px] text-white/40 mb-1">{item.title}</div>
                  <div className="text-[16px] sm:text-[18px] font-semibold text-white">{item.value}</div>
                  <div className="text-[10px] text-white/30">{item.sub}</div>
                  <div className={`text-[10px] sm:text-[11px] mt-1 font-semibold ${item.gap ? 'text-[#fbbf24]' : 'text-[#00D4A0]'}`}>{item.gapText}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input panels — stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Panel>
          <SectionTitle>Vendor Benchmark &amp; Cost</SectionTitle>
          <SliderRow label="Vendor rate ($/min)"          value={state.vendorRate}  display={`$${state.vendorRate.toFixed(3)}`}       min={0.40}  max={1.50}   step={0.005} onChange={v => update({ vendorRate: v })} />
          <SliderRow label="Team FTE count"               value={state.fte}         display={`${state.fte}`}                           min={1}     max={350}    step={1}     onChange={v => update({ fte: v })} />
          <SliderRow label="Annual salary per FTE"        value={state.salary}      display={`$${state.salary.toLocaleString()}`}      min={25000} max={120000} step={500}   onChange={v => update({ salary: v })} />
          <SliderRow label="Benefits load (% of salary)"  value={state.benefits}    display={`${state.benefits}%`}                    min={10}    max={60}     step={1}     onChange={v => update({ benefits: v })} />
          <SliderRow label="Tech / overhead ($/FTE/yr)"   value={state.techCost}    display={`$${state.techCost.toLocaleString()}`}   min={0}     max={15000}  step={250}   onChange={v => update({ techCost: v })} />
        </Panel>

        <Panel>
          <SectionTitle>Call Volume &amp; Performance</SectionTitle>
          {/* Volume mode toggle */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white/3 border border-white/8">
            <div className="flex-1">
              <div className="text-[12px] text-white/70 font-medium">Volume mode</div>
              <div className="text-[10px] sm:text-[11px] text-white/35 mt-0.5">
                {state.useVolumeMode ? 'Total daily calls → CPD auto-calculated' : 'Calls per FTE per day (direct)'}
              </div>
            </div>
            <button
              onClick={() => update({ useVolumeMode: !state.useVolumeMode })}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${state.useVolumeMode ? 'bg-[#00D4A0]' : 'bg-white/15'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${state.useVolumeMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {state.useVolumeMode
            ? <SliderRow label="Total daily calls (all FTEs)" value={state.dailyCallVolume} display={`${state.dailyCallVolume}`} min={1} max={5000} step={10} onChange={v => update({ dailyCallVolume: v })} />
            : <SliderRow label="Calls per FTE per day"        value={state.cpd}             display={`${state.cpd}`}             min={1} max={80}   step={1}  onChange={v => update({ cpd: v })} />
          }
          <SliderRow label="Avg handle time — AHT" value={state.aht}       display={`${state.aht.toFixed(1)} min`} min={2}   max={60}  step={0.5} onChange={v => update({ aht: v })} />
          <SliderRow label="Work days per year"     value={state.wdays}     display={`${state.wdays}`}              min={200} max={262} step={1}   onChange={v => update({ wdays: v })} />
          <SliderRow label="Effective occupancy"    value={state.occupancy} display={`${state.occupancy}%`}        min={40}  max={95}  step={1}   onChange={v => update({ occupancy: v })} />
          {/* Live shrinkage readout */}
          <div className="mt-3 pt-3 border-t border-white/8 flex items-center justify-between">
            <span className="text-[11px] text-white/50">Shrinkage (live)</span>
            <span className={`text-[13px] font-semibold tabular-nums ${state.shrinkage > 35 ? 'text-[#f87171]' : state.shrinkage > 25 ? 'text-[#fbbf24]' : 'text-[#00D4A0]'}`}>
              {state.shrinkage.toFixed(1)}% → {(c.shrinkFactor * 100).toFixed(1)}% productive
            </span>
          </div>
          {/* Capacity utilization warning in volume mode */}
          {state.useVolumeMode && (
            <div className={`mt-2 pt-2 border-t border-white/8 flex items-center justify-between`}>
              <span className="text-[11px] text-white/50">Capacity utilization</span>
              <span className={`text-[13px] font-semibold tabular-nums ${c.capacityUtilization > 100 ? 'text-[#f87171]' : c.capacityUtilization > 85 ? 'text-[#fbbf24]' : 'text-[#00D4A0]'}`}>
                {c.capacityUtilization.toFixed(0)}%
                {c.capacityUtilization > 100 && <span className="text-[10px] ml-1 text-[#f87171]">⚠ over capacity</span>}
              </span>
            </div>
          )}
        </Panel>
      </div>

      {/* Call volume metrics — 2-col on mobile, 4-col on lg */}
      <SectionTitle>Call Volume &amp; Minutes</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Calls/FTE/day"       value={fmt(c.effectiveCPD, 1)}                sub={state.useVolumeMode ? 'From volume' : 'Direct'} />
        <MetricCard label="Total daily calls"    value={fmt(c.effectiveCPD * state.fte, 0)}    sub={`${state.fte} FTEs`} />
        <MetricCard label="Annual call volume"   value={fmt(c.annualCalls, 0)}                 sub={`${state.wdays} days`} />
        <MetricCard label="Annual call minutes"  value={fmt(c.annualMinutes, 0)}               sub={`AHT ${state.aht}m`} />
      </div>

      <SectionTitle>Cost Comparison</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Total annual cost"    value={fmtK(c.totalCost)}                                           sub="Salary + benefits + tech" />
        <MetricCard label="Your CPM"             value={fmtM(c.yourCPM, 3)}    variant={competitive ? 'success' : 'danger'} sub="Incl. shrinkage" />
        <MetricCard label="Vendor CPM"           value={`$${state.vendorRate.toFixed(3)}`} variant="info"           sub="Language Line" />
        <MetricCard label="Delta vs vendor"      value={(c.delta >= 0 ? '+' : '') + fmtM(c.delta, 3)} variant={c.delta <= 0 ? 'success' : 'danger'} sub={c.delta <= 0 ? 'You are cheaper' : 'Vendor cheaper'} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <MetricCard label="Billable min/yr (adj)" value={fmt(c.totalMins, 0) + ' min'} sub="Shrinkage-adjusted" />
        <MetricCard label="Equiv. vendor spend"   value={fmtK(c.vendorEquiv)}           sub="At your volume" />
        <MetricCard label="Annual savings"        value={fmtK(Math.abs(c.savings))} variant={c.savings >= 0 ? 'success' : 'danger'} sub={c.savings >= 0 ? 'In-house savings' : 'Vendor cheaper by'} />
      </div>

      <SectionTitle>Break-even Analysis</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard label="Min calls/FTE/day"    value={fmt(c.beCallsPerDay, 1)}   sub="To break even at AHT" />
        <MetricCard label="Max AHT to break even" value={fmt(c.beAHT, 1) + ' min'} sub="At current calls/day" />
        <MetricCard label="Break-even FTE cost"   value={fmtK(c.vendorEquiv / state.fte)} sub="Per FTE to match vendor" />
      </div>
    </div>
  )
}
