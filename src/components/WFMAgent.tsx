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

Your role: Act as a strategic WFM partner to the AVP. You have full visibility into the model's live data and provide concise, actionable workforce guidance.

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
- Answer questions as a seasoned WFM director who knows Erlang C, staffing optimization, shrinkage management, and language services operations
- When asked about goals, calculate precise levers: how many more calls, what shrinkage reduction, what AHT improvement is needed
- Give specific numbers, not vague advice
- Flag risks, tradeoffs, and downstream impacts
- Reference the live model data in your answers
- Keep responses concise and structured (use short bullets when helpful)
- This is a healthcare language services context: 300+ interpreters, VRI/OPI/in-person, Joint Commission readiness, Language Line vendor relationship
- You can suggest specific slider adjustments the user should make in the model
`
}

const QUICK_PROMPTS = [
  "What's my biggest efficiency gap right now?",
  "How do I get to $0.60/min CPM?",
  "What shrinkage components should I target first?",
  "How many FTEs do I need to handle 500 calls/day?",
  "What's my break-even volume at current staffing?",
  "Analyze my occupancy and utilization",
  "Build me a 90-day plan to reduce shrinkage by 5%",
  "What's the cost of 1% shrinkage reduction at my scale?",
]

export function WFMAgent({ state, update: _update }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Good day. I'm your WFM Analyst — I have full visibility into your model's live data.\n\nRight now your team shows:\n• **${state.fte} FTEs** | CPM: **${fmtM(calcCompetitive(state).yourCPM, 3)}/min** vs vendor **$${state.vendorRate.toFixed(3)}/min**\n• **${state.shrinkage.toFixed(1)}% shrinkage** reducing your productive capacity\n• **${fmt(calcCompetitive(state).annualCalls, 0)} annual calls** × **${state.aht} min AHT**\n\nAsk me anything — goal analysis, staffing recommendations, shrinkage strategy, break-even modeling, or operational efficiency.`,
      ts: Date.now()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.', ts: Date.now() }])
    }
    setLoading(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // Format markdown-lite: bold, bullets
  const renderContent = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      const formatted = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.+?)`/g, '<code style="background:rgba(0,212,160,0.15);color:#00D4A0;padding:1px 5px;border-radius:4px;font-size:11px;">$1</code>')
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().match(/^\d+\.\s/)
      return (
        <div key={i} className={`${isBullet ? 'ml-2' : ''} ${i > 0 && line === '' ? 'mt-2' : ''}`}
          dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }} />
      )
    })
  }

  const c = calcCompetitive(state)
  const isCompetitive = c.yourCPM <= state.vendorRate

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', minHeight: 600, maxHeight: 900 }}>
      <GlobalStyles />

      {/* Live model snapshot bar */}
      <div className="rounded-xl border border-white/10 bg-[#111520] px-5 py-3 mb-4 flex flex-wrap gap-5 items-center">
        <div className="text-[11px] text-white/40 uppercase tracking-widest font-semibold">Live Model</div>
        {[
          { label: 'FTE', value: String(state.fte) },
          { label: 'CPM', value: fmtM(c.yourCPM, 3), color: isCompetitive ? '#00D4A0' : '#f87171' },
          { label: 'Vendor', value: `$${state.vendorRate.toFixed(3)}`, color: '#60a5fa' },
          { label: 'Shrinkage', value: `${state.shrinkage.toFixed(1)}%`, color: state.shrinkage > 30 ? '#f87171' : '#fbbf24' },
          { label: 'AHT', value: `${state.aht}m` },
          { label: 'Daily Calls', value: fmt(c.effectiveCPD * state.fte, 0) },
          { label: 'Ann. Mins', value: fmt(c.annualMinutes, 0) },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-[11px] text-white/35">{label}</span>
            <span className="text-[13px] font-semibold" style={{ color: color || 'white' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_PROMPTS.map(p => (
          <button key={p} onClick={() => send(p)} disabled={loading}
            className="text-[11px] px-3 py-1.5 rounded-full border border-white/12 text-white/50 hover:text-white/80 hover:border-white/25 transition-all disabled:opacity-40 bg-white/3">
            {p}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-[#0D1018] p-4 mb-4 space-y-4" style={{ minHeight: 0 }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5 ${
              m.role === 'assistant' ? 'bg-[#00D4A0] text-[#0B0E14]' : 'bg-white/10 text-white/70'
            }`}>
              {m.role === 'assistant' ? 'WF' : 'ME'}
            </div>
            <div className={`max-w-[82%] rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
              m.role === 'assistant'
                ? 'bg-[#111520] border border-white/8 text-white/85'
                : 'bg-[#00D4A0]/10 border border-[#00D4A0]/20 text-white/90 text-right'
            }`}>
              {m.role === 'assistant' ? renderContent(m.content) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[#00D4A0] flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-[#0B0E14]">WF</div>
            <div className="bg-[#111520] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#00D4A0] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask your WFM Analyst anything — staffing goals, shrinkage strategy, efficiency analysis, scenario modeling..."
          disabled={loading}
          className="flex-1 resize-none rounded-xl border border-white/12 bg-[#111520] text-white/85 text-[13px] px-4 py-3 placeholder:text-white/25 focus:outline-none focus:border-[#00D4A0]/50 disabled:opacity-50"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="h-[58px] w-[58px] rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
          style={{ background: loading || !input.trim() ? 'rgba(255,255,255,0.08)' : '#00D4A0' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 9L16 9M16 9L10 3M16 9L10 15" stroke={loading || !input.trim() ? 'rgba(255,255,255,0.3)' : '#0B0E14'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <div className="text-[10px] text-white/20 text-center mt-2">Enter to send · Shift+Enter for new line · Model data updates in real time</div>
    </div>
  )
}
