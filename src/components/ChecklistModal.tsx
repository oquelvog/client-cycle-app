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
  cycleYear: number
  onClose: () => void
  onAdvanced: () => void
}

export default function ChecklistModal({ clientId, clientName, milestoneId, cycleYear, onClose, onAdvanced }: Props) {
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  // Confirmation dialog — tracks which action triggered it
  const [confirm, setConfirm] = useState<'individual' | 'finishAll' | null>(null)
  const [advancing, setAdvancing] = useState(false)

  // Success state shown briefly after advancing
  const [advancedTo, setAdvancedTo] = useState<string | null>(null)

  // Passive year prompt
  const [showYearPrompt, setShowYearPrompt] = useState(false)
  const [yearPromptDismissed, setYearPromptDismissed] = useState(false)
  const [updatingYear, setUpdatingYear] = useState(false)
  const currentYear = new Date().getFullYear()

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
      setShowYearPrompt(false)
      setYearPromptDismissed(false)
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
        } else if (next === 'completed' && cycleYear > 0 && cycleYear < currentYear && !yearPromptDismissed) {
          setShowYearPrompt(true)
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

  const doYearUpdate = async () => {
    if (!clientId || updatingYear) return
    setUpdatingYear(true)
    try {
      await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleYear: currentYear }),
      })
      setShowYearPrompt(false)
      setYearPromptDismissed(true)
      onAdvanced()
    } finally {
      setUpdatingYear(false)
    }
  }

  if (!clientId || !milestoneId) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
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

        {/* ── Passive year prompt ── */}
        {showYearPrompt && !advancedTo && (
          <div className="mx-4 mb-2 flex items-start gap-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-amber-800 leading-snug">
                This household is still assigned to <span className="font-semibold">{cycleYear}</span>. Update to <span className="font-semibold">{currentYear}</span>?
              </p>
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={doYearUpdate}
                  disabled={updatingYear}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md transition disabled:opacity-50 flex items-center gap-1">
                  {updatingYear && <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />}
                  Update to {currentYear}
                </button>
                <button
                  onClick={() => { setShowYearPrompt(false); setYearPromptDismissed(true) }}
                  className="px-2.5 py-1 text-amber-700 hover:text-amber-900 font-medium rounded-md transition">
                  Not now
                </button>
              </div>
            </div>
          </div>
        )}

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
          <div className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-5 flex flex-col gap-4">
              <div>
                <p className="font-bold text-gray-900 text-sm mb-1">Advance this household?</p>
                <p className="text-sm text-gray-600 leading-snug">
                  All tasks are marked complete.{' '}
                  <span className="font-medium text-gray-800">{clientName}</span> will move to the next milestone.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirm(null)}
                  disabled={advancing}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={doAdvance}
                  disabled={advancing}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {advancing && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
