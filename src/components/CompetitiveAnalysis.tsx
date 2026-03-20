import { type ModelState, calcCompetitive, fmtK, fmtM, fmt, appendActivity } from '../lib/modelState'
import { SectionTitle, MetricCard, SliderRow, StatusBanner, Panel, GlobalStyles } from './ui-kit'

interface Props { state: ModelState; update: (p: Partial<ModelState>) => void }

export function CompetitiveAnalysis({ state, update }: Props) {
  const c = calcCompetitive(state)
  const competitive = c.yourCPM <= state.vendorRate

  let status: 'green' | 'amber' | 'red' = 'green'
  let statusMsg = ''
  if (c.yourCPM <= state.vendorRate * 0.90) {
    status = 'green'; statusMsg = `Strongly competitive — your CPM of ${fmtM(c.yourCPM,3)} is well below the vendor rate of $${state.vendorRate.toFixed(3)}.`
  } else if (c.yourCPM <= state.vendorRate) {
    status = 'green'; statusMsg = `Competitive — your CPM of ${fmtM(c.yourCPM,3)} is below the vendor rate.`
  } else if (c.yourCPM <= state.vendorRate * 1.10) {
    status = 'amber'; statusMsg = `Near break-even — small adjustments to volume, AHT, shrinkage, or headcount can close the $${Math.abs(c.delta).toFixed(3)}/min gap.`
  } else {
    status = 'red'; statusMsg = `Not yet competitive — CPM exceeds vendor rate by $${Math.abs(c.delta).toFixed(3)}/min. Reduce shrinkage, AHT, or increase volume to improve.`
  }

  const shrinkImpact = (1 - c.shrinkFactor) * 100

  return (
    <div>
      <GlobalStyles />
      <StatusBanner status={status} message={statusMsg} />

      {state.shrinkage > 0 && (
        <div className="mb-6 rounded-xl border border-[#fbbf24]/30 bg-[#fbbf24]/5 px-4 py-3 flex items-start gap-3">
          <div className="text-[#fbbf24] text-lg mt-0.5">⚠</div>
          <div>
            <div className="text-[13px] font-semibold text-[#fbbf24] mb-0.5">Shrinkage is reducing your billable capacity</div>
            <div className="text-[12px] text-white/60">
              Current shrinkage: <span className="text-white font-semibold">{state.shrinkage.toFixed(1)}%</span> — removing{' '}
              <span className="text-white font-semibold">{shrinkImpact.toFixed(1)}%</span> of paid hours from productive output.
              Tune individual components in the <span className="text-[#00D4A0] font-semibold">Shrinkage Breakdown</span> tab.
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <SectionTitle>Target CPM Goal</SectionTitle>
          <button
            onClick={() => update({ goalMode: !state.goalMode })}
            className={`text-[11px] px-3 py-1 rounded-full border transition-all ${state.goalMode ? 'border-[#00D4A0] text-[#00D4A0] bg-[#00D4A0]/10' : 'border-white/20 text-white/40 hover:text-white/70'}`}>
            {state.goalMode ? 'Hide guidance' : 'Show goal guidance'}
          </button>
        </div>
        {state.goalMode && (
          <div className="rounded-xl border border-white/10 bg-[#111520] p-5 mb-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-[12px] text-white/50 mb-2 block">Your target CPM ($/min)</label>
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-sm">$</span>
                  <input
                    type="number" min={0.10} max={2.00} step={0.005}
                    value={state.goalCPM.toFixed(3)}
                    onChange={e => { const v = parseFloat(e.target.value) || 0.60; update({ goalCPM: v }); appendActivity({ type: 'goal_set', label: `Goal CPM set to $${v.toFixed(3)}` }) }}
                    className="w-28 text-right text-[15px] font-semibold text-[#00D4A0]"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 10px' }}
                  />
                  <span className="text-white/40 text-sm">/min</span>
                </div>
                <div className="mt-2 text-[11px] text-white/35">
                  Gap to goal: <span className={c.goalGap > 0 ? 'text-[#f87171] font-semibold' : 'text-[#00D4A0] font-semibold'}>
                    {c.goalGap > 0 ? '+' : ''}{fmtM(c.goalGap, 3)}
                  </span> per minute
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="text-[12px] text-white/50 mb-2">To reach {fmtM(state.goalCPM, 3)}/min, you need ONE of:</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-white/8 p-3 bg-white/3">
                    <div className="text-[11px] text-white/40 mb-1">Annual call minutes</div>
                    <div className="text-[16px] font-semibold text-white">{fmt(c.minutesNeededForGoal, 0)}</div>
                    <div className="text-[11px] text-white/30">vs current {fmt(c.totalMins, 0)}</div>
                    <div className={`text-[11px] mt-1 font-semibold ${c.minutesNeededForGoal > c.totalMins ? 'text-[#fbbf24]' : 'text-[#00D4A0]'}`}>
                      {c.minutesNeededForGoal > c.totalMins ? `+${fmt(c.minutesNeededForGoal - c.totalMins, 0)} more needed` : 'Already achieved'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/8 p-3 bg-white/3">
                    <div className="text-[11px] text-white/40 mb-1">Daily calls (total team)</div>
                    <div className="text-[16px] font-semibold text-white">{fmt(c.callsNeededForGoal / state.wdays, 0)}</div>
                    <div className="text-[11px] text-white/30">vs current {fmt(c.effectiveCPD * state.fte, 0)}/day</div>
                    <div className={`text-[11px] mt-1 font-semibold ${c.callsNeededForGoal / state.wdays > c.effectiveCPD * state.fte ? 'text-[#fbbf24]' : 'text-[#00D4A0]'}`}>
                      {c.callsNeededForGoal / state.wdays > c.effectiveCPD * state.fte
                        ? `+${fmt(c.callsNeededForGoal / state.wdays - c.effectiveCPD * state.fte, 0)} more/day`
                        : 'Already achieved'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/8 p-3 bg-white/3">
                    <div className="text-[11px] text-white/40 mb-1">Shrinkage reduction needed</div>
                    <div className="text-[16px] font-semibold text-white">
                      {c.goalGap > 0 ? `${(state.shrinkage * (1 - state.goalCPM / c.yourCPM)).toFixed(1)}%` : '—'}
                    </div>
                    <div className="text-[11px] text-white/30">from current {state.shrinkage.toFixed(1)}%</div>
                    <div className="text-[11px] mt-1 text-white/40">Reduce in Shrinkage tab</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Panel>
          <SectionTitle>Vendor Benchmark &amp; Cost Inputs</SectionTitle>
          <SliderRow label="Vendor rate ($/min)" value={state.vendorRate} display={`$${state.vendorRate.toFixed(3)}`} min={0.40} max={1.50} step={0.005} onChange={v => update({ vendorRate: v })} />
          <SliderRow label="Your team FTE count" value={state.fte} display={`${state.fte}`} min={1} max={350} step={1} onChange={v => update({ fte: v })} />
          <SliderRow label="Annual salary per FTE ($)" value={state.salary} display={`$${state.salary.toLocaleString()}`} min={25000} max={120000} step={500} onChange={v => update({ salary: v })} />
          <SliderRow label="Benefits load (% of salary)" value={state.benefits} display={`${state.benefits}%`} min={10} max={60} step={1} onChange={v => update({ benefits: v })} />
          <SliderRow label="Technology / overhead ($/FTE/yr)" value={state.techCost} display={`$${state.techCost.toLocaleString()}`} min={0} max={15000} step={250} onChange={v => update({ techCost: v })} />
        </Panel>

        <Panel>
          <SectionTitle>Call Volume &amp; Performance</SectionTitle>
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white/3 border border-white/8">
            <div className="flex-1">
              <div className="text-[12px] text-white/70 font-medium">Volume input mode</div>
              <div className="text-[11px] text-white/35 mt-0.5">
                {state.useVolumeMode ? 'Enter total daily calls → CPD auto-calculated per FTE' : 'Enter calls per FTE per day directly'}
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
            : <SliderRow label="Calls per FTE per day" value={state.cpd} display={`${state.cpd}`} min={1} max={80} step={1} onChange={v => update({ cpd: v })} />
          }
          <SliderRow label="Avg handle time — AHT (min)" value={state.aht} display={`${state.aht.toFixed(1)} min`} min={2} max={60} step={0.5} onChange={v => update({ aht: v })} />
          <SliderRow label="Work days per year" value={state.wdays} display={`${state.wdays}`} min={200} max={262} step={1} onChange={v => update({ wdays: v })} />
          <SliderRow label="Effective occupancy (%)" value={state.occupancy} display={`${state.occupancy}%`} min={40} max={95} step={1} onChange={v => update({ occupancy: v })} />
          <div className="mt-4 pt-3 border-t border-white/8">
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-white/50">Shrinkage (live from Shrinkage tab)</span>
              <span className={`text-[13px] font-semibold ${state.shrinkage > 35 ? 'text-[#f87171]' : state.shrinkage > 25 ? 'text-[#fbbf24]' : 'text-[#00D4A0]'}`}>
                {state.shrinkage.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-[12px] text-white/50">Effective productive time</span>
              <span className="text-[13px] font-semibold text-white">{(c.shrinkFactor * 100).toFixed(1)}% of paid hrs</span>
            </div>
          </div>
        </Panel>
      </div>

      <SectionTitle>Call Volume &amp; Minutes Summary</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Calls per FTE per day" value={fmt(c.effectiveCPD, 1)} sub={state.useVolumeMode ? 'Derived from total volume' : 'Direct input'} />
        <MetricCard label="Total daily calls (team)" value={fmt(c.effectiveCPD * state.fte, 0)} sub={`${state.fte} FTEs`} />
        <MetricCard label="Annual call volume" value={fmt(c.annualCalls, 0)} sub={`${state.wdays} work days`} />
        <MetricCard label="Annual call minutes" value={fmt(c.annualMinutes, 0) + ' min'} sub={`AHT ${state.aht} min × volume`} />
      </div>

      <SectionTitle>Cost Comparison Summary</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Your total annual cost" value={fmtK(c.totalCost)} sub="Salary + benefits + tech" />
        <MetricCard label="Your cost per minute" value={fmtM(c.yourCPM, 3)} variant={competitive ? 'success' : 'danger'} sub="Incl. shrinkage impact" />
        <MetricCard label="Vendor cost per minute" value={`$${state.vendorRate.toFixed(3)}`} variant="info" sub="Language Line benchmark" />
        <MetricCard label="Your vs vendor delta" value={(c.delta >= 0 ? '+' : '') + fmtM(c.delta, 3)} variant={c.delta <= 0 ? 'success' : 'danger'} sub={c.delta <= 0 ? 'You are cheaper' : 'Vendor is cheaper'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-8">
        <MetricCard label="Billable minutes (shrinkage-adjusted)" value={fmt(c.totalMins, 0) + ' min'} sub="Capacity-constrained" />
        <MetricCard label="Equiv. vendor spend at your volume" value={fmtK(c.vendorEquiv)} sub="What vendor would charge" />
        <MetricCard label="Annual savings vs vendor" value={fmtK(Math.abs(c.savings))} variant={c.savings >= 0 ? 'success' : 'danger'} sub={c.savings >= 0 ? 'In-house savings' : 'Vendor is cheaper'} />
      </div>

      <SectionTitle>Break-even Analysis</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <MetricCard label="Min calls/FTE/day to break even" value={fmt(c.beCallsPerDay, 1)} sub="At current AHT" />
        <MetricCard label="Max AHT to break even (min)" value={fmt(c.beAHT, 1) + ' min'} sub="At current calls/day" />
        <MetricCard label="Break-even annual FTE cost" value={fmtK(c.vendorEquiv / state.fte)} sub="Per FTE, to match vendor" />
      </div>
    </div>
  )
}
