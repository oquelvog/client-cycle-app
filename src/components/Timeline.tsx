'use client'

import { useState, useEffect, useMemo } from 'react'
import ChecklistModal from './ChecklistModal'
import ClientDetailModal from './ClientDetailModal'
import MultiClientAction from './MultiClientAction'

// ── Constants ────────────────────────────────────────────────────
const YEAR_HEIGHT = 2400          // px for the 12-month rolling window
const MS_PER_DAY = 86_400_000
const WINDOW_DAYS = 364           // 182 back + 182 forward
const PX_PER_DAY = YEAR_HEIGHT / WINDOW_DAYS
const GUTTER_THRESHOLD_DAYS = 182 // clients stuck >6 months → gutter

// ── Helpers ──────────────────────────────────────────────────────
function getWindow() {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = new Date(today.getTime() - 182 * MS_PER_DAY)
  const end   = new Date(today.getTime() + 182 * MS_PER_DAY)
  return { today, start, end }
}

function dateToTop(date: Date, windowStart: Date): number {
  return ((date.getTime() - windowStart.getTime()) / MS_PER_DAY) * PX_PER_DAY
}

/** Returns the instance of dayOfYear that falls within the rolling window, or null. */
function dayInWindow(dayOfYear: number, start: Date, end: Date): Date | null {
  const base = start.getFullYear()
  for (const y of [base - 1, base, base + 1, base + 2]) {
    const d = new Date(y, 0); d.setDate(dayOfYear); d.setHours(0, 0, 0, 0)
    if (d >= start && d <= end) return d
  }
  return null
}

/** Returns the most recent PAST instance of dayOfYear (≤ today). */
function mostRecentPast(dayOfYear: number, today: Date): Date {
  const base = today.getFullYear()
  for (const y of [base, base - 1]) {
    const d = new Date(y, 0); d.setDate(dayOfYear); d.setHours(0, 0, 0, 0)
    if (d <= today) return d
  }
  const d = new Date(base - 2, 0); d.setDate(dayOfYear); return d
}

function milestoneHeightPx(durationType: string, startDay: number, endDay: number): number {
  const days = endDay > startDay ? endDay - startDay + 1
    : durationType === 'quarter' ? 91
    : durationType === 'month'   ? 30
    : 1
  return Math.max(days * PX_PER_DAY, 44)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function monthLabel(date: Date, currentYear: number): string {
  const opts: Intl.DateTimeFormatOptions = date.getFullYear() !== currentYear
    ? { month: 'short', year: 'numeric' }
    : { month: 'short' }
  return date.toLocaleDateString('en-US', opts)
}

// ── Types ─────────────────────────────────────────────────────────
interface Milestone {
  id: string; title: string; description?: string
  dayOfYear: number; endDayOfYear: number; durationType: string; color: string
}
interface Client {
  id: string; name: string
  currentMilestoneId: string | null
  cycleYear: number
  clientTasks: { id: string; status: string; task: { id: string; title: string; checkIn: { milestone: { id: string } } } }[]
}

// ── Component ─────────────────────────────────────────────────────
export default function Timeline({ refreshKey }: { refreshKey: number }) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [clients, setClients]       = useState<Client[]>([])
  const [loading, setLoading]       = useState(true)

  // Tag click → household info panel
  const [infoClientId, setInfoClientId] = useState<string | null>(null)

  // Arrow click → task panel for current milestone
  const [taskPanelClient, setTaskPanelClient] = useState<{ id: string; name: string; milestoneId: string; cycleYear: number } | null>(null)

  // Bulk action modal
  const [multiOpen, setMultiOpen] = useState(false)

  // Year badge dropdown
  const [yearDropdownOpen, setYearDropdownOpen] = useState<string | null>(null)
  const [updatingYear, setUpdatingYear] = useState<string | null>(null)

  useEffect(() => { load() }, [refreshKey])

  useEffect(() => {
    if (!yearDropdownOpen) return
    const close = () => setYearDropdownOpen(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [yearDropdownOpen])

  const handleUpdateYear = async (clientId: string, year: number) => {
    if (updatingYear) return
    setUpdatingYear(clientId)
    setYearDropdownOpen(null)
    try {
      await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleYear: year }),
      })
      await load()
    } finally {
      setUpdatingYear(null)
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const [mr, cr] = await Promise.all([fetch('/api/milestones'), fetch('/api/clients')])
      if (mr.ok) setMilestones(await mr.json())
      if (cr.ok) setClients(await cr.json())
    } finally { setLoading(false) }
  }

  const { today, start: windowStart, end: windowEnd } = getWindow()
  const currentYear = today.getFullYear()
  const todayTop = dateToTop(today, windowStart)

  // Build milestone map
  const milestoneMap = useMemo(() => new Map(milestones.map(m => [m.id, m])), [milestones])

  // Separate clients into: gutter (>6 months stale) vs timeline.
  //
  // A client belongs on the timeline whenever their milestone has ANY
  // occurrence within the rolling window — including future occurrences.
  // Using mostRecentPast alone was wrong: if the next milestone falls in
  // the future (e.g. July after advancing in April), mostRecentPast returns
  // last July (~270 days ago) and incorrectly sends the client to the gutter.
  // Only fall back to the staleness check when dayInWindow finds nothing.
  const { gutterClients, timelineClients } = useMemo(() => {
    const gutter: Client[] = []
    const timeline: Client[] = []
    for (const c of clients) {
      if (!c.currentMilestoneId) { timeline.push(c); continue }
      const m = milestoneMap.get(c.currentMilestoneId)
      if (!m) { timeline.push(c); continue }
      if (dayInWindow(m.dayOfYear, windowStart, windowEnd)) {
        // Milestone is visible in the rolling window — always show on timeline
        timeline.push(c)
      } else {
        // Milestone has no occurrence in the window; use staleness fallback
        const past = mostRecentPast(m.dayOfYear, today)
        const daysBehind = (today.getTime() - past.getTime()) / MS_PER_DAY
        if (daysBehind > GUTTER_THRESHOLD_DAYS) gutter.push(c)
        else timeline.push(c)
      }
    }
    return { gutterClients: gutter, timelineClients: timeline }
  }, [clients, milestoneMap, today, windowStart, windowEnd])

  // Group timeline clients by milestone
  const clientsByMilestone = useMemo(() => {
    const map: Record<string, Client[]> = {}
    for (const c of timelineClients) {
      if (!c.currentMilestoneId) continue
      if (!map[c.currentMilestoneId]) map[c.currentMilestoneId] = []
      map[c.currentMilestoneId].push(c)
    }
    return map
  }, [timelineClients])

  // Generate month divider lines for the rolling window
  const rollingMonths = useMemo(() => {
    const months: { label: string; top: number }[] = []
    const cur = new Date(windowStart); cur.setDate(1); cur.setMonth(cur.getMonth() + 1)
    while (cur <= windowEnd) {
      months.push({ label: monthLabel(new Date(cur), currentYear), top: dateToTop(new Date(cur), windowStart) })
      cur.setMonth(cur.getMonth() + 1)
    }
    return months
  }, [windowStart, windowEnd, currentYear])

  // Unassigned clients (no milestone)
  const unassigned = useMemo(() => clients.filter(c => !c.currentMilestoneId), [clients])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <>
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-bold text-gray-900">Annua — Rolling 12-Month Timeline</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          {/* Feature 3: Multi-Client Action button */}
          <button onClick={() => setMultiOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Bulk Action
          </button>
        </div>
      </div>

      {/* ── Gutter (stale clients >6 months) ── */}
      {gutterClients.length > 0 && (
        <div className="flex-shrink-0 mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-bold text-red-700">Needs Attention — No progress in over 6 months</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {gutterClients.map(c => {
              const m = c.currentMilestoneId ? milestoneMap.get(c.currentMilestoneId) : null
              return (
                <button key={c.id}
                  onClick={() => setInfoClientId(c.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 rounded-full text-xs font-semibold text-red-800 hover:bg-red-50 hover:border-red-500 transition shadow-sm">
                  {c.name}
                  {m && <span className="text-red-400">· {m.title}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Scrollable timeline ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative mx-6 my-4" style={{ height: YEAR_HEIGHT + 60 }}>

          {/* Vertical center line */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-300" style={{ left: 200 }} />

          {/* Month bands + labels */}
          {rollingMonths.map((mo, i) => {
            const nextTop = rollingMonths[i + 1]?.top ?? YEAR_HEIGHT
            const height = nextTop - mo.top
            return (
              <div key={`${mo.label}-${i}`}>
                <div className={`absolute left-0 right-0 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`} style={{ top: mo.top, height }} />
                <div className="absolute border-t border-gray-200 left-0 right-0" style={{ top: mo.top }} />
                <div className="absolute flex items-start select-none" style={{ top: mo.top + 8, left: 0, width: 60 }}>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-tight text-center w-full">{mo.label}</span>
                </div>
              </div>
            )
          })}

          {/* Today line */}
          <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center" style={{ top: todayTop }}>
            <div className="absolute left-0 right-0 border-t-2 border-blue-400 border-dashed" />
            <div className="absolute w-3 h-3 rounded-full bg-blue-500 shadow" style={{ left: 196 }} />
            <span className="absolute text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full" style={{ left: 214 }}>Today</span>
          </div>

          {/* Milestones + client tags */}
          {milestones.map(m => {
            const mDate = dayInWindow(m.dayOfYear, windowStart, windowEnd)
            if (!mDate) return null
            const top = dateToTop(mDate, windowStart)
            const height = milestoneHeightPx(m.durationType, m.dayOfYear, m.endDayOfYear)

            const endDay = m.endDayOfYear > m.dayOfYear ? m.endDayOfYear : m.dayOfYear
            const endDate = new Date(mDate); endDate.setDate(endDate.getDate() + (endDay - m.dayOfYear))
            const dateLabel = m.durationType === 'specific_date'
              ? formatDate(mDate)
              : `${formatDate(mDate)} – ${formatDate(endDate)}`

            const tags = clientsByMilestone[m.id] ?? []

            return (
              <div key={m.id}>
                {/* Milestone block (LEFT of line) */}
                <div className="absolute z-10 rounded-lg shadow-sm border border-gray-200 bg-white overflow-hidden flex flex-col"
                  style={{ top: top + 2, left: 68, width: 126, minHeight: height, borderLeft: `4px solid ${m.color}` }}>
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-bold text-gray-800 leading-tight">{m.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{dateLabel}</p>
                    {m.description && (
                      <p className="text-xs text-gray-500 mt-1 leading-tight line-clamp-4">{m.description}</p>
                    )}
                  </div>
                </div>

                {/* Client tags (RIGHT of line) */}
                {tags.length > 0 && (
                  <div className="absolute z-10 flex flex-wrap gap-1.5 items-start" style={{ top: top + 6, left: 212, right: 8 }}>
                    {tags.map(c => {
                      const total = c.clientTasks.filter(ct => ct.task.checkIn.milestone.id === m.id).length
                      const done  = c.clientTasks.filter(ct => ct.task.checkIn.milestone.id === m.id && ct.status === 'completed').length
                      return (
                        <div key={c.id} className="flex items-center gap-0.5">
                          {/* Tag → opens household info panel */}
                          <button
                            onClick={() => setInfoClientId(c.id)}
                            className="flex items-center gap-1.5 pl-3 pr-2 py-1 bg-white border border-gray-300 rounded-l-full text-xs font-medium text-gray-700 shadow-sm hover:border-blue-400 hover:shadow-md transition-all"
                            title="View household details">
                            {c.name}
                            {total > 0 && (
                              <span className={`font-semibold ${done === total ? 'text-green-600' : 'text-amber-600'}`}>{done}/{total}</span>
                            )}
                          </button>
                          {/* Year badge → opens dropdown to pick current or next year */}
                          <div className="relative">
                            <button
                              onClick={() => setYearDropdownOpen(yearDropdownOpen === c.id ? null : c.id)}
                              disabled={!!updatingYear}
                              title={c.cycleYear > 0 && c.cycleYear < currentYear ? `Cycle year ${c.cycleYear} — click to update` : `Cycle year: ${c.cycleYear || '—'}`}
                              className={`flex items-center justify-center px-1.5 py-1 h-7 border border-l-0 text-[10px] font-bold transition-all disabled:opacity-50 ${
                                c.cycleYear > 0 && c.cycleYear < currentYear
                                  ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-500'
                                  : 'bg-white border-gray-300 text-gray-400 hover:bg-gray-50 hover:border-gray-400'
                              }`}>
                              {updatingYear === c.id
                                ? <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                                : (c.cycleYear > 0 ? c.cycleYear : '—')}
                            </button>
                            {yearDropdownOpen === c.id && (
                              <div
                                className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[68px]"
                                onClick={e => e.stopPropagation()}>
                                {[currentYear, currentYear + 1].map(y => (
                                  <button
                                    key={y}
                                    onClick={() => handleUpdateYear(c.id, y)}
                                    className={`w-full px-3 py-1.5 text-xs text-left transition-colors hover:bg-blue-50 ${
                                      c.cycleYear === y ? 'font-bold text-blue-600' : 'text-gray-700'
                                    }`}>
                                    {y}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Arrow → opens task panel */}
                          <button
                            onClick={() => setTaskPanelClient({ id: c.id, name: c.name, milestoneId: m.id, cycleYear: c.cycleYear })}
                            title="View tasks & advance"
                            className="flex items-center justify-center w-7 h-7 bg-white border border-l-0 border-gray-300 rounded-r-full text-gray-400 shadow-sm hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Unassigned tag row */}
          {unassigned.length > 0 && (
            <div className="absolute left-0 right-0 z-10 flex flex-wrap gap-2 items-center px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg" style={{ top: YEAR_HEIGHT + 10 }}>
              <span className="text-xs font-semibold text-amber-700">No milestone assigned:</span>
              {unassigned.map(c => (
                <button key={c.id} onClick={() => setInfoClientId(c.id)}
                  className="px-3 py-1 bg-white border border-amber-300 rounded-full text-xs font-medium text-amber-800 hover:border-amber-500 transition">
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Household info panel (tag click) */}
      <ClientDetailModal
        clientId={infoClientId}
        onClose={() => setInfoClientId(null)}
        onUpdate={load}
      />

      {/* Task panel (arrow click) */}
      <ChecklistModal
        clientId={taskPanelClient?.id ?? null}
        clientName={taskPanelClient?.name ?? ''}
        milestoneId={taskPanelClient?.milestoneId ?? null}
        cycleYear={taskPanelClient?.cycleYear ?? 0}
        onClose={() => setTaskPanelClient(null)}
        onAdvanced={load}
      />

      {/* Bulk action modal */}
      <MultiClientAction
        open={multiOpen}
        onClose={() => setMultiOpen(false)}
        onDone={load}
      />
    </>
  )
}
