import { type ReactNode } from 'react'

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-3 pb-2 border-b border-white/8">
      {children}
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  variant?: 'default' | 'info' | 'success' | 'danger' | 'warning'
}

const variantStyles = {
  default: 'bg-white/5 border-white/10',
  info: 'bg-[#00D4A0]/10 border-[#00D4A0]/30',
  success: 'bg-emerald-500/10 border-emerald-500/30',
  danger: 'bg-red-500/10 border-red-500/30',
  warning: 'bg-amber-500/10 border-amber-500/30',
}

const valueStyles = {
  default: 'text-white',
  info: 'text-[#00D4A0]',
  success: 'text-emerald-400',
  danger: 'text-red-400',
  warning: 'text-amber-400',
}

export function MetricCard({ label, value, sub, variant = 'default' }: MetricCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${variantStyles[variant]}`}>
      <div className="text-[11px] text-white/40 mb-1">{label}</div>
      <div className={`text-[22px] font-semibold leading-tight ${valueStyles[variant]}`}>{value}</div>
      {sub && <div className="text-[11px] text-white/30 mt-1">{sub}</div>}
    </div>
  )
}

interface SliderRowProps {
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

export function SliderRow({ label, value, display, min, max, step, onChange }: SliderRowProps) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[13px] text-white/70">{label}</span>
        <span className="text-[13px] font-semibold text-[#00D4A0]">{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #00D4A0 0%, #00D4A0 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.15) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.15) 100%)`
        }}
      />
    </div>
  )
}

interface StatusBannerProps {
  status: 'green' | 'amber' | 'red'
  message: string
}

export function StatusBanner({ status, message }: StatusBannerProps) {
  const colors = {
    green: { dot: 'bg-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/8' },
    amber: { dot: 'bg-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/8' },
    red: { dot: 'bg-red-400', border: 'border-red-500/30', bg: 'bg-red-500/8' },
  }
  const c = colors[status]
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${c.border} ${c.bg} mb-6`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 animate-pulse ${c.dot}`} />
      <span className="text-[13px] text-white/70">{message}</span>
    </div>
  )
}

export function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: 'success' | 'danger' | 'warning' | 'info' | 'default' }) {
  const v = {
    default: 'bg-white/10 text-white/50',
    success: 'bg-emerald-500/20 text-emerald-400',
    danger: 'bg-red-500/20 text-red-400',
    warning: 'bg-amber-500/20 text-amber-400',
    info: 'bg-[#00D4A0]/20 text-[#00D4A0]',
  }
  return <span className={`inline-block text-[11px] px-2 py-0.5 rounded font-medium ${v[variant]}`}>{children}</span>
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white/4 border border-white/8 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  )
}

// Global slider styles injected once
export function GlobalStyles() {
  return (
    <style>{`
      input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #00D4A0;
        cursor: pointer;
        border: 2px solid #0B0E14;
        box-shadow: 0 0 0 2px #00D4A0;
      }
      input[type=range]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #00D4A0;
        cursor: pointer;
        border: 2px solid #0B0E14;
        box-shadow: 0 0 0 2px #00D4A0;
      }
      input[type=number] {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 8px;
        color: white;
        padding: 4px 8px;
        font-size: 13px;
        text-align: right;
        width: 72px;
      }
      input[type=number]:focus { outline: none; border-color: #00D4A0; }
      select {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 8px;
        color: white;
        padding: 8px 12px;
        font-size: 13px;
        width: 100%;
      }
      select:focus { outline: none; border-color: #00D4A0; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      thead th { text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.35); padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.08); }
      tbody td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.75); }
      tbody tr:last-child td { border-bottom: none; }
      tbody tr:hover td { background: rgba(255,255,255,0.03); }
      .highlight-row td { background: rgba(0,212,160,0.06) !important; }
    `}</style>
  )
}
