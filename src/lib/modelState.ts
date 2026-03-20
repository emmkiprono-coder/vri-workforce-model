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

export interface SavedScenario {
  id: string
  name: string
  label: string
  savedAt: string
  state: ModelState
  calcSnapshot: {
    yourCPM: number
    totalCost: number
    totalMins: number
    annualCalls: number
    savings: number
    shrinkage: number
  }
}

export interface ActivityEvent {
  id: string
  ts: string
  type: 'tab_change' | 'slider_change' | 'scenario_save' | 'scenario_export' | 'goal_set' | 'shrinkage_change' | 'agent_query' | 'state_load' | 'state_reset'
  label: string
  detail?: string
}

export interface AppMeta {
  savedAt: string
  version: string
  sessionStart: string
}

export interface ModelState {
  vendorRate: number
  fte: number
  salary: number
  benefits: number
  techCost: number
  aht: number
  cpd: number
  wdays: number
  occupancy: number
  dailyCallVolume: number
  useVolumeMode: boolean
  goalCPM: number
  goalMode: boolean
  paidHrs: number
  shrinkage: number
  monthlyVol: number
  peakPct: number
  slTarget: number
  tat: number
  shrinkVals: Record<string, number>
  hourlyRates: Record<string, number>
  hHrs: number
  hWdays: number
  hBenefits: number
  hOt: number
  hOtm: number
  activeHourlyRole: string
  // Burnout predictor inputs
  burnoutCallIntensity: number    // 1–5 scale
  burnoutSupervisorRatio: number  // interpreters per supervisor
  burnoutEnabled: boolean         // show burnout tab / apply model adjustment
}

// Shrinkage: meal breaks → Unpaid Lunch Break, personal → Planned Absenteeism (PTO)
// System downtime + system issues → combined into single "System downtime & tech issues"
export const SHRINK_PLANNED: ShrinkComponent[] = [
  { key: 'training',    label: 'Training & development',         val: 3,   min: 0, max: 15, bench: 2.5, benchLabel: '2–3%' },
  { key: 'meetings',   label: 'Team meetings / huddles',         val: 2,   min: 0, max: 10, bench: 1.5, benchLabel: '1–2%' },
  { key: 'coaching',   label: '1:1 coaching & supervision',      val: 1.5, min: 0, max: 8,  bench: 1.5, benchLabel: '1–2%' },
  { key: 'breaks',     label: 'Scheduled breaks (paid)',         val: 6,   min: 0, max: 15, bench: 6,   benchLabel: '5–7%' },
  { key: 'lunch',      label: 'Unpaid Lunch Break',              val: 0,   min: 0, max: 15, bench: 0,   benchLabel: '0% (unpaid)' },
  { key: 'pto',        label: 'Planned Absenteeism (PTO)',       val: 3,   min: 0, max: 15, bench: 3,   benchLabel: '2–5%' },
  { key: 'admin_sched',label: 'Administrative / paperwork',      val: 3,   min: 0, max: 15, bench: 2.5, benchLabel: '2–4%' },
  { key: 'system_all', label: 'System downtime & tech issues',   val: 1.5, min: 0, max: 10, bench: 1.5, benchLabel: '1–3%' },
]

export const SHRINK_UNPLANNED: ShrinkComponent[] = [
  { key: 'absenteeism',   label: 'Unplanned absenteeism',              val: 4,   min: 0, max: 20, bench: 3.5, benchLabel: '3–5%' },
  { key: 'late_arrive',   label: 'Late arrivals / early departures',   val: 1.5, min: 0, max: 8,  bench: 1,   benchLabel: '0.5–2%' },
  { key: 'aux_work',      label: 'After-call work / ACW overflow',     val: 2,   min: 0, max: 10, bench: 2,   benchLabel: '1–3%' },
  { key: 'idle_wrap',     label: 'Idle / wrap-up overflow',            val: 2,   min: 0, max: 10, bench: 1.5, benchLabel: '1–2%' },
  { key: 'voluntary_turn',label: 'Turnover / onboarding drag',         val: 1,   min: 0, max: 10, bench: 1,   benchLabel: '0.5–2%' },
]

export const HOURLY_ROLES: HourlyRole[] = [
  { key: 'interpreter',   label: 'Interpreter (non-cert)',    rate: 22 },
  { key: 'certified',     label: 'Interpreter (certified)',   rate: 28 },
  { key: 'senior_interp', label: 'Senior Interpreter',        rate: 32 },
  { key: 'coordinator',   label: 'Language Coordinator',      rate: 20 },
  { key: 'supervisor',    label: 'Interpreter Supervisor',    rate: 27 },
  { key: 'ops_manager',   label: 'Ops Manager',               rate: 38 },
  { key: 'lead',          label: 'Team Lead',                 rate: 25 },
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
  dailyCallVolume: 200,
  useVolumeMode: false,
  goalCPM: 0.60,
  goalMode: false,
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
  burnoutCallIntensity: 3,
  burnoutSupervisorRatio: 20,
  burnoutEnabled: true,
}

// ─── Calc helpers ─────────────────────────────────────────────────────────────

export function calcTotalShrinkage(shrinkVals: Record<string, number>) {
  return Object.values(shrinkVals).reduce((a, b) => a + b, 0)
}

export function calcEffectiveCPD(s: ModelState): number {
  if (s.useVolumeMode && s.fte > 0) return s.dailyCallVolume / s.fte
  return s.cpd
}

export function calcCompetitive(s: ModelState) {
  const totalCost    = s.fte * (s.salary * (1 + s.benefits / 100) + s.techCost)
  const effectiveCPD = calcEffectiveCPD(s)
  const shrinkFactor = 1 - (s.shrinkage / 100)
  const availableMinPerFtePerDay = s.paidHrs * 60 * shrinkFactor
  const capacityMins = s.fte * availableMinPerFtePerDay * s.wdays * (s.occupancy / 100)

  // VOLUME MODE: user enters actual call volume — that drives totalMins directly.
  // Do NOT cap against capacity here; capacity is shown as a warning, not a floor.
  // CPD MODE: derive from staffing math and cap at physical capacity ceiling.
  let totalMins: number
  let annualCalls: number

  if (s.useVolumeMode && s.fte > 0) {
    annualCalls = s.dailyCallVolume * s.wdays
    totalMins   = annualCalls * s.aht
  } else {
    annualCalls = s.fte * effectiveCPD * s.wdays
    totalMins   = Math.min(annualCalls * s.aht, capacityMins)
  }

  const annualMinutes = totalMins
  const yourCPM       = totalCost / Math.max(1, totalMins)
  const delta         = yourCPM - s.vendorRate
  const vendorEquiv   = totalMins * s.vendorRate
  const savings       = vendorEquiv - totalCost
  const capacityUtilization = capacityMins > 0 ? (totalMins / capacityMins) * 100 : 0

  const beCallsPerDay = totalCost / (s.fte * s.wdays * s.aht * s.vendorRate)
  const beAHT         = totalCost / (Math.max(1, s.fte * effectiveCPD * s.wdays) * s.vendorRate)

  const goalGap              = yourCPM - s.goalCPM
  const minutesNeededForGoal = s.goalCPM > 0 ? totalCost / s.goalCPM : 0
  const callsNeededForGoal   = s.aht > 0 ? minutesNeededForGoal / (s.wdays * s.aht) : 0
  const fteNeededForGoal     = s.goalCPM > 0 ? totalCost / (s.goalCPM * totalMins / Math.max(1, s.fte)) : 0

  return {
    totalCost, totalMins, yourCPM, delta, vendorEquiv, savings,
    beCallsPerDay, beAHT, effectiveCPD, shrinkFactor, capacityMins, capacityUtilization,
    annualCalls, annualMinutes,
    goalGap, minutesNeededForGoal, callsNeededForGoal, fteNeededForGoal
  }
}

// ─── Persistence (localStorage) ───────────────────────────────────────────────

const LS_STATE      = 'vri_model_state_v4'
const LS_SCENARIOS  = 'vri_scenarios_v4'
const LS_ACTIVITY   = 'vri_activity_v4'
const LS_META       = 'vri_meta_v4'

export function loadState(): ModelState {
  try {
    const raw = localStorage.getItem(LS_STATE)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw) as ModelState
    // Migrate: ensure new keys exist
    const merged = { ...defaultState, ...parsed }
    // Ensure new shrink keys exist
    ;[...SHRINK_PLANNED, ...SHRINK_UNPLANNED].forEach(c => {
      if (merged.shrinkVals[c.key] === undefined) merged.shrinkVals[c.key] = c.val
    })
    return merged
  } catch { return defaultState }
}

export function saveState(s: ModelState) {
  try {
    localStorage.setItem(LS_STATE, JSON.stringify(s))
    const meta: AppMeta = {
      savedAt: new Date().toISOString(),
      version: '4.0',
      sessionStart: loadMeta()?.sessionStart || new Date().toISOString()
    }
    localStorage.setItem(LS_META, JSON.stringify(meta))
  } catch {}
}

export function loadMeta(): AppMeta | null {
  try { return JSON.parse(localStorage.getItem(LS_META) || 'null') } catch { return null }
}

export function loadScenarios(): SavedScenario[] {
  try { return JSON.parse(localStorage.getItem(LS_SCENARIOS) || '[]') } catch { return [] }
}

export function saveScenarios(list: SavedScenario[]) {
  try { localStorage.setItem(LS_SCENARIOS, JSON.stringify(list)) } catch {}
}

export function loadActivity(): ActivityEvent[] {
  try { return JSON.parse(localStorage.getItem(LS_ACTIVITY) || '[]') } catch { return [] }
}

export function appendActivity(evt: Omit<ActivityEvent, 'id' | 'ts'>) {
  try {
    const list = loadActivity()
    const newEvt: ActivityEvent = {
      ...evt,
      id: Math.random().toString(36).slice(2),
      ts: new Date().toISOString()
    }
    // Keep last 500 events
    const trimmed = [newEvt, ...list].slice(0, 500)
    localStorage.setItem(LS_ACTIVITY, JSON.stringify(trimmed))
    return newEvt
  } catch { return null }
}

export function clearActivity() {
  try { localStorage.removeItem(LS_ACTIVITY) } catch {}
}

// ─── Export helpers ────────────────────────────────────────────────────────────

export function exportScenariosCSV(scenarios: SavedScenario[]): void {
  const headers = [
    'Name','Label','Saved At','FTE','Salary','Benefits%','TechCost',
    'AHT','CPD','Wdays','Occupancy%','Shrinkage%','VendorRate',
    'YourCPM','TotalCost','TotalMins','AnnualCalls','AnnualSavings'
  ]
  const rows = scenarios.map(s => [
    s.name, s.label, s.savedAt,
    s.state.fte, s.state.salary, s.state.benefits, s.state.techCost,
    s.state.aht, s.state.cpd, s.state.wdays, s.state.occupancy, s.state.shrinkage,
    s.state.vendorRate,
    s.calcSnapshot.yourCPM.toFixed(4),
    s.calcSnapshot.totalCost.toFixed(0),
    s.calcSnapshot.totalMins.toFixed(0),
    s.calcSnapshot.annualCalls.toFixed(0),
    s.calcSnapshot.savings.toFixed(0),
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  downloadFile(csv, `vri-scenarios-${dateStamp()}.csv`, 'text/csv')
}

export function exportScenariosJSON(scenarios: SavedScenario[]): void {
  downloadFile(
    JSON.stringify({ exportedAt: new Date().toISOString(), scenarios }, null, 2),
    `vri-scenarios-${dateStamp()}.json`,
    'application/json'
  )
}

export function exportActivityCSV(events: ActivityEvent[]): void {
  const headers = ['Timestamp','Type','Label','Detail']
  const rows = events.map(e => [e.ts, e.type, `"${e.label}"`, `"${e.detail || ''}"`])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  downloadFile(csv, `vri-activity-${dateStamp()}.csv`, 'text/csv')
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Format helpers ────────────────────────────────────────────────────────────

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

export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  } catch { return iso }
}

// ─── Burnout model ────────────────────────────────────────────────────────────

export interface BurnoutInputs {
  // Workload intensity
  callsPerFtePerDay: number       // effective CPD
  ahtMins: number                 // avg handle time
  occupancyPct: number            // % of available time on calls
  // Recovery / schedule
  paidHrsPerDay: number
  shrinkagePct: number            // total shrinkage eats into recovery time
  otHrsPerWeek: number            // overtime hours per week
  // Signals from shrinkage components
  unplannedAbsenteeismPct: number // 'absenteeism' key
  turnoverDragPct: number         // 'voluntary_turn' key
  lateArrivalsPct: number         // 'late_arrive' key
  // Environment
  callIntensity: number           // 1–5 scale: 1=low acuity, 5=high acuity/trauma
  supervisorRatio: number         // interpreters per supervisor (lower = more support)
}

export interface BurnoutResult {
  score: number                   // 0–100
  zone: 'healthy' | 'caution' | 'high' | 'critical'
  zoneLabel: string
  zoneColor: string
  drivers: { label: string; score: number; weight: number; contribution: number }[]
  projectedShrinkageInflation: number   // % pts shrinkage will rise if current burnout persists
  projectedTurnoverCost: number         // $ cost of projected additional turnover
  recoveryActions: string[]
  // Model adjustment: what does CPM look like with burnout-adjusted shrinkage?
  burnoutAdjustedShrinkage: number
}

// Burnout driver weights (must sum to 1.0)
const DRIVER_WEIGHTS = {
  callDensity:     0.22,   // calls × AHT = cognitive throughput
  recoveryDeficit: 0.20,   // occupancy leaves no buffer
  scheduleCompr:   0.18,   // shrinkage squeezes actual working time
  fatigue:         0.15,   // OT hours
  turnoverSignal:  0.13,   // absenteeism + turnover drag = leading indicator
  callIntensity:   0.12,   // emotional/cognitive demand of content
}

export function calcBurnout(inputs: BurnoutInputs, annualSalary: number): BurnoutResult {
  const {
    callsPerFtePerDay, ahtMins, occupancyPct,
    shrinkagePct, otHrsPerWeek,
    unplannedAbsenteeismPct, turnoverDragPct, lateArrivalsPct,
    callIntensity, supervisorRatio,
  } = inputs

  // ── Individual driver scores (0–100) ───────────────────────────────────────

  // 1. Call density: calls × AHT = minutes of cognitive work per day
  //    Benchmark: 20 calls × 8 min = 160 min. Red zone: >320 min (8 hrs of calls)
  const cognitiveMinutes = callsPerFtePerDay * ahtMins
  const callDensityScore = Math.min(100, (cognitiveMinutes / 320) * 100)

  // 2. Recovery deficit: occupancy above 85% leaves no mental buffer
  //    85% = yellow, 92%+ = red
  const recoveryScore = Math.min(100, Math.max(0, (occupancyPct - 50) / 45 * 100))

  // 3. Schedule compression: shrinkage above 35% means available work time is crushed
  //    The squeeze creates stress because staff feel they never have enough time
  const scheduleScore = Math.min(100, Math.max(0, (shrinkagePct - 15) / 40 * 100))

  // 4. Fatigue from overtime
  //    0 OT = 0, 5h/wk = 40, 10h/wk = 75, 15h/wk = 100
  const fatigueScore = Math.min(100, (otHrsPerWeek / 15) * 100)

  // 5. Turnover signal: unplanned absence + turnover drag + late arrivals are
  //    leading indicators of existing burnout
  const turnoverSignal = Math.min(100, ((unplannedAbsenteeismPct + turnoverDragPct + lateArrivalsPct) / 12) * 100)

  // 6. Call intensity: 1=low (routine admin), 5=high (trauma, ICU, mental health)
  const intensityScore = Math.min(100, ((callIntensity - 1) / 4) * 100)

  // ── Supervisor ratio adjustment: high ratio = less support = amplify score ─
  // Benchmark: 1:15 (good), 1:25 (acceptable), 1:40+ (at risk)
  const supervisionMultiplier = supervisorRatio <= 15 ? 0.9
    : supervisorRatio <= 25 ? 1.0
    : supervisorRatio <= 35 ? 1.10
    : 1.20

  // ── Composite score ────────────────────────────────────────────────────────
  const rawScore = (
    callDensityScore     * DRIVER_WEIGHTS.callDensity     +
    recoveryScore        * DRIVER_WEIGHTS.recoveryDeficit +
    scheduleScore        * DRIVER_WEIGHTS.scheduleCompr   +
    fatigueScore         * DRIVER_WEIGHTS.fatigue         +
    turnoverSignal       * DRIVER_WEIGHTS.turnoverSignal  +
    intensityScore       * DRIVER_WEIGHTS.callIntensity
  ) * supervisionMultiplier

  const score = Math.min(100, Math.round(rawScore))

  // ── Zone ───────────────────────────────────────────────────────────────────
  const zone: BurnoutResult['zone'] =
    score < 30 ? 'healthy' :
    score < 55 ? 'caution' :
    score < 75 ? 'high'    : 'critical'

  const zoneLabel = { healthy: 'Healthy', caution: 'Caution', high: 'High Risk', critical: 'Critical' }[zone]
  const zoneColor = { healthy: '#00D4A0', caution: '#fbbf24', high: '#f97316', critical: '#f87171' }[zone]

  // ── Drivers breakdown ──────────────────────────────────────────────────────
  const drivers = [
    { label: 'Call density / cognitive load',  score: Math.round(callDensityScore), weight: DRIVER_WEIGHTS.callDensity,     contribution: Math.round(callDensityScore * DRIVER_WEIGHTS.callDensity) },
    { label: 'Recovery deficit (occupancy)',    score: Math.round(recoveryScore),    weight: DRIVER_WEIGHTS.recoveryDeficit, contribution: Math.round(recoveryScore * DRIVER_WEIGHTS.recoveryDeficit) },
    { label: 'Schedule compression',            score: Math.round(scheduleScore),    weight: DRIVER_WEIGHTS.scheduleCompr,   contribution: Math.round(scheduleScore * DRIVER_WEIGHTS.scheduleCompr) },
    { label: 'Fatigue (overtime)',               score: Math.round(fatigueScore),     weight: DRIVER_WEIGHTS.fatigue,         contribution: Math.round(fatigueScore * DRIVER_WEIGHTS.fatigue) },
    { label: 'Turnover signals',                 score: Math.round(turnoverSignal),   weight: DRIVER_WEIGHTS.turnoverSignal,  contribution: Math.round(turnoverSignal * DRIVER_WEIGHTS.turnoverSignal) },
    { label: 'Call intensity / acuity',          score: Math.round(intensityScore),   weight: DRIVER_WEIGHTS.callIntensity,   contribution: Math.round(intensityScore * DRIVER_WEIGHTS.callIntensity) },
  ].sort((a, b) => b.contribution - a.contribution)

  // ── Projected shrinkage inflation ──────────────────────────────────────────
  // Research basis: each 10pt increase in burnout score above 40 adds ~1.2% shrinkage
  // through increased absenteeism, lateness, and presenteeism
  const shrinkageInflation = score > 40
    ? parseFloat((((score - 40) / 10) * 1.2).toFixed(1))
    : 0

  // ── Projected turnover cost ────────────────────────────────────────────────
  // Burnout → voluntary turnover rate rise. Each 10pt above 50 adds ~3% annualized turnover risk.
  // Replacement cost = 50–200% of annual salary; use 80% for healthcare interpreters.
  const addedTurnoverRate = score > 50 ? ((score - 50) / 10) * 0.03 : 0
  const projectedTurnoverCost = annualSalary * 0.80 * addedTurnoverRate

  // ── Burnout-adjusted shrinkage for model feedback ──────────────────────────
  const burnoutAdjustedShrinkage = Math.min(70, parseFloat((inputs.shrinkagePct + shrinkageInflation).toFixed(1)))

  // ── Recovery actions ───────────────────────────────────────────────────────
  const recoveryActions: string[] = []
  if (occupancyPct > 85)         recoveryActions.push(`Cap occupancy at 85% — current ${occupancyPct}% leaves no cognitive recovery buffer`)
  if (callDensityScore > 60)     recoveryActions.push(`Reduce daily cognitive minutes — rotate high-acuity calls with lower-intensity ones`)
  if (otHrsPerWeek > 4)          recoveryActions.push(`Limit overtime to ≤4 hrs/week — current ${otHrsPerWeek}h is above safe threshold`)
  if (shrinkagePct > 35)         recoveryActions.push(`High shrinkage (${shrinkagePct.toFixed(1)}%) compresses productive windows — prioritize reducing absenteeism drivers`)
  if (callIntensity >= 4)        recoveryActions.push(`High-acuity content requires mandatory debriefing time and peer support structures`)
  if (supervisorRatio > 25)      recoveryActions.push(`Supervisor ratio ${supervisorRatio}:1 is high — add team lead layer or reduce span of control`)
  if (unplannedAbsenteeismPct>5) recoveryActions.push(`Unplanned absence at ${unplannedAbsenteeismPct}% is a burnout signal — investigate root cause before adding FTEs`)
  if (turnoverDragPct > 1.5)     recoveryActions.push(`Turnover drag ${turnoverDragPct}% — exit interviews and stay interviews needed now`)
  if (recoveryActions.length === 0) recoveryActions.push('Current operating parameters are within healthy range — maintain and monitor quarterly')

  return {
    score, zone, zoneLabel, zoneColor, drivers,
    projectedShrinkageInflation: shrinkageInflation,
    projectedTurnoverCost,
    recoveryActions,
    burnoutAdjustedShrinkage,
  }
}
