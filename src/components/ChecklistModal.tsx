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

  // Confirmation dialog — tracks which action triggered it
  const [confirm, setConfirm] = useState<'individual' | 'finishAll' | null>(null)
  const [advancing, setAdvancing] = useState(false)

  // Success state shown briefly after advancing
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
      setConfirm(null)
      setAdvancedTo(null)
      load()
    }
  }, [clientId, milestoneId, load])

  const allTasks = milestone?.checkIns.flatMap(ci => ci.tasks) ?? []
  const completedCount = allTasks.filter(t => taskStatuses[t.id] === 'completed').length
  const allComplete = allTasks.length > 0 && completedCount === allTasks.length

  // Toggle a single task. If it's the last one to be checked, prompt confirmation.
  const toggleTask = async (taskId: string) => {
    if (!clientId || saving || advancing) return
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
        if (data.allComplete) {
          setConfirm('individual')
        }
      }
    } finally {
      setSaving(null)
    }
  }

  // Call the advance API, then show success and close.
  const doAdvance = async () => {
    if (!clientId || advancing) return
    setAdvancing(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/complete-milestone`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setConfirm(null)
        setAdvancedTo(data.nextMilestone?.title ?? 'next milestone')
        setTimeout(() => {
          onAdvanced()
          onClose()
        }, 1600)
      }
    } finally {
      setAdvancing(false)
    }
  }

  if (!clientId || !milestoneId) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">{clientName}</h2>
            {milestone && <p className="text-sm text-gray-500 mt-0.5">{milestone.title}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : advancedTo ? (
            /* Success state */
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900">Advanced!</p>
              <p className="text-sm text-gray-500">
                Moved to <span className="font-medium text-blue-600">{advancedTo}</span>
              </p>
            </div>
          ) : allTasks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No tasks in this milestone.</p>
          ) : (
            <>
              {/* Finish All & Advance button */}
              <button
                onClick={() => setConfirm('finishAll')}
                disabled={advancing}
                className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Finish All &amp; Advance
              </button>

              {/* Task list */}
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
                        <button
                          key={task.id}
                          onClick={() => toggleTask(task.id)}
                          disabled={!!saving || advancing}
                          className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                            done ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                          } ${(saving && !isSaving) || advancing ? 'opacity-50' : ''}`}
                        >
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
                            <p className={`text-sm font-medium ${done ? 'text-green-700 line-through' : 'text-gray-800'}`}>
                              {task.title}
                            </p>
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
            </>
          )}
        </div>

        {/* ── Footer progress bar ── */}
        {!loading && !advancedTo && allTasks.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">{completedCount} of {allTasks.length} complete</span>
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: allTasks.length ? `${(completedCount / allTasks.length) * 100}%` : '0%' }}
              />
            </div>
          </div>
        )}

        {/* ── Confirmation dialog (rendered over the modal) ── */}
        {confirm && (
          <div className="absolute inset-0 rounded-2xl bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base mb-1">Ready to advance?</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                All tasks are marked complete.{' '}
                <span className="font-medium text-gray-800">{clientName}</span> will move to the next milestone.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setConfirm(null)}
                disabled={advancing}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={doAdvance}
                disabled={advancing}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {advancing && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Continue &amp; Advance
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
