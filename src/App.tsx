import { useState } from 'react'
import { CompetitiveAnalysis } from './components/CompetitiveAnalysis'
import { ProductivityModel } from './components/ProductivityModel'
import { ShrinkageBreakdown } from './components/ShrinkageBreakdown'
import { HourlySalary } from './components/HourlySalary'
import { ScenarioPlanner } from './components/ScenarioPlanner'
import { type ModelState, defaultState } from './lib/modelState'

const TABS = [
  { id: 'competitive', label: 'Competitive Analysis' },
  { id: 'productivity', label: 'Productivity Model' },
  { id: 'shrinkage', label: 'Shrinkage Breakdown' },
  { id: 'hourly', label: 'Hourly Salary' },
  { id: 'scenarios', label: 'Scenario Planner' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('competitive')
  const [state, setState] = useState<ModelState>(defaultState)
  const update = (patch: Partial<ModelState>) => setState(prev => ({ ...prev, ...patch }))

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white" style={{fontFamily:"'DM Sans',sans-serif"}}>
      <header className="border-b border-white/10 sticky top-0 z-50 bg-[#0B0E14]">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/30 font-mono">v2.0</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#00D4A0] animate-pulse"/>
          </div>
        </div>
      </header>
      <div className="border-b border-white/10 bg-[#0D1018]">
        <div className="max-w-[1400px] mx-auto px-6">
          <nav className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id ? 'border-[#00D4A0] text-[#00D4A0]' : 'border-transparent text-white/40 hover:text-white/70'
                }`}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {activeTab === 'competitive' && <CompetitiveAnalysis state={state} update={update} />}
        {activeTab === 'productivity' && <ProductivityModel state={state} update={update} />}
        {activeTab === 'shrinkage' && <ShrinkageBreakdown state={state} update={update} />}
        {activeTab === 'hourly' && <HourlySalary state={state} update={update} />}
        {activeTab === 'scenarios' && <ScenarioPlanner state={state} />}
      </main>
      <footer className="border-t border-white/10 mt-16 py-6">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          <div className="text-[11px] text-white/25">Advocate Health · Enterprise Language Services &amp; Access · AVP Emmanuel Chepkwony</div>
          <div className="text-[11px] text-white/25 font-mono">Rewire 2030</div>
        </div>
      </footer>
    </div>
  )
}
