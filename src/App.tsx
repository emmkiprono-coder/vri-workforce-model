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
  { id: 'agent',        label: 'WFM Agent',    icon: '⚡', badge: 'AI' },
  { id: 'competitive',  label: 'Competitive',  icon: '📊' },
  { id: 'productivity', label: 'Productivity', icon: '📈' },
  { id: 'shrinkage',    label: 'Shrinkage',    icon: '⏱' },
  { id: 'hourly',       label: 'Hourly',       icon: '💰' },
  { id: 'scenarios',    label: 'Scenarios',    icon: '📋' },
]

export default function App() {
  const [activeTab, setActiveTab]         = useState('agent')
  const [state, setState]                  = useState<ModelState>(() => loadState())
  const [lastSaved, setLastSaved]          = useState<string>('')
  const [saveFlash, setSaveFlash]          = useState(false)
  const [sessionLogged, setSessionLogged]  = useState(false)
  const prevTabRef                         = useRef('agent')

  // Auto-save on every state change
  useEffect(() => {
    saveState(state)
    const meta = loadMeta()
    if (meta?.savedAt) setLastSaved(fmtDate(meta.savedAt))
    setSaveFlash(true)
    const t = setTimeout(() => setSaveFlash(false), 800)
    return () => clearTimeout(t)
  }, [state])

  // Log session start once
  useEffect(() => {
    if (!sessionLogged) {
      const c = calcCompetitive(state)
      appendActivity({ type: 'state_load', label: 'Session started', detail: `CPM ${fmtM(c.yourCPM, 3)}, FTE ${state.fte}, Shrink ${state.shrinkage.toFixed(1)}%` })
      setSessionLogged(true)
    }
  }, [sessionLogged])

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
    // Scroll to top on tab change (mobile)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
  const isCompetitive = c.yourCPM <= state.vendorRate

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white" style={{ fontFamily: "'DM Sans',sans-serif" }}>

      {/* ── Header ── */}
      <header className="border-b border-white/10 sticky top-0 z-50 bg-[#0B0E14]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#00D4A0] flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="8" width="3" height="7" fill="#0B0E14"/>
                <rect x="6" y="5" width="3" height="10" fill="#0B0E14"/>
                <rect x="11" y="2" width="3" height="13" fill="#0B0E14"/>
              </svg>
            </div>
            <div className="hidden xs:block">
              <div className="text-[12px] sm:text-[13px] font-semibold text-white leading-tight">VRI Workforce</div>
              <div className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-widest hidden sm:block">Language Services · Advocate Health</div>
            </div>
          </div>

          {/* Live CPM pill — always visible, compact on mobile */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-1 justify-center">
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 border transition-colors ${isCompetitive ? 'border-[#00D4A0]/30 bg-[#00D4A0]/8' : 'border-[#f87171]/30 bg-[#f87171]/8'}`}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCompetitive ? 'bg-[#00D4A0]' : 'bg-[#f87171]'}`} />
              <span className="text-[10px] text-white/50 hidden sm:inline">CPM</span>
              <span className={`text-[12px] sm:text-[13px] font-semibold font-mono tabular-nums ${isCompetitive ? 'text-[#00D4A0]' : 'text-[#f87171]'}`}>
                {fmtM(c.yourCPM, 3)}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 border border-white/10 bg-white/4">
              <span className="text-[11px] text-white/50">Shrink</span>
              <span className={`text-[12px] font-semibold font-mono ${state.shrinkage > 35 ? 'text-[#f87171]' : state.shrinkage > 25 ? 'text-[#fbbf24]' : 'text-[#00D4A0]'}`}>
                {state.shrinkage.toFixed(1)}%
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 border border-white/10 bg-white/4">
              <span className="text-[11px] text-white/50">FTE</span>
              <span className="text-[12px] font-semibold font-mono text-white">{state.fte}</span>
            </div>
          </div>

          {/* Save indicator + reset */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex items-center gap-1 transition-all ${saveFlash ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${saveFlash ? 'bg-[#00D4A0]' : 'bg-white/30'}`} />
              <span className="text-[9px] sm:text-[10px] text-white/40 font-mono hidden md:block">
                {saveFlash ? 'Saving…' : lastSaved ? `Saved ${lastSaved}` : 'Auto-save on'}
              </span>
            </div>
            <button onClick={handleReset}
              className="text-[10px] sm:text-[11px] text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded border border-white/8 hover:border-white/20">
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* ── Desktop tab bar (hidden on mobile, replaced by bottom nav) ── */}
      <div className="border-b border-white/10 bg-[#0D1018] hidden sm:block">
        <div className="max-w-[1400px] mx-auto px-6">
          <nav className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                className={`px-4 sm:px-5 py-3.5 text-[12px] sm:text-[13px] font-medium whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id ? 'border-[#00D4A0] text-[#00D4A0]' : 'border-transparent text-white/40 hover:text-white/70'
                }`}>
                <span className="sm:hidden">{tab.icon}</span>
                <span>{tab.label}</span>
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

      {/* ── Main content ── */}
      {/* pb-24 on mobile leaves room for the bottom nav */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-28 sm:pb-8">
        {activeTab === 'agent'        && <WFMAgent        state={state} update={update} />}
        {activeTab === 'competitive'  && <CompetitiveAnalysis state={state} update={update} />}
        {activeTab === 'productivity' && <ProductivityModel   state={state} update={update} />}
        {activeTab === 'shrinkage'    && <ShrinkageBreakdown  state={state} update={update} />}
        {activeTab === 'hourly'       && <HourlySalary        state={state} update={update} />}
        {activeTab === 'scenarios'    && <ScenarioPlanner     state={state} update={update} />}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0D1018] border-t border-white/10 pb-safe flex">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => handleTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 transition-all ${
              activeTab === tab.id ? 'text-[#00D4A0]' : 'text-white/35 active:text-white/70'
            }`}>
            <span className="text-[18px] leading-none">{tab.icon}</span>
            <span className="text-[9px] font-medium leading-tight text-center">{tab.label}</span>
            {tab.badge && activeTab === tab.id && (
              <span className="absolute top-1 right-0 text-[7px] font-bold bg-[#00D4A0] text-[#0B0E14] px-1 rounded-full">AI</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Footer (desktop only) ── */}
      <footer className="hidden sm:block border-t border-white/10 mt-16 py-6">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          <div className="text-[11px] text-white/25">Advocate Health · Enterprise Language Services &amp; Access · AVP Emmanuel Chepkwony</div>
          <div className="text-[11px] text-white/25 font-mono">Rewire 2030 · v4.1</div>
        </div>
      </footer>
    </div>
  )
}
