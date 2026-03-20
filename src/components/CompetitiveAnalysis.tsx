import { type ModelState, calcCompetitive, fmtK, fmtM, fmt } from '../lib/modelState'
import { SectionTitle, MetricCard, SliderRow, StatusBanner, Panel, GlobalStyles } from './ui-kit'

interface Props { state: ModelState; update: (p: Partial<ModelState>) => void }

export function CompetitiveAnalysis({ state, update }: Props) {
  const c = calcCompetitive(state)
  const competitive = c.yourCPM <= state.vendorRate

  let status: 'green' | 'amber' | 'red' = 'green'
  let statusMsg = ''
  if (c.yourCPM <= state.vendorRate * 0.90) {
    status = 'green'; statusMsg = 'Strongly competitive — your cost per minute is well below the vendor rate.'
  } else if (c.yourCPM <= state.vendorRate) {
    status = 'green'; statusMsg = 'Competitive — your cost per minute is below the vendor rate.'
  } else if (c.yourCPM <= state.vendorRate * 1.10) {
    status = 'amber'; statusMsg = 'Near break-even — small adjustments to volume, AHT, or headcount can close the gap.'
  } else {
    status = 'red'; statusMsg = 'Not yet competitive — your cost per minute exceeds the vendor rate. Reduce AHT, increase volume, or adjust FTE count.'
  }

  return (
    <div>
      <GlobalStyles />
      <StatusBanner status={status} message={statusMsg} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Panel>
          <SectionTitle>Vendor Benchmark</SectionTitle>
          <SliderRow label="Vendor rate ($/min)" value={state.vendorRate} display={`$${state.vendorRate.toFixed(3)}`} min={0.40} max={1.50} step={0.005} onChange={v => update({ vendorRate: v })} />
          <SliderRow label="Your team FTE count" value={state.fte} display={`${state.fte}`} min={1} max={350} step={1} onChange={v => update({ fte: v })} />
          <SliderRow label="Annual salary per FTE ($)" value={state.salary} display={`$${state.salary.toLocaleString()}`} min={25000} max={120000} step={500} onChange={v => update({ salary: v })} />
          <SliderRow label="Benefits load (% of salary)" value={state.benefits} display={`${state.benefits}%`} min={10} max={60} step={1} onChange={v => update({ benefits: v })} />
          <SliderRow label="Technology / overhead ($/FTE/yr)" value={state.techCost} display={`$${state.techCost.toLocaleString()}`} min={0} max={15000} step={250} onChange={v => update({ techCost: v })} />
        </Panel>

        <Panel>
          <SectionTitle>Team Performance</SectionTitle>
          <SliderRow label="Avg handle time — AHT (min)" value={state.aht} display={`${state.aht.toFixed(1)} min`} min={2} max={60} step={0.5} onChange={v => update({ aht: v })} />
          <SliderRow label="Calls per FTE per day" value={state.cpd} display={`${state.cpd}`} min={1} max={80} step={1} onChange={v => update({ cpd: v })} />
          <SliderRow label="Work days per year" value={state.wdays} display={`${state.wdays}`} min={200} max={262} step={1} onChange={v => update({ wdays: v })} />
          <SliderRow label="Effective occupancy (%)" value={state.occupancy} display={`${state.occupancy}%`} min={40} max={95} step={1} onChange={v => update({ occupancy: v })} />
        </Panel>
      </div>

      <SectionTitle>Cost Comparison Summary</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Your total annual cost" value={fmtK(c.totalCost)} sub="Salary + benefits + tech" />
        <MetricCard label="Your cost per minute" value={fmtM(c.yourCPM, 3)} variant={competitive ? 'success' : 'danger'} sub="Effective billable minute rate" />
        <MetricCard label="Vendor cost per minute" value={`$${state.vendorRate.toFixed(3)}`} variant="info" sub="Language Line benchmark" />
        <MetricCard label="Your vs vendor delta" value={(c.delta >= 0 ? '+' : '') + fmtM(c.delta, 3)} variant={c.delta <= 0 ? 'success' : 'danger'} sub={c.delta <= 0 ? 'You are cheaper than vendor' : 'Vendor is cheaper'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-8">
        <MetricCard label="Total annual billable minutes" value={fmt(c.totalMins, 0) + ' min'} sub="Across all FTEs" />
        <MetricCard label="Equiv. vendor spend at your volume" value={fmtK(c.vendorEquiv)} sub="What vendor would charge" />
        <MetricCard label="Annual savings vs vendor" value={fmtK(Math.abs(c.savings))} variant={c.savings >= 0 ? 'success' : 'danger'} sub={c.savings >= 0 ? 'In-house savings' : 'Vendor is cheaper by this amount'} />
      </div>

      <SectionTitle>Break-even Analysis</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <MetricCard label="Min calls/FTE/day to break even" value={fmt(c.beCallsPerDay, 1)} sub="At current AHT" />
        <MetricCard label="Max AHT to break even (min)" value={fmt(c.beAHT, 1) + ' min'} sub="At current calls/day" />
        <MetricCard label="Break-even annual FTE cost" value={fmtK(c.vendorEquiv / state.fte)} sub="Per FTE, to match vendor cost" />
      </div>
    </div>
  )
}
