'use client'

import { useState, useEffect, useMemo } from 'react'
import ClientDetailModal from './ClientDetailModal'

const YEAR_HEIGHT = 2400
const PX_PER_DAY = YEAR_HEIGHT / 365

const MONTHS = [
  { name: 'January',   short: 'Jan', startDay: 1   },
  { name: 'February',  short: 'Feb', startDay: 32  },
  { name: 'March',     short: 'Mar', startDay: 60  },
  { name: 'April',     short: 'Apr', startDay: 91  },
  { name: 'May',       short: 'May', startDay: 121 },
  { name: 'June',      short: 'Jun', startDay: 152 },
  { name: 'July',      short: 'Jul', startDay: 182 },
  { name: 'August',    short: 'Aug', startDay: 213 },
  { name: 'September', short: 'Sep', startDay: 244 },
  { name: 'October',   short: 'Oct', startDay: 274 },
  { name: 'November',  short: 'Nov', startDay: 305 },
  { name: 'December',  short: 'Dec', startDay: 335 },
]

function dayToTop(day: number) {
  return (day - 1) * PX_PER_DAY
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60000
  return Math.floor(diff / 86400000)
}

function formatDay(dayOfYear: number): string {
  const date = new Date(new Date().getFullYear(), 0)
  date.setDate(dayOfYear)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function milestoneHeight(durationType: string, startDay: number, endDay: number): number {
  const effective = endDay > startDay ? endDay - startDay + 1 : 1
  const px = effective * PX_PER_DAY
  if (durationType === 'specific_date') return 44
  return Math.max(px, 44)
}

interface Milestone {
  id: string
  title: string
  description?: string
  dayOfYear: number
  endDayOfYear: number
  durationType: string
  color: string
}

interface Client {
  id: string
  name: string
  currentMilestoneId: string | null
  clientTasks: {
    id: string
    status: string
    task: {
      id: string
      title: string
      checkIn: { milestone: { id: string; title: string } }
    }
  }[]
}

export default function Timeline({ refreshKey }: { refreshKey: number }) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const today = getDayOfYear(new Date())

  useEffect(() => {
    fetchData()
  }, [refreshKey])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [mRes, cRes] = await Promise.all([
        fetch('/api/milestones'),
        fetch('/api/clients'),
      ])
      setMilestones(await mRes.json())
      setClients(await cRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Group clients by their current milestone
  const clientsByMilestone = useMemo(() => {
    const map: Record<string, Client[]> = {}
    clients.forEach((c) => {
      if (c.currentMilestoneId) {
        if (!map[c.currentMilestoneId]) map[c.currentMilestoneId] = []
        map[c.currentMilestoneId].push(c)
      }
    })
    return map
  }, [clients])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const todayTop = dayToTop(today)

  return (
    <>
      {/* Sticky header bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Annual Engagement Timeline</h1>
        <span className="text-sm text-gray-500">
          Today — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Scrollable timeline */}
      <div className="overflow-y-auto flex-1">
        <div
          className="relative mx-6 my-4"
          style={{ height: YEAR_HEIGHT + 80 }}
        >
          {/* ── Vertical center line ─────────────────────────────── */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gray-300"
            style={{ left: 200 }}
          />

          {/* ── Month dividers & labels ───────────────────────────── */}
          {MONTHS.map((month, i) => {
            const top = dayToTop(month.startDay)
            const nextStart = MONTHS[i + 1]?.startDay ?? 366
            const height = (nextStart - month.startDay) * PX_PER_DAY
            return (
              <div key={month.short}>
                {/* Month band background */}
                <div
                  className={`absolute left-0 right-0 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                  style={{ top, height }}
                />
                {/* Month label */}
                <div
                  className="absolute flex flex-col items-center select-none"
                  style={{ top: top + 8, left: 0, width: 60 }}
                >
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {month.short}
                  </span>
                </div>
                {/* Horizontal month divider */}
                <div
                  className="absolute left-0 right-0 border-t border-gray-200"
                  style={{ top }}
                />
              </div>
            )
          })}

          {/* ── Today line ────────────────────────────────────────── */}
          <div
            className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
            style={{ top: todayTop }}
          >
            <div className="absolute left-0 right-0 border-t-2 border-blue-400 border-dashed" />
            <div
              className="absolute w-3 h-3 rounded-full bg-blue-500 shadow"
              style={{ left: 196 }}
            />
            <span
              className="absolute text-xs font-semibold text-blue-600 bg-white px-1 rounded"
              style={{ left: 215 }}
            >
              Today
            </span>
          </div>

          {/* ── Milestones (left of line) ─────────────────────────── */}
          {milestones.map((m) => {
            const top = dayToTop(m.dayOfYear)
            const height = milestoneHeight(m.durationType, m.dayOfYear, m.endDayOfYear)
            const endDay = m.endDayOfYear > m.dayOfYear ? m.endDayOfYear : m.dayOfYear
            const dateRange = m.durationType === 'specific_date'
              ? formatDay(m.dayOfYear)
              : `${formatDay(m.dayOfYear)} – ${formatDay(endDay)}`

            return (
              <div
                key={m.id}
                className="absolute z-10 flex flex-col justify-start overflow-hidden rounded-lg shadow-sm border border-gray-200 bg-white"
                style={{
                  top: top + 2,
                  left: 68,
                  width: 126,
                  minHeight: height,
                  borderLeft: `4px solid ${m.color}`,
                }}
              >
                <div className="px-2 py-1.5">
                  <p className="text-xs font-bold text-gray-800 leading-tight">{m.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{dateRange}</p>
                  {m.description && (
                    <p className="text-xs text-gray-500 mt-1 leading-tight line-clamp-3">
                      {m.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}

          {/* ── Client tags (right of line) ───────────────────────── */}
          {milestones.map((m) => {
            const tags = clientsByMilestone[m.id] ?? []
            if (tags.length === 0) return null
            const top = dayToTop(m.dayOfYear)

            return (
              <div
                key={`tags-${m.id}`}
                className="absolute z-10 flex flex-wrap gap-2 items-start"
                style={{ top: top + 6, left: 212, right: 8 }}
              >
                {tags.map((client) => {
                  const total = client.clientTasks.filter(
                    (ct) => ct.task.checkIn.milestone.id === m.id
                  ).length
                  const done = client.clientTasks.filter(
                    (ct) => ct.task.checkIn.milestone.id === m.id && ct.status === 'completed'
                  ).length
                  return (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-300 rounded-full text-xs font-medium text-gray-700 shadow-sm hover:border-blue-400 hover:shadow-md transition-all"
                    >
                      <span>{client.name}</span>
                      {total > 0 && (
                        <span className={`text-xs font-semibold ${done === total ? 'text-green-600' : 'text-amber-600'}`}>
                          {done}/{total}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}

          {/* Unassigned clients note at bottom */}
          {clients.filter((c) => !c.currentMilestoneId).length > 0 && (
            <div
              className="absolute left-0 right-0 z-10 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-wrap gap-2 items-center"
              style={{ top: YEAR_HEIGHT + 20 }}
            >
              <span className="text-xs font-semibold text-amber-700 mr-2">No milestone assigned:</span>
              {clients
                .filter((c) => !c.currentMilestoneId)
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClientId(c.id)}
                    className="px-3 py-1 bg-white border border-amber-300 rounded-full text-xs font-medium text-amber-800 hover:border-amber-500 transition"
                  >
                    {c.name}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <ClientDetailModal
        clientId={selectedClientId}
        onClose={() => setSelectedClientId(null)}
        onUpdate={fetchData}
      />
    </>
  )
}
