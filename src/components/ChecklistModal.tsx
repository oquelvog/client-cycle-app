'use client'

import { useState, useEffect, useCallback } from 'react'

interface Task {
  id: string
  title: string
  description?: string
}

interface CheckIn {
  id: string
  title: string
  tasks: Task[]
}

interface Milestone {
  id: string
  title: string
  checkIns: CheckIn[]
}

interface ClientTaskStatus {
  taskId: string
  status: string
}

interface Props {
  clientId: string | null
  clientName: string
  milestoneId: string | null
  onClose: () => void
  onAdvanced: () => void
}

export default function ChecklistModal({ clientId, clientName, milestoneId, onClose, onAdvanced }: Props) {
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [advanced, setAdvanced] = useState(false)
  const [advancedTo, setAdvancedTo] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!clientId || !milestoneId) return
    setLoading(true)
    try {
      const [mRes, tRes] = await Promise.all([
        fetch(`/api/milestones/${milestoneId}`),
        fetch(`/api/clients/${clientId}/tasks`),
      ])
      if (mRes.ok) setMilestone(await mRes.json())
      if (tRes.ok) {
        const tasks: ClientTaskStatus[] = await tRes.json()
        const map: Record<string, string> = {}
        for (const t of tasks) map[t.taskId] = t.status
        setTaskStatuses(map)
      }
    } finally {
      setLoading(false)
    }
  }, [clientId, milestoneId])

  useEffect(() => {
    if (clientId && milestoneId) {
      setAdvanced(false)
      setAdvancedTo(null)
      load()
    }
  }, [clientId, milestoneId, load])

  const toggleTask = async (taskId: string) => {
    if (!clientId || saving) return
    const current = taskStatuses[taskId] ?? 'pending'
    const next = current === 'completed' ? 'pending' : 'completed'
    setSaving(taskId)
    try {
      const res = await fetch(`/api/clients/${clientId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: next }),
      })
      if (res.ok) {
        const data = await res.json()
        setTaskStatuses(prev => ({ ...prev, [taskId]: next }))
        if (data.advanced) {
          setAdvanced(true)
          setAdvancedTo(data.nextMilestone?.title ?? null)
          setTimeout(() => {
            onAdvanced()
            onClose()
          }, 1800)
        }
      }
    } finally {
      setSaving(null)
    }
  }

  if (!clientId || !milestoneId) return null

  const allTasks = milestone?.checkIns.flatMap(ci => ci.tasks) ?? []
  const completedCount = allTasks.filter(t => taskStatuses[t.id] === 'completed').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">{clientName}</h2>
            {milestone && (
              <p className="text-sm text-gray-500 mt-0.5">{milestone.title}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : advanced ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900">All tasks complete!</p>
              {advancedTo && <p className="text-sm text-gray-500">Moved to <span className="font-medium text-blue-600">{advancedTo}</span></p>}
            </div>
          ) : allTasks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No tasks in this milestone.</p>
          ) : (
            <div className="space-y-1">
              {milestone?.checkIns.map(ci => (
                <div key={ci.id} className="mb-4">
                  {milestone.checkIns.length > 1 && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{ci.title}</p>
                  )}
                  {ci.tasks.map(task => {
                    const done = taskStatuses[task.id] === 'completed'
                    const isSaving = saving === task.id
                    return (
                      <button key={task.id} onClick={() => toggleTask(task.id)}
                        disabled={!!saving}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                          done ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                        } ${saving && !isSaving ? 'opacity-50' : ''}`}>
                        <div className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                          done ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}>
                          {isSaving ? (
                            <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
                          ) : done ? (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : null}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${done ? 'text-green-700 line-through' : 'text-gray-800'}`}>{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !advanced && allTasks.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">{completedCount} of {allTasks.length} complete</span>
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: allTasks.length ? `${(completedCount / allTasks.length) * 100}%` : '0%' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
