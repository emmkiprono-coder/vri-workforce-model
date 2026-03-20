import { useState, useEffect, useCallback, useRef } from 'react'
import { CompetitiveAnalysis } from './components/CompetitiveAnalysis'
import { ProductivityModel } from './components/ProductivityModel'
import { ShrinkageBreakdown } from './components/ShrinkageBreakdown'
import { HourlySalary } from './components/HourlySalary'
import { ScenarioPlanner } from './components/ScenarioPlanner'
import { WFMAgent } from './components/WFMAgent'
import {
  type ModelState, defaultState,
  loadState, saveState, loadMeta,
  appendActivity, fmtDate, calcCompetitive, fmtM
} from './lib/modelState'

const TABS = [
  { id: 'agent',       label: '⚡ WFM Agent',        badge: 'AI' },
  { id: 'competitive', label: 'Competitive Analysis' },
  { id: 'productivity',label: 'Productivity Model' },
  { id: 'shrinkage',   label: 'Shrinkage Breakdown' },
  { id: 'hourly',      label: 'Hourly Salary' },
  { id: 'scenarios',   label: 'Scenarios & Export' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('agent')
  const [state, setState] = useState<ModelState>(() => loadState())
  const [lastSaved, setLastSaved] = useState<string>('')
  const [sessionLogged, setSessionLogged] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)
  const prevTabRef = useRef('agent')

  // Log session start once
  useEffect(() => {
    if (!sessionLogged) {
      const c = calcCompetitive(state)
      appendActivity({ type: 'state_load', label: 'Session started', detail: `CPM ${fmtM(c.yourCPM, 3)}, FTE ${state.fte}, Shrink ${state.shrinkage.toFixed(1)}%` })
      setSessionLogged(true)
    }
  }, [sessionLogged])

  // Auto-save on every state change
  useEffect(() => {
    saveState(state)
    const meta = loadMeta()
    if (meta?.savedAt) setLastSaved(fmtDate(meta.savedAt))
    setSaveFlash(true)
    const t = setTimeout(() => setSaveFlash(false), 800)
    return () => clearTimeout(t)
  }, [state])

  // Track tab changes
  const handleTabChange = useCallback((tabId: string) => {
    if (tabId !== prevTabRef.current) {
      appendActivity({
        type: 'tab_change',
        label: `Navigated to ${TABS.find(t => t.id === tabId)?.label || tabId}`,
        detail: `from ${prevTabRef.current}`
      })
      prevTabRef.current = tabId
    }
    setActiveTab(tabId)
  }, [])

  const update = useCallback((patch: Partial<ModelState>) => {
    setState(prev => ({ ...prev, ...patch }))
  }, [])

  const handleReset = () => {
    if (confirm('Reset all inputs to defaults? Saved scenarios are kept.')) {
      setState(defaultState)
      appendActivity({ type: 'state_reset', label: 'Model reset to defaults' })
    }
  }

  const c = calcCompetitive(state)

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white" style={{fontFamily:"'DM Sans',sans-serif"}}>
      <header className="border-b border-white/10 sticky top-0 z-50 bg-[#0B0E14]">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#00D4A0] flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="8" width="3" height="7" fill="#0B0E14"/>
                <rect x="6" y="5" width="3" height="10" fill="#0B0E14"/>
                <rect x="11" y="2" width="3" height="13" fill="#0B0E14"/>
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">VRI Workforce Model</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest">Language Services · Advocate Health</div>
            </div>
          </div>

          {/* Live CPM pill */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 border border-white/10 bg-white/4">
              <div className={`w-1.5 h-1.5 rounded-full ${c.yourCPM <= state.vendorRate ? 'bg-[#00D4A0]' : 'bg-[#f87171]'}`} />
              <span className="text-[11px] text-white/50">CPM</span>
              <span className={`text-[13px] font-semibold font-mono ${c.yourCPM <= state.vendorRate ? 'text-[#00D4A0]' : 'text-[#f87171]'}`}>
                {fmtM(c.yourCPM, 3)}
              </span>
              <span className="text-[11px] text-white/30">vs ${state.vendorRate.toFixed(3)}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 border border-white/10 bg-white/4">
              <span className="text-[11px] text-white/50">Shrink</span>
              <span className={`text-[13px] font-semibold font-mono ${state.shrinkage > 35 ? 'text-[#f87171]' : state.shrinkage > 25 ? 'text-[#fbbf24]' : 'text-[#00D4A0]'}`}>
                {state.shrinkage.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 border border-white/10 bg-white/4">
              <span className="text-[11px] text-white/50">FTE</span>
              <span className="text-[13px] font-semibold font-mono text-white">{state.fte}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-save indicator */}
            <div className={`flex items-center gap-1.5 transition-all ${saveFlash ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${saveFlash ? 'bg-[#00D4A0]' : 'bg-white/30'}`} />
              <span className="text-[10px] text-white/40 font-mono hidden sm:block">
                {saveFlash ? 'Saving…' : lastSaved ? `Saved ${lastSaved}` : 'Auto-save on'}
              </span>
            </div>
            <button onClick={handleReset} className="text-[11px] text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded border border-white/8 hover:border-white/20">
              Reset
            </button>
            <span className="text-[11px] text-white/30 font-mono">v4.0</span>
          </div>
        </div>
      </header>

      <div className="border-b border-white/10 bg-[#0D1018]">
        <div className="max-w-[1400px] mx-auto px-6">
          <nav className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                className={`px-5 py-3.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === tab.id ? 'border-[#00D4A0] text-[#00D4A0]' : 'border-transparent text-white/40 hover:text-white/70'
                }`}>
                {tab.label}
                {tab.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-[#00D4A0] text-[#0B0E14]' : 'bg-white/10 text-white/50'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {activeTab === 'agent'       && <WFMAgent state={state} update={update} />}
        {activeTab === 'competitive' && <CompetitiveAnalysis state={state} update={update} />}
        {activeTab === 'productivity'&& <ProductivityModel state={state} update={update} />}
        {activeTab === 'shrinkage'   && <ShrinkageBreakdown state={state} update={update} />}
        {activeTab === 'hourly'      && <HourlySalary state={state} update={update} />}
        {activeTab === 'scenarios'   && <ScenarioPlanner state={state} update={update} />}
      </main>

      <footer className="border-t border-white/10 mt-16 py-6">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          <div className="text-[11px] text-white/25">Advocate Health · Enterprise Language Services &amp; Access · AVP Emmanuel Chepkwony</div>
          <div className="text-[11px] text-white/25 font-mono">Rewire 2030 · v4.0</div>
        </div>
      </footer>
    </div>
  )
}
