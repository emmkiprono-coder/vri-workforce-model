import { type ModelState, calcBurnout, calcCompetitive, calcEffectiveCPD, fmtK, fmtM, fmt, type BurnoutResult } from '../lib/modelState'
import { SectionTitle, SliderRow, Panel, GlobalStyles } from './ui-kit'

interface Props { state: ModelState; update: (p: Partial<ModelState>) => void }

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const arc = circ * 0.75  // 270-degree arc
  const offset = arc - (score / 100) * arc

  return (
    <svg width="140" height="110" viewBox="0 0 140 110">
      {/* Background arc */}
      <circle cx="70" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.08)"
        strokeWidth="10" strokeDasharray={`${arc} ${circ}`}
        strokeLinecap="round" transform="rotate(135 70 80)" />
      {/* Score arc */}
      <circle cx="70" cy="80" r={r} fill="none" stroke={color}
        strokeWidth="10" strokeDasharray={`${arc - offset} ${circ}`}
        strokeLinecap="round" transform="rotate(135 70 80)"
        style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }} />
      {/* Score text */}
      <text x="70" y="75" textAnchor="middle" fill="white"
        fontSize="28" fontWeight="700" fontFamily="DM Sans, sans-serif">{score}</text>
      <text x="70" y="93" textAnchor="middle" fill="rgba(255,255,255,0.35)"
        fontSize="10" fontFamily="DM Sans, sans-serif">/ 100</text>
    </svg>
  )
}

function DriverBar({ label, score, weight, contribution, color }: {
  label: string; score: number; weight: number; contribution: number; color: string
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[12px] text-white/70 leading-tight">{label}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-white/30">{(weight * 100).toFixed(0)}% wt</span>
          <span className="text-[12px] font-semibold tabular-nums" style={{ color, minWidth: 28, textAlign: 'right' }}>
            {score}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${score}%`, background: color }} />
        </div>
        <span className="text-[10px] text-white/30 w-10 text-right tabular-nums">+{contribution}pts</span>
      </div>
    </div>
  )
}

const INTENSITY_LABELS = ['', 'Routine / Admin', 'Low medical', 'Moderate medical', 'High acuity', 'Trauma / ICU / Psych']

export function BurnoutPredictor({ state, update }: Props) {
  const effectiveCPD = calcEffectiveCPD(state)
  const comp = calcCompetitive(state)

  const burnoutInputs = {
    callsPerFtePerDay:        effectiveCPD,
    ahtMins:                  state.aht,
    occupancyPct:             state.occupancy,
    paidHrsPerDay:            state.paidHrs,
    shrinkagePct:             state.shrinkage,
    otHrsPerWeek:             state.hOt,
    unplannedAbsenteeismPct:  state.shrinkVals['absenteeism'] ?? 4,
    turnoverDragPct:          state.shrinkVals['voluntary_turn'] ?? 1,
    lateArrivalsPct:          state.shrinkVals['late_arrive'] ?? 1.5,
    callIntensity:            state.burnoutCallIntensity,
    supervisorRatio:          state.burnoutSupervisorRatio,
  }

  const result: BurnoutResult = calcBurnout(burnoutInputs, state.salary)

  // What does CPM look like with burnout-inflated shrinkage?
  const adjustedState = { ...state, shrinkage: result.burnoutAdjustedShrinkage }
  const adjustedComp  = calcCompetitive(adjustedState)

  const cpmImpact     = adjustedComp.yourCPM - comp.yourCPM
  const savingsImpact = comp.savings - adjustedComp.savings

  const zoneGradient: Record<BurnoutResult['zone'], string> = {
    healthy:  'from-[#00D4A0]/10 to-transparent border-[#00D4A0]/20',
    caution:  'from-[#fbbf24]/10 to-transparent border-[#fbbf24]/20',
    high:     'from-[#f97316]/10 to-transparent border-[#f97316]/20',
    critical: 'from-[#f87171]/12 to-transparent border-[#f87171]/25',
  }

  return (
    <div>
      <GlobalStyles />

      {/* Header status */}
      <div className={`mb-5 rounded-xl border bg-gradient-to-r ${zoneGradient[result.zone]} px-5 py-4`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-shrink-0">
            <ScoreGauge score={result.score} color={result.zoneColor} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className="text-[18px] sm:text-[22px] font-bold" style={{ color: result.zoneColor }}>
                {result.zoneLabel}
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: result.zoneColor + '20', color: result.zoneColor, border: `1px solid ${result.zoneColor}40` }}>
                Burnout Risk
              </span>
            </div>
            <p className="text-[12px] sm:text-[13px] text-white/60 leading-relaxed mb-3">
              {result.zone === 'healthy' && 'Operating parameters are within healthy range. Continue monitoring quarterly.'}
              {result.zone === 'caution' && 'Early warning indicators present. Intervene proactively before conditions worsen.'}
              {result.zone === 'high' && 'Significant burnout risk. Without intervention, expect rising absenteeism and turnover within 90 days.'}
              {result.zone === 'critical' && 'Critical burnout risk. Immediate operational changes required. Team is likely already experiencing distress.'}
            </p>
            {/* Model impact summary */}
            {result.projectedShrinkageInflation > 0 && (
              <div className="flex flex-wrap gap-3">
                <div className="rounded-lg px-3 py-2 bg-white/5 border border-white/10">
                  <div className="text-[10px] text-white/40 mb-0.5">Projected shrinkage inflation</div>
                  <div className="text-[14px] font-semibold text-[#f87171] tabular-nums">+{result.projectedShrinkageInflation}%</div>
                </div>
                <div className="rounded-lg px-3 py-2 bg-white/5 border border-white/10">
                  <div className="text-[10px] text-white/40 mb-0.5">CPM impact if unaddressed</div>
                  <div className="text-[14px] font-semibold text-[#f87171] tabular-nums">+{fmtM(cpmImpact, 3)}/min</div>
                </div>
                <div className="rounded-lg px-3 py-2 bg-white/5 border border-white/10">
                  <div className="text-[10px] text-white/40 mb-0.5">Est. turnover cost exposure</div>
                  <div className="text-[14px] font-semibold text-[#fbbf24] tabular-nums">{fmtK(result.projectedTurnoverCost)}/yr</div>
                </div>
                <div className="rounded-lg px-3 py-2 bg-white/5 border border-white/10">
                  <div className="text-[10px] text-white/40 mb-0.5">Savings at risk</div>
                  <div className="text-[14px] font-semibold text-[#f87171] tabular-nums">{fmtK(savingsImpact)}/yr</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Driver breakdown */}
        <Panel>
          <SectionTitle>Risk Driver Breakdown</SectionTitle>
          {result.drivers.map(d => (
            <DriverBar key={d.label} {...d} color={
              d.score >= 70 ? '#f87171' : d.score >= 45 ? '#fbbf24' : '#00D4A0'
            } />
          ))}
          <div className="mt-3 pt-3 border-t border-white/8 flex justify-between text-[11px] text-white/35">
            <span>Supervisor ratio: <span className="text-white/60 font-semibold">{state.burnoutSupervisorRatio}:1</span></span>
            <span>Supervision multiplier: <span className="text-white/60 font-semibold">×{
              state.burnoutSupervisorRatio <= 15 ? '0.90' :
              state.burnoutSupervisorRatio <= 25 ? '1.00' :
              state.burnoutSupervisorRatio <= 35 ? '1.10' : '1.20'
            }</span></span>
          </div>
        </Panel>

        {/* Burnout inputs */}
        <Panel>
          <SectionTitle>Burnout Input Parameters</SectionTitle>

          {/* Call intensity — button selector */}
          <div className="mb-5">
            <div className="text-[12px] text-white/70 mb-2">Call intensity / acuity level</div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1,2,3,4,5].map(i => (
                <button key={i}
                  onClick={() => update({ burnoutCallIntensity: i })}
                  className={`py-2 rounded-lg text-[11px] font-semibold transition-all border ${
                    state.burnoutCallIntensity === i
                      ? 'border-[#00D4A0] bg-[#00D4A0]/15 text-[#00D4A0]'
                      : 'border-white/10 bg-white/4 text-white/40 hover:text-white/70 hover:border-white/25'
                  }`}>
                  {i}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-white/35 mt-1.5 text-center">
              {INTENSITY_LABELS[state.burnoutCallIntensity]}
            </div>
          </div>

          <SliderRow
            label={`Interpreters per supervisor (${state.burnoutSupervisorRatio}:1)`}
            value={state.burnoutSupervisorRatio}
            display={`${state.burnoutSupervisorRatio}:1`}
            min={5} max={60} step={1}
            onChange={v => update({ burnoutSupervisorRatio: v })}
          />

          {/* Read-only: pulled from the rest of the model */}
          <div className="mt-4 pt-4 border-t border-white/8">
            <div className="text-[11px] text-white/35 uppercase tracking-widest mb-3 font-semibold">
              Live model inputs (auto-populated)
            </div>
            {[
              { label: 'Calls / FTE / day',       value: `${fmt(effectiveCPD, 1)}` },
              { label: 'Avg handle time',           value: `${state.aht} min` },
              { label: 'Occupancy',                 value: `${state.occupancy}%`,     warn: state.occupancy > 85 },
              { label: 'Total shrinkage',           value: `${state.shrinkage.toFixed(1)}%`, warn: state.shrinkage > 35 },
              { label: 'Overtime hrs/week',         value: `${state.hOt.toFixed(1)}h`, warn: state.hOt > 4 },
              { label: 'Unplanned absenteeism',     value: `${(state.shrinkVals['absenteeism'] ?? 4).toFixed(1)}%`, warn: (state.shrinkVals['absenteeism'] ?? 4) > 5 },
              { label: 'Turnover drag',              value: `${(state.shrinkVals['voluntary_turn'] ?? 1).toFixed(1)}%`, warn: (state.shrinkVals['voluntary_turn'] ?? 1) > 1.5 },
            ].map(({ label, value, warn }) => (
              <div key={label} className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] text-white/45">{label}</span>
                <span className={`text-[12px] font-semibold tabular-nums ${warn ? 'text-[#f87171]' : 'text-white/70'}`}>{value}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Model adjustment panel */}
      {result.projectedShrinkageInflation > 0 && (
        <div className="mb-6 rounded-xl border border-[#f97316]/25 bg-[#f97316]/5 p-5">
          <SectionTitle>Model Adjustment — Burnout Impact on CPM</SectionTitle>
          <div className="text-[12px] text-white/60 mb-4">
            At the current burnout risk score of <strong style={{ color: result.zoneColor }}>{result.score}</strong>, 
            historical WFM data suggests shrinkage will inflate by approximately <strong className="text-[#f87171]">+{result.projectedShrinkageInflation}%</strong> within 60–90 days
            if operating conditions remain unchanged.
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Current shrinkage',         value: `${state.shrinkage.toFixed(1)}%`,                    color: 'text-white' },
              { label: 'Burnout-adjusted shrinkage', value: `${result.burnoutAdjustedShrinkage.toFixed(1)}%`,   color: 'text-[#f87171]' },
              { label: 'Current CPM',               value: fmtM(comp.yourCPM, 3),                               color: comp.yourCPM <= state.vendorRate ? 'text-[#00D4A0]' : 'text-[#f87171]' },
              { label: 'Burnout-adjusted CPM',       value: fmtM(adjustedComp.yourCPM, 3),                     color: 'text-[#f87171]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border border-white/8 p-3 bg-white/3">
                <div className="text-[10px] text-white/40 mb-1 leading-tight">{label}</div>
                <div className={`text-[16px] font-semibold tabular-nums ${color}`}>{value}</div>
              </div>
            ))}
          </div>
          {/* Apply button */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => update({ shrinkage: result.burnoutAdjustedShrinkage })}
              className="text-[12px] font-semibold px-4 py-2 rounded-lg border border-[#f97316]/40 text-[#f97316] hover:bg-[#f97316]/10 transition-all">
              Apply burnout-adjusted shrinkage to model
            </button>
            <span className="text-[11px] text-white/30">
              This updates the Competitive Analysis and all downstream calculations
            </span>
          </div>
        </div>
      )}

      {/* Recovery actions */}
      <SectionTitle>Recommended Recovery Actions</SectionTitle>
      <div className="space-y-2 mb-8">
        {result.recoveryActions.map((action, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
            <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
              style={{ background: result.zoneColor + '25', color: result.zoneColor }}>
              {i + 1}
            </div>
            <span className="text-[12px] sm:text-[13px] text-white/75 leading-relaxed">{action}</span>
          </div>
        ))}
      </div>

      {/* Shrinkage per FTE — explicit daily view */}
      <SectionTitle>Shrinkage Per FTE — Daily Breakdown</SectionTitle>
      <div className="text-[12px] text-white/45 mb-4">
        All shrinkage is calculated per individual FTE per day. Team totals are derived from FTE count ({state.fte}) and work days ({state.wdays}/yr).
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th>% per FTE/day</th>
              <th>Min per FTE/day</th>
              <th>Burnout signal?</th>
              <th>Team min/mo</th>
              <th>Team hrs/mo</th>
            </tr>
          </thead>
          <tbody>
            {[
              { key: 'absenteeism',    label: 'Unplanned absenteeism',    burnoutSignal: true },
              { key: 'late_arrive',    label: 'Late arrivals / departures',burnoutSignal: true },
              { key: 'voluntary_turn', label: 'Turnover drag',             burnoutSignal: true },
              { key: 'aux_work',       label: 'ACW overflow',              burnoutSignal: false },
              { key: 'idle_wrap',      label: 'Idle / wrap-up',            burnoutSignal: false },
            ].map(({ key, label, burnoutSignal }) => {
              const pct          = state.shrinkVals[key] ?? 0
              const minsDay      = (pct / 100) * state.paidHrs * 60
              const teamMonthly  = minsDay * state.fte * (state.wdays / 12)
              const teamHrsMonth = teamMonthly / 60
              const flagged      = burnoutSignal && pct > 3
              return (
                <tr key={key}>
                  <td className="whitespace-nowrap">{label}</td>
                  <td className="tabular-nums font-semibold" style={{ color: flagged ? '#f87171' : 'rgba(255,255,255,0.75)' }}>
                    {pct.toFixed(1)}%
                  </td>
                  <td className="tabular-nums">{minsDay.toFixed(1)}m</td>
                  <td>
                    {burnoutSignal
                      ? <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${flagged ? 'bg-[#f87171]/15 text-[#f87171]' : 'bg-[#00D4A0]/15 text-[#00D4A0]'}`}>
                          {flagged ? '⚠ Elevated' : '✓ Normal'}
                        </span>
                      : <span className="text-[10px] text-white/25">—</span>
                    }
                  </td>
                  <td className="tabular-nums">{fmt(Math.round(teamMonthly), 0)}m</td>
                  <td className="tabular-nums">{teamHrsMonth.toFixed(1)}h</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
