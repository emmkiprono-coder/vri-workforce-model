import { useState, useRef, useEffect } from 'react'
import { type ModelState, calcCompetitive, fmtM, fmt, fmtK, appendActivity } from '../lib/modelState'
import { GlobalStyles } from './ui-kit'

interface Props { state: ModelState; update: (p: Partial<ModelState>) => void }

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

const SYSTEM_PROMPT = (state: ModelState) => {
  const c = calcCompetitive(state)
  return `You are an elite Workforce Management (WFM) Analyst and operational efficiency advisor embedded inside the VRI Workforce Competitiveness Model for Advocate Health's Enterprise Language Services & Access team.

Your role: Act as a strategic WFM partner to the AVP. You have full visibility into the model's live data.

CURRENT MODEL STATE (live):
- FTE count: ${state.fte}
- Annual salary per FTE: $${state.salary.toLocaleString()}
- Benefits load: ${state.benefits}%
- Tech overhead per FTE: $${state.techCost.toLocaleString()}/yr
- Total annual cost: ${fmtK(c.totalCost)}
- AHT (avg handle time): ${state.aht} min
- Calls per FTE per day: ${fmt(c.effectiveCPD, 1)}
- Total daily call volume: ${fmt(c.effectiveCPD * state.fte, 0)}
- Annual call volume: ${fmt(c.annualCalls, 0)}
- Annual call minutes: ${fmt(c.annualMinutes, 0)} min
- Work days/year: ${state.wdays}
- Occupancy: ${state.occupancy}%
- Total shrinkage: ${state.shrinkage.toFixed(1)}%
- Productive time: ${(c.shrinkFactor * 100).toFixed(1)}%
- Your CPM: ${fmtM(c.yourCPM, 3)}/min
- Vendor rate (Language Line): $${state.vendorRate.toFixed(3)}/min
- CPM delta vs vendor: ${c.delta >= 0 ? '+' : ''}${fmtM(c.delta, 3)}/min
- Annual savings vs vendor: ${fmtK(c.savings)}
- Competitive status: ${c.yourCPM <= state.vendorRate ? 'COMPETITIVE' : 'NOT YET COMPETITIVE'}
- Break-even calls/FTE/day: ${fmt(c.beCallsPerDay, 1)}

SHRINKAGE BREAKDOWN:
${Object.entries(state.shrinkVals).map(([k,v]) => `  ${k}: ${v.toFixed(1)}%`).join('\n')}

YOUR ROLE:
- Answer as a seasoned WFM director who knows Erlang C, staffing optimization, shrinkage management, and language services operations
- Give specific numbers, not vague advice
- Flag risks, tradeoffs, and downstream impacts
- Reference live model data in answers
- Keep responses concise — use short bullets when helpful
- This is a healthcare language services context: 300+ interpreters, VRI/OPI/in-person, Joint Commission readiness
- Suggest specific slider adjustments the user should make
`
}

const QUICK_PROMPTS = [
  "Biggest efficiency gap right now?",
  "How do I hit $0.60/min CPM?",
  "Which shrinkage to target first?",
  "FTEs for 500 calls/day?",
  "Break-even volume at current staffing?",
  "Analyze my occupancy",
  "90-day shrinkage reduction plan",
  "Cost of 1% shrinkage reduction",
]

export function WFMAgent({ state, update: _update }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const c = calcCompetitive(state)
    return [{
      role: 'assistant',
      content: `Good day. I'm your WFM Analyst with live visibility into your model.\n\n**Right now:**\n• **${state.fte} FTEs** | CPM: **${fmtM(c.yourCPM, 3)}/min** vs vendor **$${state.vendorRate.toFixed(3)}/min**\n• **${state.shrinkage.toFixed(1)}% shrinkage** reducing productive capacity\n• **${fmt(c.annualCalls, 0)} annual calls** × **${state.aht} min AHT**\n\nAsk me anything — goal analysis, staffing, shrinkage strategy, or efficiency modeling.`,
      ts: Date.now()
    }]
  })
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef           = useRef<HTMLDivElement>(null)
  const chatRef             = useRef<HTMLDivElement>(null)
  const textareaRef         = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // On iOS, when keyboard appears the viewport shrinks — scroll to bottom
  useEffect(() => {
    const handler = () => {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)
    }
    textareaRef.current?.addEventListener('focus', handler)
    return () => textareaRef.current?.removeEventListener('focus', handler)
  }, [])

  const send = async (text?: string) => {
    const userText = (text || input).trim()
    if (!userText || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: userText, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    appendActivity({ type: 'agent_query', label: userText.slice(0, 80), detail: `CPM ${fmtM(calcCompetitive(state).yourCPM, 3)}` })

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT(state),
          messages: [...history, { role: 'user', content: userText }]
        })
      })
      const data = await res.json()
      const reply = data.content?.find((b: any) => b.type === 'text')?.text || 'No response.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.', ts: Date.now() }])
    }
    setLoading(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    // On mobile, Enter should NOT send (virtual keyboard Enter = newline)
    // Only send on desktop with Enter (no shift)
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 640) {
      e.preventDefault(); send()
    }
  }

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const html = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.+?)`/g, '<code style="background:rgba(0,212,160,0.15);color:#00D4A0;padding:1px 5px;border-radius:4px;font-size:11px;">$1</code>')
      return (
        <div key={i} className={`${i > 0 && line === '' ? 'mt-2' : ''} ${line.trim().startsWith('•') || line.trim().startsWith('-') ? 'ml-2' : ''}`}
          dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} />
      )
    })
  }

  const c = calcCompetitive(state)
  const isCompetitive = c.yourCPM <= state.vendorRate

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 130px)', minHeight: 500, maxHeight: 900 }}>
      <GlobalStyles />

      {/* Live model snapshot — horizontally scrollable on mobile */}
      <div className="rounded-xl border border-white/10 bg-[#111520] px-4 py-3 mb-3 overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-4 min-w-max">
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Live</div>
          {[
            { label: 'FTE',        value: String(state.fte) },
            { label: 'CPM',        value: fmtM(c.yourCPM, 3),           color: isCompetitive ? '#00D4A0' : '#f87171' },
            { label: 'Vendor',     value: `$${state.vendorRate.toFixed(3)}`, color: '#60a5fa' },
            { label: 'Shrinkage',  value: `${state.shrinkage.toFixed(1)}%`,  color: state.shrinkage > 30 ? '#f87171' : '#fbbf24' },
            { label: 'AHT',        value: `${state.aht}m` },
            { label: 'Daily Calls',value: fmt(c.effectiveCPD * state.fte, 0) },
            { label: 'Ann. Mins',  value: fmt(c.annualMinutes, 0) },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/35 whitespace-nowrap">{label}</span>
              <span className="text-[12px] font-semibold tabular-nums whitespace-nowrap" style={{ color: color || 'white' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick prompts — horizontal scroll on mobile */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
        {QUICK_PROMPTS.map(p => (
          <button key={p} onClick={() => send(p)} disabled={loading}
            className="text-[11px] px-3 py-2 rounded-full border border-white/12 text-white/50 hover:text-white/80 hover:border-white/25 transition-all disabled:opacity-40 bg-white/3 whitespace-nowrap flex-shrink-0 active:bg-white/10">
            {p}
          </button>
        ))}
      </div>

      {/* Chat window — grows to fill available space */}
      <div ref={chatRef} className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-[#0D1018] p-3 sm:p-4 space-y-4" style={{ minHeight: 0, overscrollBehavior: 'contain' }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 sm:gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${
              m.role === 'assistant' ? 'bg-[#00D4A0] text-[#0B0E14]' : 'bg-white/10 text-white/70'
            }`}>
              {m.role === 'assistant' ? 'WF' : 'ME'}
            </div>
            <div className={`max-w-[85%] sm:max-w-[80%] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[12px] sm:text-[13px] leading-relaxed ${
              m.role === 'assistant'
                ? 'bg-[#111520] border border-white/8 text-white/85'
                : 'bg-[#00D4A0]/10 border border-[#00D4A0]/20 text-white/90 text-right'
            }`}>
              {m.role === 'assistant' ? renderContent(m.content) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 sm:gap-3">
            <div className="w-7 h-7 rounded-full bg-[#00D4A0] flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-[#0B0E14]">WF</div>
            <div className="bg-[#111520] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#00D4A0] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar — fixed at bottom on mobile */}
      <div className="mt-3 flex gap-2 sm:gap-3 items-end flex-shrink-0">
        <textarea
          ref={textareaRef}
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything — staffing goals, shrinkage strategy, efficiency analysis…"
          disabled={loading}
          className="flex-1 resize-none rounded-xl border border-white/12 bg-[#111520] text-white/85 text-[13px] px-4 py-3 placeholder:text-white/25 focus:outline-none focus:border-[#00D4A0]/50 disabled:opacity-50"
          style={{ minHeight: 52, maxHeight: 120 }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 active:scale-95"
          style={{
            width: 52, height: 52, flexShrink: 0,
            background: loading || !input.trim() ? 'rgba(255,255,255,0.08)' : '#00D4A0'
          }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 9L16 9M16 9L10 3M16 9L10 15"
              stroke={loading || !input.trim() ? 'rgba(255,255,255,0.3)' : '#0B0E14'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <div className="text-[9px] sm:text-[10px] text-white/20 text-center mt-1.5">
        <span className="hidden sm:inline">Enter to send · </span>Tap ↑ to send on mobile
      </div>
    </div>
  )
}
