import { useState, useEffect } from 'react'
import {
  type ModelState, type SavedScenario, type ActivityEvent,
  calcCompetitive, fmtM, fmtK, fmt, fmtDate,
  loadScenarios, saveScenarios,
  loadActivity, clearActivity,
  exportScenariosCSV, exportScenariosJSON, exportActivityCSV,
  appendActivity
} from '../lib/modelState'
import { SectionTitle, SliderRow, Panel, Badge, GlobalStyles } from './ui-kit'

interface Props { state: ModelState; update: (p: Partial<ModelState>) => void }

interface ScenarioConfig {
  name: string
  label: string
  fte: number
  cpd: number
  aht: number
  shrink: number
}

const DEFAULTS: ScenarioConfig[] = [
  { name: 'Scenario A', label: 'Conservative',  fte: 8,  cpd: 18, aht: 14, shrink: 35 },
  { name: 'Scenario B', label: 'Target State',  fte: 10, cpd: 22, aht: 11, shrink: 28 },
  { name: 'Scenario C', label: 'Optimized',     fte: 12, cpd: 26, aht: 9,  shrink: 22 },
]

type ExportTab = 'scenarios' | 'activity'

export function ScenarioPlanner({ state }: Props) {
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>(DEFAULTS)
  const [saved, setSaved] = useState<SavedScenario[]>(() => loadScenarios())
  const [activity, setActivity] = useState<ActivityEvent[]>(() => loadActivity())
  const [saveNames, setSaveNames] = useState(['', '', ''])
  const [saveLabels, setSaveLabels] = useState(['', '', ''])
  const [exportTab, setExportTab] = useState<ExportTab>('scenarios')
  const [flash, setFlash] = useState<number | null>(null)

  // Refresh activity from storage periodically
  useEffect(() => {
    const t = setInterval(() => setActivity(loadActivity()), 5000)
    return () => clearInterval(t)
  }, [])

  const upd = (i: number, patch: Partial<ScenarioConfig>) =>
    setScenarios(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))

  const calcScenario = (s: ScenarioConfig) => {
    const totalCost = s.fte * (state.salary * (1 + state.benefits / 100) + state.techCost)
    const shrinkFactor = 1 - s.shrink / 100
    const availMin = state.paidHrs * 60 * shrinkFactor
    const totalMins = Math.min(
      s.fte * s.cpd * state.wdays * s.aht,
      s.fte * availMin * state.wdays * (state.occupancy / 100)
    )
    const cpm = totalCost / Math.max(1, totalMins)
    const delta = cpm - state.vendorRate
    const vendorEquiv = totalMins * state.vendorRate
    const savings = vendorEquiv - totalCost
    const annualCalls = s.fte * s.cpd * state.wdays
    return { totalCost, totalMins, cpm, delta, vendorEquiv, savings, annualCalls }
  }

  const calcs = scenarios.map(calcScenario)

  const handleSave = (i: number) => {
    const name = saveNames[i].trim() || scenarios[i].name
    const label = saveLabels[i].trim() || scenarios[i].label
    const c = calcs[i]
    const sc: SavedScenario = {
      id: Date.now().toString(36),
      name, label,
      savedAt: new Date().toISOString(),
      state: { ...state, fte: scenarios[i].fte, aht: scenarios[i].aht, cpd: scenarios[i].cpd, shrinkage: scenarios[i].shrink },
      calcSnapshot: {
        yourCPM: c.cpm,
        totalCost: c.totalCost,
        totalMins: c.totalMins,
        annualCalls: c.annualCalls,
        savings: c.savings,
        shrinkage: scenarios[i].shrink,
      }
    }
    const updated = [sc, ...saved].slice(0, 50)
    setSaved(updated)
    saveScenarios(updated)
    appendActivity({ type: 'scenario_save', label: `Saved scenario: "${name}"`, detail: `CPM ${fmtM(c.cpm, 3)}, ${scenarios[i].fte} FTEs` })
    setSaveNames(prev => { const n = [...prev]; n[i] = ''; return n })
    setSaveLabels(prev => { const n = [...prev]; n[i] = ''; return n })
    setFlash(i); setTimeout(() => setFlash(null), 1500)
  }

  const handleDeleteSaved = (id: string) => {
    const updated = saved.filter(s => s.id !== id)
    setSaved(updated); saveScenarios(updated)
  }

  const handleExportCSV = () => {
    exportScenariosCSV(saved)
    appendActivity({ type: 'scenario_export', label: 'Exported scenarios to CSV', detail: `${saved.length} scenarios` })
  }
  const handleExportJSON = () => {
    exportScenariosJSON(saved)
    appendActivity({ type: 'scenario_export', label: 'Exported scenarios to JSON', detail: `${saved.length} scenarios` })
  }
  const handleExportActivity = () => {
    exportActivityCSV(activity)
    appendActivity({ type: 'scenario_export', label: 'Exported activity log to CSV', detail: `${activity.length} events` })
  }
  const handleClearActivity = () => {
    if (confirm('Clear all activity history?')) { clearActivity(); setActivity([]) }
  }

  const activityTypeColor: Record<string, string> = {
    tab_change: '#60a5fa',
    slider_change: '#a78bfa',
    scenario_save: '#00D4A0',
    scenario_export: '#34d399',
    goal_set: '#fbbf24',
    shrinkage_change: '#f97316',
    agent_query: '#e879f9',
    state_load: '#94a3b8',
    state_reset: '#f87171',
  }

  const metrics = [
    { label: 'FTE count',          fn: (_c: ReturnType<typeof calcScenario>, s: ScenarioConfig) => fmt(s.fte, 0) },
    { label: 'Calls/day per FTE',  fn: (_c: ReturnType<typeof calcScenario>, s: ScenarioConfig) => fmt(s.cpd, 0) },
    { label: 'AHT (min)',          fn: (_c: ReturnType<typeof calcScenario>, s: ScenarioConfig) => fmt(s.aht, 1) + ' min' },
    { label: 'Shrinkage %',        fn: (_c: ReturnType<typeof calcScenario>, s: ScenarioConfig) => fmt(s.shrink, 0) + '%' },
    { label: 'Total annual cost',  fn: (c: ReturnType<typeof calcScenario>) => fmtK(c.totalCost) },
    { label: 'Billable min/yr',    fn: (c: ReturnType<typeof calcScenario>) => fmt(c.totalMins, 0) },
    { label: 'Annual calls',       fn: (c: ReturnType<typeof calcScenario>) => fmt(c.annualCalls, 0) },
    { label: 'Cost per minute',    fn: (c: ReturnType<typeof calcScenario>) => fmtM(c.cpm, 3), color: true },
    { label: 'vs Vendor',          fn: (c: ReturnType<typeof calcScenario>) => (c.delta >= 0 ? '+' : '') + fmtM(c.delta, 3), color: true },
    { label: 'Annual savings',     fn: (c: ReturnType<typeof calcScenario>) => fmtK(Math.abs(c.savings)), savColor: true },
    { label: 'Competitive?',       fn: (c: ReturnType<typeof calcScenario>) => c.delta <= 0 ? 'Yes' : 'No', compColor: true },
  ]

  // Current model snapshot for comparison
  const currentCalc = calcCompetitive(state)

  return (
    <div>
      <GlobalStyles />

      {/* Current model snapshot */}
      <div className="mb-6 rounded-xl border border-[#00D4A0]/20 bg-[#00D4A0]/5 px-5 py-4">
        <div className="text-[11px] text-[#00D4A0] font-semibold uppercase tracking-widest mb-2">Current Live Model</div>
        <div className="flex flex-wrap gap-5">
          {[
            { l: 'FTE', v: String(state.fte) },
            { l: 'CPM', v: fmtM(currentCalc.yourCPM, 3), c: currentCalc.yourCPM <= state.vendorRate ? '#00D4A0' : '#f87171' },
            { l: 'Vendor', v: `$${state.vendorRate.toFixed(3)}`, c: '#60a5fa' },
            { l: 'Shrinkage', v: `${state.shrinkage.toFixed(1)}%`, c: state.shrinkage > 30 ? '#f87171' : '#fbbf24' },
            { l: 'AHT', v: `${state.aht}m` },
            { l: 'Annual Cost', v: fmtK(currentCalc.totalCost) },
            { l: 'Savings vs Vendor', v: fmtK(currentCalc.savings), c: currentCalc.savings >= 0 ? '#00D4A0' : '#f87171' },
          ].map(({ l, v, c }) => (
            <div key={l} className="flex items-center gap-1.5">
              <span className="text-[11px] text-white/35">{l}</span>
              <span className="text-[13px] font-semibold" style={{ color: c || 'white' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario cards */}
      <SectionTitle>Compare Scenarios</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {scenarios.map((s, i) => {
          const c = calcs[i]
          return (
            <Panel key={i}>
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
                  <div className={`text-[16px] font-semibold ${c.delta <= 0 ? 'text-[#00D4A0]' : 'text-[#f87171]'}`}>{fmtM(c.cpm, 3)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-white/35">vs Vendor</div>
                  <div className={`text-[16px] font-semibold ${c.delta <= 0 ? 'text-[#00D4A0]' : 'text-[#f87171]'}`}>{(c.delta >= 0 ? '+' : '') + fmtM(c.delta, 3)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-white/35">Annual cost</div>
                  <div className="text-[14px] font-semibold text-white">{fmtK(c.totalCost)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-white/35">{c.savings >= 0 ? 'Savings' : 'Over vendor'}</div>
                  <div className={`text-[14px] font-semibold ${c.savings >= 0 ? 'text-[#00D4A0]' : 'text-[#f87171]'}`}>{fmtK(Math.abs(c.savings))}</div>
                </div>
              </div>
              <SliderRow label="FTE count"        value={s.fte}    display={`${s.fte}`}                 min={1}  max={350} step={1}   onChange={v => upd(i, { fte: v })} />
              <SliderRow label="Calls/day per FTE" value={s.cpd}   display={`${s.cpd}`}                min={1}  max={80}  step={1}   onChange={v => upd(i, { cpd: v })} />
              <SliderRow label="AHT (min)"         value={s.aht}   display={`${s.aht.toFixed(1)} min`} min={2}  max={60}  step={0.5} onChange={v => upd(i, { aht: v })} />
              <SliderRow label="Shrinkage %"        value={s.shrink}display={`${s.shrink.toFixed(0)}%`}min={5}  max={65}  step={1}   onChange={v => upd(i, { shrink: v })} />

              {/* Save form */}
              <div className="mt-4 pt-3 border-t border-white/8">
                <div className="text-[11px] text-white/40 mb-2">Save this scenario</div>
                <div className="flex gap-2 mb-2">
                  <input placeholder="Name" value={saveNames[i]}
                    onChange={e => setSaveNames(p => { const n=[...p]; n[i]=e.target.value; return n })}
                    className="flex-1 text-[12px] px-2 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:outline-none focus:border-[#00D4A0]/40" />
                  <input placeholder="Label" value={saveLabels[i]}
                    onChange={e => setSaveLabels(p => { const n=[...p]; n[i]=e.target.value; return n })}
                    className="flex-1 text-[12px] px-2 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:outline-none focus:border-[#00D4A0]/40" />
                </div>
                <button onClick={() => handleSave(i)}
                  className={`w-full text-[12px] font-semibold py-2 rounded-lg transition-all ${flash === i ? 'bg-[#00D4A0] text-[#0B0E14]' : 'bg-white/8 hover:bg-[#00D4A0]/20 text-white/70 hover:text-white border border-white/10'}`}>
                  {flash === i ? '✓ Saved!' : '↓ Save Scenario'}
                </button>
              </div>
            </Panel>
          )
        })}
      </div>

      {/* Comparison table */}
      <SectionTitle>Side-by-Side Comparison</SectionTitle>
      <div className="overflow-x-auto rounded-2xl border border-white/8 mb-10">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              {scenarios.map((s, i) => <th key={i}>{s.name}: {s.label}</th>)}
              <th style={{ color: '#00D4A0' }}>Current Live</th>
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
                {/* Current live column */}
                <td className="font-semibold text-[#00D4A0]/80">
                  {mi === 0 ? fmt(state.fte, 0)
                  : mi === 1 ? fmt(state.cpd, 0)
                  : mi === 2 ? fmt(state.aht, 1) + ' min'
                  : mi === 3 ? fmt(state.shrinkage, 0) + '%'
                  : mi === 4 ? fmtK(currentCalc.totalCost)
                  : mi === 5 ? fmt(currentCalc.totalMins, 0)
                  : mi === 6 ? fmt(currentCalc.annualCalls, 0)
                  : mi === 7 ? fmtM(currentCalc.yourCPM, 3)
                  : mi === 8 ? (currentCalc.delta >= 0 ? '+' : '') + fmtM(currentCalc.delta, 3)
                  : mi === 9 ? fmtK(Math.abs(currentCalc.savings))
                  : <Badge variant={currentCalc.delta <= 0 ? 'success' : 'danger'}>{currentCalc.delta <= 0 ? 'Yes' : 'No'}</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export & Activity section */}
      <div className="flex items-center gap-4 mb-4">
        <SectionTitle>Export &amp; Activity</SectionTitle>
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {(['scenarios','activity'] as ExportTab[]).map(t => (
            <button key={t} onClick={() => setExportTab(t)}
              className={`px-4 py-1.5 text-[12px] font-medium transition-all ${exportTab === t ? 'bg-[#00D4A0]/15 text-[#00D4A0]' : 'text-white/40 hover:text-white/70'}`}>
              {t === 'scenarios' ? `Saved Scenarios (${saved.length})` : `Activity Log (${activity.length})`}
            </button>
          ))}
        </div>
      </div>

      {exportTab === 'scenarios' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={handleExportCSV} disabled={saved.length === 0}
              className="text-[12px] px-4 py-2 rounded-lg border border-[#00D4A0]/30 text-[#00D4A0] hover:bg-[#00D4A0]/10 transition-all disabled:opacity-30">
              ↓ Export CSV
            </button>
            <button onClick={handleExportJSON} disabled={saved.length === 0}
              className="text-[12px] px-4 py-2 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all disabled:opacity-30">
              ↓ Export JSON
            </button>
            {saved.length === 0 && <span className="text-[12px] text-white/30">Save a scenario above to enable export</span>}
          </div>

          {saved.length === 0 ? (
            <div className="rounded-xl border border-white/8 bg-white/2 px-6 py-10 text-center text-[13px] text-white/30">
              No saved scenarios yet. Use the save form on any scenario card above.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/8">
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Label</th><th>Saved</th>
                    <th>FTE</th><th>AHT</th><th>Shrinkage</th>
                    <th>CPM</th><th>Total Cost</th><th>Savings</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {saved.map(sc => (
                    <tr key={sc.id}>
                      <td className="font-semibold text-white">{sc.name}</td>
                      <td><Badge variant="info">{sc.label}</Badge></td>
                      <td className="text-white/40 text-[11px]">{fmtDate(sc.savedAt)}</td>
                      <td>{sc.state.fte}</td>
                      <td>{sc.state.aht} min</td>
                      <td>
                        <span className={sc.calcSnapshot.shrinkage > 30 ? 'text-[#f87171] font-semibold' : 'text-[#fbbf24] font-semibold'}>
                          {sc.calcSnapshot.shrinkage.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className={sc.calcSnapshot.yourCPM <= sc.state.vendorRate ? 'text-[#00D4A0] font-semibold' : 'text-[#f87171] font-semibold'}>
                          {fmtM(sc.calcSnapshot.yourCPM, 3)}
                        </span>
                      </td>
                      <td>{fmtK(sc.calcSnapshot.totalCost)}</td>
                      <td>
                        <span className={sc.calcSnapshot.savings >= 0 ? 'text-[#00D4A0] font-semibold' : 'text-[#f87171] font-semibold'}>
                          {fmtK(sc.calcSnapshot.savings)}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => handleDeleteSaved(sc.id)}
                          className="text-[11px] text-white/25 hover:text-[#f87171] transition-colors px-2 py-1">
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {exportTab === 'activity' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={handleExportActivity} disabled={activity.length === 0}
              className="text-[12px] px-4 py-2 rounded-lg border border-[#00D4A0]/30 text-[#00D4A0] hover:bg-[#00D4A0]/10 transition-all disabled:opacity-30">
              ↓ Export Activity CSV
            </button>
            <button onClick={handleClearActivity} disabled={activity.length === 0}
              className="text-[12px] px-4 py-2 rounded-lg border border-white/15 text-white/40 hover:text-[#f87171] hover:border-[#f87171]/30 transition-all disabled:opacity-30">
              Clear History
            </button>
            <span className="text-[12px] text-white/30">{activity.length} events tracked (last 500)</span>
          </div>

          {activity.length === 0 ? (
            <div className="rounded-xl border border-white/8 bg-white/2 px-6 py-10 text-center text-[13px] text-white/30">
              No activity yet. Interactions are tracked automatically.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/8">
              <table>
                <thead>
                  <tr><th>Time</th><th>Type</th><th>Action</th><th>Detail</th></tr>
                </thead>
                <tbody>
                  {activity.slice(0, 100).map(evt => (
                    <tr key={evt.id}>
                      <td className="text-white/40 text-[11px] font-mono whitespace-nowrap">{fmtDate(evt.ts)}</td>
                      <td>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: activityTypeColor[evt.type] || 'white', background: (activityTypeColor[evt.type] || '#fff') + '18' }}>
                          {evt.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="text-white/75 text-[12px]">{evt.label}</td>
                      <td className="text-white/35 text-[11px]">{evt.detail || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {activity.length > 100 && (
                <div className="px-4 py-3 text-[11px] text-white/30 text-center border-t border-white/8">
                  Showing 100 of {activity.length} events. Export CSV for full history.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
