'use client'

import { useState, useEffect } from 'react'

interface Task { id: string; title: string }
interface CheckIn { id: string; title: string; tasks: Task[] }
interface Milestone { id: string; title: string; color?: string; checkIns: CheckIn[] }
interface Client { id: string; name: string; currentMilestoneId: string | null }

interface Props {
  open: boolean
  onClose: () => void
  onDone: () => void
}

export default function MultiClientAction({ open, onClose, onDone }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ updated: number; advanced: string[] } | null>(null)

  useEffect(() => {
    if (!open) return
    Promise.all([fetch('/api/milestones'), fetch('/api/clients')]).then(async ([mr, cr]) => {
      if (mr.ok) setMilestones(await mr.json())
      if (cr.ok) setClients(await cr.json())
    })
  }, [open])

  useEffect(() => {
    if (!open) {
      setStep(1)
      setSelectedMilestoneId(null)
      setSelectedTaskId(null)
      setSelectedClientIds(new Set())
      setResult(null)
    }
  }, [open])

  const selectedMilestone = milestones.find(m => m.id === selectedMilestoneId) ?? null
  const allTasks = selectedMilestone?.checkIns.flatMap(ci => ci.tasks) ?? []

  // Clients currently on the selected milestone
  const eligibleClients = selectedMilestoneId
    ? clients.filter(c => c.currentMilestoneId === selectedMilestoneId)
    : []

  const handleSelectMilestone = (id: string) => {
    setSelectedMilestoneId(id)
    setSelectedTaskId(null)
    // Pre-select all eligible clients for this milestone
    const eligible = clients.filter(c => c.currentMilestoneId === id)
    setSelectedClientIds(new Set(eligible.map(c => c.id)))
    setStep(2)
  }

  const handleSelectTask = (id: string) => {
    setSelectedTaskId(id)
    setStep(3)
  }

  const toggleClient = (id: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedClientIds.size === eligibleClients.length) {
      setSelectedClientIds(new Set())
    } else {
      setSelectedClientIds(new Set(eligibleClients.map(c => c.id)))
    }
  }

  const handleSubmit = async () => {
    if (!selectedTaskId || selectedClientIds.size === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/bulk-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selectedTaskId, clientIds: Array.from(selectedClientIds) }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        setTimeout(() => { onDone(); onClose() }, 2000)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Bulk Task Update</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 1 ? 'Select a milestone' : step === 2 ? 'Select a task' : 'Select households'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                step > s ? 'bg-green-500 text-white' : step === s ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>{step > s ? '✓' : s}</div>
              {s < 3 && <div className={`flex-1 h-px w-8 ${step > s ? 'bg-green-300' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <span className="ml-2 text-xs text-gray-400">
            {step === 1 ? 'Milestone' : step === 2 ? 'Task' : 'Households'}
          </span>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
          {result ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900">Task marked complete for {result.updated} household{result.updated !== 1 ? 's' : ''}</p>
              {result.advanced.length > 0 && (
                <p className="text-sm text-gray-500">{result.advanced.length} household{result.advanced.length !== 1 ? 's' : ''} advanced to next milestone</p>
              )}
            </div>
          ) : step === 1 ? (
            <div className="space-y-2">
              {milestones.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No milestones found.</p>
              ) : milestones.map(m => {
                const count = clients.filter(c => c.currentMilestoneId === m.id).length
                return (
                  <button key={m.id} onClick={() => handleSelectMilestone(m.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition text-left">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.color ?? '#3B82F6' }} />
                    <span className="font-medium text-gray-800 text-sm">{m.title}</span>
                    <span className="ml-auto text-xs text-gray-400">{count} household{count !== 1 ? 's' : ''}</span>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )
              })}
            </div>
          ) : step === 2 ? (
            <div className="space-y-1">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mb-3">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              {allTasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No tasks in this milestone.</p>
              ) : selectedMilestone?.checkIns.map(ci => (
                <div key={ci.id} className="mb-4">
                  {(selectedMilestone?.checkIns.length ?? 0) > 1 && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{ci.title}</p>
                  )}
                  {ci.tasks.map(task => (
                    <button key={task.id} onClick={() => handleSelectTask(task.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition text-left mb-1.5">
                      <span className="text-sm font-medium text-gray-800">{task.title}</span>
                      <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div>
              <button onClick={() => setStep(2)} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mb-3">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              {eligibleClients.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No households on this milestone.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Households</span>
                    <button onClick={toggleAll} className="text-xs text-blue-500 hover:text-blue-700">
                      {selectedClientIds.size === eligibleClients.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {eligibleClients.map(c => {
                      const checked = selectedClientIds.has(c.id)
                      return (
                        <button key={c.id} onClick={() => toggleClient(c.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition text-left ${
                            checked ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                          }`}>
                            {checked && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{c.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 3 && !result && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">{selectedClientIds.size} household{selectedClientIds.size !== 1 ? 's' : ''} selected</span>
            <button onClick={handleSubmit} disabled={submitting || selectedClientIds.size === 0}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2">
              {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Mark Complete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
