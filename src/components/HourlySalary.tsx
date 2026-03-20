import { type ModelState, HOURLY_ROLES, fmtM, fmtK } from '../lib/modelState'
import { SectionTitle, MetricCard, SliderRow, Panel, GlobalStyles } from './ui-kit'

interface Props { state: ModelState; update: (p: Partial<ModelState>) => void }

export function HourlySalary({ state, update }: Props) {
  const p = { hrs: state.hHrs, wdays: state.hWdays, benefits: state.hBenefits / 100, ot: state.hOt, otm: state.hOtm }

  const calcRole = (rate: number) => {
    const annualBase = rate * p.hrs * p.wdays
    const annualOT = rate * p.otm * p.ot * 52
    const benefits = (annualBase + annualOT) * p.benefits
    const total = annualBase + annualOT + benefits
    const effHrly = total / (p.hrs * p.wdays)
    const cpm = effHrly / 60
    return { annualBase, annualOT, benefits, total, effHrly, cpm }
  }

  const setRate = (key: string, v: number) => update({ hourlyRates: { ...state.hourlyRates, [key]: v } })

  const activeCalc = calcRole(state.hourlyRates[state.activeHourlyRole] || 22)

  return (
    <div>
      <GlobalStyles />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Panel>
          <SectionTitle>Hourly Rate Inputs by Role</SectionTitle>
          {HOURLY_ROLES.map(r => {
            const rate = state.hourlyRates[r.key]
            return (
              <div key={r.key} className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[13px] text-white/70">{r.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[#00D4A0]">${rate.toFixed(2)}/hr</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={10} max={100} step={0.25} value={rate}
                    onChange={e => setRate(r.key, parseFloat(e.target.value))}
                    className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, #00D4A0 0%, #00D4A0 ${((rate - 10) / 90) * 100}%, rgba(255,255,255,0.15) ${((rate - 10) / 90) * 100}%, rgba(255,255,255,0.15) 100%)` }}
                  />
                  <input type="number" min={10} max={100} step={0.25} value={rate.toFixed(2)}
                    onChange={e => setRate(r.key, parseFloat(e.target.value) || 10)}
                    className="w-18" />
                </div>
              </div>
            )
          })}
        </Panel>

        <Panel>
          <SectionTitle>Global Hourly Settings</SectionTitle>
          <SliderRow label="Hours per day" value={state.hHrs} display={`${state.hHrs.toFixed(2)}h`} min={4} max={12} step={0.25} onChange={v => update({ hHrs: v })} />
          <SliderRow label="Work days per year" value={state.hWdays} display={`${state.hWdays}`} min={200} max={262} step={1} onChange={v => update({ hWdays: v })} />
          <SliderRow label="Benefits load (% of base)" value={state.hBenefits} display={`${state.hBenefits}%`} min={10} max={60} step={1} onChange={v => update({ hBenefits: v })} />
          <SliderRow label="Overtime avg hrs/week" value={state.hOt} display={`${state.hOt.toFixed(1)}h`} min={0} max={20} step={0.5} onChange={v => update({ hOt: v })} />
          <SliderRow label="OT premium multiplier" value={state.hOtm} display={`${state.hOtm.toFixed(2)}x`} min={1.0} max={2.5} step={0.25} onChange={v => update({ hOtm: v })} />

          <div className="mt-4 pt-4 border-t border-white/8">
            <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Active role for competitive analysis</div>
            <select value={state.activeHourlyRole} onChange={e => update({ activeHourlyRole: e.target.value })}>
              {HOURLY_ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <div className="mt-3 text-[11px] text-white/35">Selecting a role pushes its loaded annual cost to the Competitive Analysis salary field.</div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/8">
            <SectionTitle>Active Role Preview</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard label="Loaded annual cost" value={fmtK(activeCalc.total)} variant="info" />
              <MetricCard label="Effective $/hr loaded" value={fmtM(activeCalc.effHrly, 2)} />
              <MetricCard label="CPM at current AHT" value={fmtM(activeCalc.cpm, 3)} variant={activeCalc.cpm <= state.vendorRate ? 'success' : 'danger'} />
              <MetricCard label="vs Vendor ($0.725)" value={(activeCalc.cpm - state.vendorRate >= 0 ? '+' : '') + fmtM(activeCalc.cpm - state.vendorRate, 3)} variant={activeCalc.cpm <= state.vendorRate ? 'success' : 'danger'} />
            </div>
          </div>
        </Panel>
      </div>

      <SectionTitle>Role Cost Summary Cards</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {HOURLY_ROLES.map(r => {
          const calc = calcRole(state.hourlyRates[r.key])
          const diff = calc.cpm - state.vendorRate
          return (
            <div
              key={r.key}
              onClick={() => update({ activeHourlyRole: r.key })}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                state.activeHourlyRole === r.key
                  ? 'border-[#00D4A0]/60 bg-[#00D4A0]/10'
                  : 'border-white/8 bg-white/4 hover:border-white/20'
              }`}
            >
              <div className="text-[11px] text-white/40 mb-1">{r.label}</div>
              <div className="text-[20px] font-semibold text-white">${state.hourlyRates[r.key].toFixed(2)}<span className="text-[13px] font-normal text-white/40">/hr</span></div>
              <div className="text-[12px] text-white/50 mt-1">Loaded: {fmtK(calc.total)}/yr</div>
              <div className={`text-[12px] mt-1 font-medium ${diff <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                CPM: {fmtM(calc.cpm, 3)} {diff <= 0 ? '✓' : '✗'}
              </div>
            </div>
          )
        })}
      </div>

      <SectionTitle>Full Hourly Cost Table</SectionTitle>
      <div className="overflow-x-auto rounded-2xl border border-white/8">
        <table>
          <thead>
            <tr>
              <th>Role</th><th>Base $/hr</th><th>OT $/hr</th>
              <th>Annual base</th><th>Annual OT</th><th>Benefits</th>
              <th>Total loaded/yr</th><th>Effective $/hr</th><th>CPM</th>
            </tr>
          </thead>
          <tbody>
            {HOURLY_ROLES.map(r => {
              const calc = calcRole(state.hourlyRates[r.key])
              const diff = calc.cpm - state.vendorRate
              return (
                <tr key={r.key} className={state.activeHourlyRole === r.key ? 'highlight-row' : ''}>
                  <td className="font-medium">{r.label}</td>
                  <td>{fmtM(state.hourlyRates[r.key], 2)}</td>
                  <td>{fmtM(state.hourlyRates[r.key] * state.hOtm, 2)}</td>
                  <td>{fmtK(calc.annualBase)}</td>
                  <td>{fmtK(calc.annualOT)}</td>
                  <td>{fmtK(calc.benefits)}</td>
                  <td className="font-semibold">{fmtK(calc.total)}</td>
                  <td>{fmtM(calc.effHrly, 2)}/hr</td>
                  <td style={{ color: diff <= 0 ? '#34d399' : '#f87171' }}>{fmtM(calc.cpm, 3)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
