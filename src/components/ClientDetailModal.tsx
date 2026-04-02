'use client'

import { useState, useEffect } from 'react'
import { formatDayOfYear, getDayOfYear, getClientStatus, statusLabel } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description?: string
}

interface CheckIn {
  id: string
  title: string
  description?: string
  dayOfYear: number
  milestone: { title: string; color: string }
  tasks: Task[]
}

interface ClientCheckIn {
  id: string
  checkInId: string
  status: string
  completedAt?: string
  notes?: string
  checkIn: CheckIn
}

interface ClientTask {
  id: string
  taskId: string
  status: string
  completedAt?: string
  notes?: string
  task: Task & { checkIn: { id: string; dayOfYear: number } }
}

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  color: string
  notes?: string
  startDayOfYear: number
  clientCheckIns: ClientCheckIn[]
  clientTasks: ClientTask[]
}

interface Props {
  clientId: string | null
  onClose: () => void
  onUpdate?: () => void
}

export default function ClientDetailModal({ clientId, onClose, onUpdate }: Props) {
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [updatingTask, setUpdatingTask] = useState<string | null>(null)
  const [updatingCheckIn, setUpdatingCheckIn] = useState<string | null>(null)
  const [expandedCheckIns, setExpandedCheckIns] = useState<Set<string>>(new Set())

  const today = getDayOfYear(new Date())

  useEffect(() => {
    if (!clientId) return
    fetchClient()
  }, [clientId])

  const fetchClient = async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`)
      const data = await res.json()
      setClient(data)
      setNotes(data.notes || '')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const saveNotes = async () => {
    if (!client) return
    setSavingNotes(true)
    try {
      await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      onUpdate?.()
    } finally {
      setSavingNotes(false)
    }
  }

  const toggleTask = async (taskId: string, currentStatus: string) => {
    if (!client) return
    setUpdatingTask(taskId)
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    try {
      await fetch(`/api/clients/${client.id}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus }),
      })
      await fetchClient()
      onUpdate?.()
    } finally {
      setUpdatingTask(null)
    }
  }

  const toggleCheckIn = async (checkInId: string, currentStatus: string) => {
    if (!client) return
    setUpdatingCheckIn(checkInId)
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    try {
      await fetch(`/api/clients/${client.id}/checkins`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkInId, status: newStatus }),
      })
      await fetchClient()
      onUpdate?.()
    } finally {
      setUpdatingCheckIn(null)
    }
  }

  if (!clientId) return null

  const getCompletionStats = () => {
    if (!client) return { completed: 0, total: 0, percent: 0 }
    const total = client.clientTasks.length
    const completed = client.clientTasks.filter((t) => t.status === 'completed').length
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }

  const getLastCompletedDay = () => {
    if (!client) return null
    const completedCheckIns = client.clientCheckIns
      .filter((ci) => ci.status === 'completed')
      .map((ci) => ci.checkIn.dayOfYear)
    if (completedCheckIns.length === 0) return null
    return Math.max(...completedCheckIns)
  }

  const lastDay = getLastCompletedDay()
  const status = getClientStatus(lastDay, today)
  const stats = getCompletionStats()

  // Group check-ins by milestone
  const checkInsByMilestone = client?.clientCheckIns.reduce(
    (acc, ci) => {
      const key = ci.checkIn.milestone.title
      if (!acc[key]) acc[key] = { milestone: ci.checkIn.milestone, checkIns: [] }
      acc[key].checkIns.push(ci)
      return acc
    },
    {} as Record<string, { milestone: { title: string; color: string }; checkIns: ClientCheckIn[] }>
  ) || {}

  const statusColors = {
    on_track: 'bg-green-100 text-green-700',
    behind: 'bg-red-100 text-red-700',
    ahead: 'bg-blue-100 text-blue-700',
    not_started: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end modal-overlay bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : client ? (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: client.color }}
                  >
                    {client.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{client.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {client.email && (
                        <span className="text-sm text-gray-500">{client.email}</span>
                      )}
                      {client.phone && (
                        <span className="text-sm text-gray-400">• {client.phone}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status & Progress */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${statusColors[status as keyof typeof statusColors]}`}>
                    {statusLabel(status)}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Status</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800">{stats.percent}%</p>
                  <p className="text-xs text-gray-500 mt-1">Complete</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-lg font-bold text-gray-800">
                    {lastDay ? formatDayOfYear(lastDay) : 'None'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Last Check-In</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-sm text-gray-500">{stats.completed}/{stats.total} tasks</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>
              </div>

              {/* Check-ins by milestone */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Timeline Progress
                </h3>
                <div className="space-y-4">
                  {Object.entries(checkInsByMilestone).map(([milestoneName, { milestone, checkIns }]) => (
                    <div key={milestoneName} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div
                        className="px-4 py-3 flex items-center gap-3"
                        style={{ backgroundColor: milestone.color + '15', borderLeft: `3px solid ${milestone.color}` }}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{ color: milestone.color }}>
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold text-sm text-gray-800">{milestoneName}</span>
                        <span className="ml-auto text-xs text-gray-500">
                          {checkIns.filter((ci) => ci.status === 'completed').length}/{checkIns.length} completed
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {checkIns.map((ci) => {
                          const isExpanded = expandedCheckIns.has(ci.checkInId)
                          const clientTasksForCheckIn = client.clientTasks.filter(
                            (ct) => ct.task.checkIn.id === ci.checkInId
                          )
                          const isOverdue = ci.status !== 'completed' && ci.checkIn.dayOfYear < today - 30
                          const isUpdating = updatingCheckIn === ci.checkInId

                          return (
                            <div key={ci.id} className={isOverdue ? 'bg-red-50' : ''}>
                              <div className="px-4 py-3 flex items-center gap-3">
                                <button
                                  onClick={() => toggleCheckIn(ci.checkInId, ci.status)}
                                  disabled={isUpdating}
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                                    ci.status === 'completed'
                                      ? 'bg-green-500 border-green-500'
                                      : isOverdue
                                      ? 'border-red-400 hover:border-red-500'
                                      : 'border-gray-300 hover:border-blue-400'
                                  }`}
                                >
                                  {ci.status === 'completed' && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={`text-sm font-medium ${ci.status === 'completed' ? 'line-through text-gray-400' : isOverdue ? 'text-red-700' : 'text-gray-800'}`}>
                                      {ci.checkIn.title}
                                    </p>
                                    {isOverdue && (
                                      <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded font-medium">Overdue</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400">
                                    {formatDayOfYear(ci.checkIn.dayOfYear)} • {clientTasksForCheckIn.filter((t) => t.status === 'completed').length}/{clientTasksForCheckIn.length} tasks
                                  </p>
                                </div>
                                {clientTasksForCheckIn.length > 0 && (
                                  <button
                                    onClick={() => {
                                      const newSet = new Set(expandedCheckIns)
                                      if (isExpanded) newSet.delete(ci.checkInId)
                                      else newSet.add(ci.checkInId)
                                      setExpandedCheckIns(newSet)
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded transition"
                                  >
                                    <svg
                                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              {isExpanded && (
                                <div className="px-4 pb-3 pl-12 space-y-2">
                                  {clientTasksForCheckIn.map((ct) => {
                                    const isUpdatingThisTask = updatingTask === ct.taskId
                                    return (
                                      <div key={ct.id} className="flex items-center gap-2.5">
                                        <button
                                          onClick={() => toggleTask(ct.taskId, ct.status)}
                                          disabled={isUpdatingThisTask}
                                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                                            ct.status === 'completed'
                                              ? 'bg-blue-500 border-blue-500'
                                              : 'border-gray-300 hover:border-blue-400'
                                          }`}
                                        >
                                          {ct.status === 'completed' && (
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </button>
                                        <span className={`text-sm ${ct.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                          {ct.task.title}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="Add notes about this client..."
                />
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
