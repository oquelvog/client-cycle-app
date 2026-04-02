'use client'

import { useState, useEffect } from 'react'
import { getDayOfYear, formatDayOfYear, getClientStatus } from '@/lib/utils'
import ClientDetailModal from './ClientDetailModal'

interface Task {
  id: string
  title: string
}

interface CheckIn {
  id: string
  title: string
  description?: string
  dayOfYear: number
  milestoneId: string
  tasks: Task[]
}

interface Milestone {
  id: string
  title: string
  description?: string
  dayOfYear: number
  color: string
  checkIns: CheckIn[]
}

interface ClientCheckIn {
  checkInId: string
  status: string
  checkIn: { dayOfYear: number }
}

interface Client {
  id: string
  name: string
  color: string
  clientCheckIns: ClientCheckIn[]
}

interface TimelineEntry {
  type: 'milestone' | 'checkin'
  dayOfYear: number
  data: Milestone | (CheckIn & { milestoneColor: string; milestoneTitle: string })
  milestoneId?: string
}

const MONTHS = [
  { name: 'Jan', day: 1 },
  { name: 'Feb', day: 32 },
  { name: 'Mar', day: 60 },
  { name: 'Apr', day: 91 },
  { name: 'May', day: 121 },
  { name: 'Jun', day: 152 },
  { name: 'Jul', day: 182 },
  { name: 'Aug', day: 213 },
  { name: 'Sep', day: 244 },
  { name: 'Oct', day: 274 },
  { name: 'Nov', day: 305 },
  { name: 'Dec', day: 335 },
]

function getClientStatusForTimeline(client: Client, today: number) {
  const completedDays = client.clientCheckIns
    .filter((ci) => ci.status === 'completed')
    .map((ci) => ci.checkIn.dayOfYear)

  const lastCompleted = completedDays.length > 0 ? Math.max(...completedDays) : null
  return getClientStatus(lastCompleted, today)
}

function getClientPosition(client: Client): number | null {
  const completedDays = client.clientCheckIns
    .filter((ci) => ci.status === 'completed')
    .map((ci) => ci.checkIn.dayOfYear)
  if (completedDays.length === 0) return null
  return Math.max(...completedDays)
}

const statusBorder = {
  on_track: 'border-green-400',
  behind: 'border-red-400',
  ahead: 'border-blue-400',
  not_started: 'border-gray-300',
}

const statusBg = {
  on_track: '',
  behind: 'bg-red-50',
  ahead: 'bg-blue-50',
  not_started: 'bg-gray-50',
}

export default function Timeline() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const today = getDayOfYear(new Date())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [milestonesRes, clientsRes] = await Promise.all([
        fetch('/api/milestones'),
        fetch('/api/clients'),
      ])
      const milestonesData = await milestonesRes.json()
      const clientsData = await clientsRes.json()
      setMilestones(milestonesData)
      setClients(clientsData)
      // Auto-expand all milestones
      setExpandedMilestones(new Set(milestonesData.map((m: Milestone) => m.id)))
    } catch (err) {
      console.error('Error fetching timeline data:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleMilestone = (id: string) => {
    const newSet = new Set(expandedMilestones)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setExpandedMilestones(newSet)
  }

  // Build timeline entries sorted by dayOfYear
  const timelineEntries: TimelineEntry[] = []
  milestones.forEach((m) => {
    timelineEntries.push({ type: 'milestone', dayOfYear: m.dayOfYear, data: m })
    if (expandedMilestones.has(m.id)) {
      m.checkIns.forEach((ci) => {
        timelineEntries.push({
          type: 'checkin',
          dayOfYear: ci.dayOfYear,
          milestoneId: m.id,
          data: { ...ci, milestoneColor: m.color, milestoneTitle: m.title },
        })
      })
    }
  })
  timelineEntries.sort((a, b) => a.dayOfYear - b.dayOfYear)

  // Get clients at each check-in
  const getClientsAtCheckIn = (checkInId: string) => {
    return clients.filter((c) => {
      const position = getClientPosition(c)
      const checkInForClient = c.clientCheckIns.find((ci) => ci.checkInId === checkInId)
      return position !== null && checkInForClient?.status === 'completed'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading timeline...</p>
        </div>
      </div>
    )
  }

  if (milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-800">No milestones yet</h3>
        <p className="text-gray-500 mt-1">Go to Milestones to create your engagement timeline.</p>
      </div>
    )
  }

  // Find which month sections to show (months that have entries)
  const getMonthForDay = (day: number) => MONTHS.findIndex((m, i) => {
    const next = MONTHS[i + 1]
    return day >= m.day && (!next || day < next.day)
  })

  // Today marker position
  const todayMonthIdx = getMonthForDay(today)

  return (
    <>
      <div className="flex gap-6 h-full">
        {/* Main timeline */}
        <div className="flex-1 overflow-y-auto">
          <div className="relative">
            {/* Month headers row */}
            <div className="grid grid-cols-12 mb-2">
              {MONTHS.map((m) => (
                <div key={m.name} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider py-1 border-b border-gray-200">
                  {m.name}
                </div>
              ))}
            </div>

            {/* Vertical timeline layout */}
            <div className="relative">
              {timelineEntries.map((entry, idx) => {
                const monthIdx = getMonthForDay(entry.dayOfYear)
                const isCurrentMonth = monthIdx === todayMonthIdx
                const isPast = entry.dayOfYear < today
                const isToday = Math.abs(entry.dayOfYear - today) <= 3

                if (entry.type === 'milestone') {
                  const milestone = entry.data as Milestone
                  const isExpanded = expandedMilestones.has(milestone.id)
                  return (
                    <div key={milestone.id} className="relative mb-1">
                      {/* Month label if first entry in month */}
                      {(idx === 0 || getMonthForDay(timelineEntries[idx - 1].dayOfYear) !== monthIdx) && (
                        <div className="flex items-center gap-2 py-3 mt-2">
                          <div className="w-20 text-right">
                            <span className="text-xs font-bold text-gray-400 uppercase">
                              {MONTHS[monthIdx]?.name}
                            </span>
                          </div>
                          <div className="flex-1 border-t border-dashed border-gray-200" />
                        </div>
                      )}
                      <button
                        onClick={() => toggleMilestone(milestone.id)}
                        className="w-full flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-gray-50 transition group"
                      >
                        <div className="w-20 text-right flex-shrink-0">
                          <span className="text-xs text-gray-400">{formatDayOfYear(milestone.dayOfYear)}</span>
                        </div>
                        <div className="relative flex items-center gap-3 flex-1">
                          {/* Timeline line */}
                          <div className="relative z-10">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center shadow-md"
                              style={{ backgroundColor: milestone.color }}
                            >
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-bold text-gray-900 text-base">{milestone.title}</p>
                            {milestone.description && (
                              <p className="text-xs text-gray-500">{milestone.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{milestone.checkIns.length} check-ins</span>
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    </div>
                  )
                } else {
                  // Check-in entry
                  const checkIn = entry.data as CheckIn & { milestoneColor: string; milestoneTitle: string }
                  const clientsHere = getClientsAtCheckIn(checkIn.id)
                  const isOverdue = today > checkIn.dayOfYear + 30

                  return (
                    <div key={checkIn.id} className={`flex items-start gap-3 py-2.5 px-4 rounded-lg mb-1 ${isOverdue ? 'bg-red-50' : 'bg-gray-50/50'}`}>
                      <div className="w-20 text-right flex-shrink-0 pt-0.5">
                        <span className="text-xs text-gray-400">{formatDayOfYear(checkIn.dayOfYear)}</span>
                      </div>
                      <div className="flex items-start gap-3 flex-1">
                        {/* Connector and marker */}
                        <div className="flex flex-col items-center mt-1">
                          <div
                            className="w-3 h-3 rounded-full border-2 bg-white flex-shrink-0"
                            style={{ borderColor: checkIn.milestoneColor }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-medium ${isOverdue ? 'text-red-700' : 'text-gray-700'}`}>
                              {checkIn.title}
                            </p>
                            {isOverdue && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded font-medium">Overdue</span>
                            )}
                            <span className="text-xs text-gray-400">{checkIn.tasks.length} tasks</span>
                          </div>
                          {/* Client tags */}
                          {clientsHere.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {clientsHere.map((client) => {
                                const status = getClientStatusForTimeline(client, today)
                                const clientsAtThisCheckIn = client.clientCheckIns.find((ci) => ci.checkInId === checkIn.id)
                                // Only show if this is their most recently completed check-in
                                const lastDay = getClientPosition(client)
                                if (lastDay !== checkIn.dayOfYear) return null

                                return (
                                  <button
                                    key={client.id}
                                    onClick={() => setSelectedClientId(client.id)}
                                    className={`client-tag flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border-2 bg-white shadow-sm ${statusBorder[status as keyof typeof statusBorder]}`}
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: client.color }}
                                    />
                                    {client.name}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }
              })}

              {/* Today marker */}
              <div className="flex items-center gap-3 py-2 px-4 my-2">
                <div className="w-20 text-right flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">Today</span>
                </div>
                <div className="flex-1 border-t-2 border-blue-400 border-dashed relative">
                  <div className="absolute -top-2 left-0 w-4 h-4 bg-blue-500 rounded-full shadow-md" />
                  <span className="absolute -top-3.5 left-6 text-xs text-blue-500 font-medium whitespace-nowrap">
                    {formatDayOfYear(today)} — Day {today}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend sidebar */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-0">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Legend</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-400" />
                <span className="text-xs text-gray-600">On Track</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-400" />
                <span className="text-xs text-gray-600">Behind (&gt;30 days)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-400" />
                <span className="text-xs text-gray-600">Ahead</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-300" />
                <span className="text-xs text-gray-600">Not Started</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Clients</h3>
              <div className="space-y-2">
                {clients.map((c) => {
                  const status = getClientStatusForTimeline(c, today)
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClientId(c.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition text-left ${statusBg[status as keyof typeof statusBg]}`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-xs text-gray-700 truncate">{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
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
