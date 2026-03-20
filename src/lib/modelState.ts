export interface ShrinkComponent {
  key: string
  label: string
  val: number
  min: number
  max: number
  bench: number
  benchLabel: string
}

export interface HourlyRole {
  key: string
  label: string
  rate: number
}

export interface ModelState {
  // Competitive
  vendorRate: number
  fte: number
  salary: number
  benefits: number
  techCost: number
  aht: number
  cpd: number
  wdays: number
  occupancy: number
  // Productivity
  paidHrs: number
  shrinkage: number
  monthlyVol: number
  peakPct: number
  slTarget: number
  tat: number
  // Shrinkage values keyed by component key
  shrinkVals: Record<string, number>
  // Hourly
  hourlyRates: Record<string, number>
  hHrs: number
  hWdays: number
  hBenefits: number
  hOt: number
  hOtm: number
  activeHourlyRole: string
}

export const SHRINK_PLANNED: ShrinkComponent[] = [
  { key: 'training', label: 'Training & development', val: 3, min: 0, max: 15, bench: 2.5, benchLabel: '2–3%' },
  { key: 'meetings', label: 'Team meetings / huddles', val: 2, min: 0, max: 10, bench: 1.5, benchLabel: '1–2%' },
  { key: 'coaching', label: '1:1 coaching & supervision', val: 1.5, min: 0, max: 8, bench: 1.5, benchLabel: '1–2%' },
  { key: 'breaks', label: 'Scheduled breaks (paid)', val: 6, min: 0, max: 15, bench: 6, benchLabel: '5–7%' },
  { key: 'meals', label: 'Meal breaks (paid time)', val: 0, min: 0, max: 10, bench: 0, benchLabel: '0–5%' },
  { key: 'admin_sched', label: 'Administrative / paperwork', val: 3, min: 0, max: 15, bench: 2.5, benchLabel: '2–4%' },
  { key: 'system_maint', label: 'System downtime / planned IT', val: 1, min: 0, max: 5, bench: 1, benchLabel: '0.5–2%' },
]

export const SHRINK_UNPLANNED: ShrinkComponent[] = [
  { key: 'absenteeism', label: 'Unplanned absenteeism', val: 4, min: 0, max: 20, bench: 3.5, benchLabel: '3–5%' },
  { key: 'late_arrive', label: 'Late arrivals / early departures', val: 1.5, min: 0, max: 8, bench: 1, benchLabel: '0.5–2%' },
  { key: 'aux_work', label: 'After-call work / ACW overflow', val: 2, min: 0, max: 10, bench: 2, benchLabel: '1–3%' },
  { key: 'sys_issues', label: 'System issues / tech outages', val: 1, min: 0, max: 8, bench: 1, benchLabel: '0.5–2%' },
  { key: 'personal', label: 'Personal time / comfort breaks', val: 2, min: 0, max: 10, bench: 2, benchLabel: '1–3%' },
  { key: 'idle_wrap', label: 'Idle / wrap-up overflow', val: 2, min: 0, max: 10, bench: 1.5, benchLabel: '1–2%' },
  { key: 'voluntary_turn', label: 'Turnover / onboarding drag', val: 1, min: 0, max: 10, bench: 1, benchLabel: '0.5–2%' },
]

export const HOURLY_ROLES: HourlyRole[] = [
  { key: 'interpreter', label: 'Interpreter (non-cert)', rate: 22 },
  { key: 'certified', label: 'Interpreter (certified)', rate: 28 },
  { key: 'senior_interp', label: 'Senior Interpreter', rate: 32 },
  { key: 'coordinator', label: 'Language Coordinator', rate: 20 },
  { key: 'supervisor', label: 'Interpreter Supervisor', rate: 27 },
  { key: 'ops_manager', label: 'Ops Manager', rate: 38 },
  { key: 'lead', label: 'Team Lead', rate: 25 },
]

const initShrinkVals: Record<string, number> = {}
;[...SHRINK_PLANNED, ...SHRINK_UNPLANNED].forEach(c => { initShrinkVals[c.key] = c.val })

const initHourlyRates: Record<string, number> = {}
HOURLY_ROLES.forEach(r => { initHourlyRates[r.key] = r.rate })

export const defaultState: ModelState = {
  vendorRate: 0.725,
  fte: 10,
  salary: 55000,
  benefits: 30,
  techCost: 3000,
  aht: 12,
  cpd: 20,
  wdays: 230,
  occupancy: 75,
  paidHrs: 8,
  shrinkage: 27,
  monthlyVol: 4000,
  peakPct: 40,
  slTarget: 80,
  tat: 30,
  shrinkVals: initShrinkVals,
  hourlyRates: initHourlyRates,
  hHrs: 8,
  hWdays: 230,
  hBenefits: 30,
  hOt: 0,
  hOtm: 1.5,
  activeHourlyRole: 'interpreter',
}

// Calculation helpers
export function calcTotalShrinkage(shrinkVals: Record<string, number>) {
  return Object.values(shrinkVals).reduce((a, b) => a + b, 0)
}

export function calcCompetitive(s: ModelState) {
  const totalCost = s.fte * (s.salary * (1 + s.benefits / 100) + s.techCost)
  const totalMins = s.fte * s.cpd * s.wdays * s.aht
  const yourCPM = totalCost / totalMins
  const delta = yourCPM - s.vendorRate
  const vendorEquiv = totalMins * s.vendorRate
  const savings = vendorEquiv - totalCost
  const beCallsPerDay = totalCost / (s.fte * s.wdays * s.aht * s.vendorRate)
  const beAHT = totalCost / (s.fte * s.cpd * s.wdays * s.vendorRate)
  return { totalCost, totalMins, yourCPM, delta, vendorEquiv, savings, beCallsPerDay, beAHT }
}

export function fmtK(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M'
  if (abs >= 1000) return sign + '$' + (abs / 1000).toFixed(1) + 'K'
  return sign + '$' + abs.toFixed(0)
}

export function fmtM(n: number, d = 2): string {
  if (isNaN(n) || !isFinite(n)) return '—'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function fmt(n: number, d = 0): string {
  if (isNaN(n) || !isFinite(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}
