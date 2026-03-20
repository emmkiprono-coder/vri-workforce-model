import { type ModelState, fmtM, fmt } from '../lib/modelState'
import { SectionTitle, MetricCard, SliderRow, Panel, Badge, GlobalStyles } from './ui-kit'

interface Props { state: ModelState; update: (p: Partial<ModelState>) => void }

export function ProductivityModel({ state, update }: Props) {
  const paidMinsDay      = state.paidHrs * 60
  const availAfterShrink = paidMinsDay * (1 - state.shrinkage / 100)
  const billablePerFTE   = availAfterShrink * (state.occupancy / 100)
  const maxCalls         = billablePerFTE / state.aht
  const workDaysPerMonth = state.wdays / 12
  const callsPerFTEMonthly = maxCalls * workDaysPerMonth
  const fteReq           = Math.ceil(state.monthlyVol / callsPerFTEMonthly)
  const totalCostPerFTE  = state.salary * (1 + state.benefits / 100) + state.techCost
  const ahtRange         = [4, 6, 8, 10, 12, 15, 18, 20, 25, 30]

  return (
    <div>
      <GlobalStyles />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <Panel>
          <SectionTitle>Hours &amp; Availability</SectionTitle>
          <SliderRow label="Paid hours per day"    value={state.paidHrs}  display={`${state.paidHrs.toFixed(2)}h`}    min={6}  max={12}  step={0.25} onChange={v => update({ paidHrs: v })} />
          <SliderRow label="Total shrinkage"        value={state.shrinkage} display={`${state.shrinkage.toFixed(1)}%`} min={5}  max={70}  step={0.5}  onChange={v => update({ shrinkage: v })} />
          <SliderRow label="Effective occupancy"    value={state.occupancy} display={`${state.occupancy}%`}            min={40} max={95}  step={1}    onChange={v => update({ occupancy: v })} />
          <SliderRow label="Work days per year"     value={state.wdays}    display={`${state.wdays}`}                  min={200} max={262} step={1}   onChange={v => update({ wdays: v })} />
        </Panel>

        <Panel>
          <SectionTitle>Volume Targets</SectionTitle>
          <SliderRow label="Monthly call volume"       value={state.monthlyVol} display={state.monthlyVol.toLocaleString()} min={500}  max={100000} step={100} onChange={v => update({ monthlyVol: v })} />
          <SliderRow label="Peak hour % (in 4h)"       value={state.peakPct}   display={`${state.peakPct}%`}               min={20}   max={80}     step={1}   onChange={v => update({ peakPct: v })} />
          <SliderRow label="Service level target"      value={state.slTarget}  display={`${state.slTarget}%`}              min={50}   max={99}     step={1}   onChange={v => update({ slTarget: v })} />
          <SliderRow label="Target answer time (sec)"  value={state.tat}       display={`${state.tat}s`}                   min={10}   max={120}    step={5}   onChange={v => update({ tat: v })} />
        </Panel>
      </div>

      <SectionTitle>Productivity Output</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Available min/FTE/day"  value={fmt(availAfterShrink, 0) + ' min'} sub="After shrinkage" />
        <MetricCard label="Max calls/FTE/day"       value={fmt(maxCalls, 1)}                   sub="At current AHT" />
        <MetricCard label="FTEs required"           value={fmt(fteReq, 0) + ' FTEs'}           variant="info" sub="For monthly volume" />
        <MetricCard label="Billable min/FTE/day"    value={fmt(billablePerFTE, 0) + ' min'}    sub="Talk time" />
      </div>

      <SectionTitle>AHT Sensitivity Table</SectionTitle>
      {/* table-wrap class = overflow-x-auto + min-width on table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>AHT</th>
              <th>Calls/FTE/day</th>
              <th>Bill. min/day</th>
              <th>FTEs needed</th>
              <th>CPM</th>
              <th>vs Vendor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ahtRange.map(a => {
              const callsN  = billablePerFTE / a
              const fteN    = Math.ceil(state.monthlyVol / (callsN * workDaysPerMonth))
              const tMins   = fteN * billablePerFTE * state.wdays
              const tCost   = fteN * totalCostPerFTE
              const cpm     = tCost / tMins
              const diff    = cpm - state.vendorRate
              const isCur   = Math.abs(a - state.aht) < 0.5
              return (
                <tr key={a} className={isCur ? 'highlight-row' : ''}>
                  <td className={isCur ? 'font-semibold text-[#00D4A0] whitespace-nowrap' : 'whitespace-nowrap'}>
                    {a}m{isCur ? ' ←' : ''}
                  </td>
                  <td>{fmt(callsN, 1)}</td>
                  <td>{fmt(billablePerFTE, 0)}</td>
                  <td>{fmt(fteN, 0)}</td>
                  <td className="tabular-nums">{fmtM(cpm, 3)}</td>
                  <td className="tabular-nums" style={{ color: diff <= 0 ? '#34d399' : '#f87171' }}>
                    {(diff >= 0 ? '+' : '') + fmtM(diff, 3)}
                  </td>
                  <td><Badge variant={diff <= 0 ? 'success' : 'danger'}>{diff <= 0 ? '✓' : '✗'}</Badge></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
