'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatDayOfYear } from '@/lib/utils'

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

const MILESTONE_COLORS = [
  '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981',
  '#EF4444', '#06B6D4', '#F97316', '#EC4899',
]

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [expandedCheckIns, setExpandedCheckIns] = useState<Set<string>>(new Set())

  // Add milestone form
  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', dayOfYear: 1, color: '#3B82F6' })
  const [savingMilestone, setSavingMilestone] = useState(false)

  // Add check-in form
  const [addingCheckInToMilestone, setAddingCheckInToMilestone] = useState<string | null>(null)
  const [newCheckIn, setNewCheckIn] = useState({ title: '', description: '', dayOfYear: 1 })
  const [savingCheckIn, setSavingCheckIn] = useState(false)

  // Add task form
  const [addingTaskToCheckIn, setAddingTaskToCheckIn] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({ title: '', description: '' })
  const [savingTask, setSavingTask] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'milestone' | 'checkin' | 'task'; id: string } | null>(null)

  useEffect(() => {
    fetchMilestones()
  }, [])

  const fetchMilestones = async () => {
    try {
      const res = await fetch('/api/milestones')
      const data = await res.json()
      setMilestones(data.sort((a: Milestone, b: Milestone) => a.dayOfYear - b.dayOfYear))
    } finally {
      setLoading(false)
    }
  }

  const addMilestone = async () => {
    if (!newMilestone.title.trim()) return
    setSavingMilestone(true)
    try {
      await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMilestone),
      })
      setShowAddMilestone(false)
      setNewMilestone({ title: '', description: '', dayOfYear: 1, color: '#3B82F6' })
      await fetchMilestones()
    } finally {
      setSavingMilestone(false)
    }
  }

  const addCheckIn = async (milestoneId: string) => {
    if (!newCheckIn.title.trim()) return
    setSavingCheckIn(true)
    try {
      await fetch(`/api/milestones/${milestoneId}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCheckIn),
      })
      setAddingCheckInToMilestone(null)
      setNewCheckIn({ title: '', description: '', dayOfYear: 1 })
      await fetchMilestones()
    } finally {
      setSavingCheckIn(false)
    }
  }

  const addTask = async (checkInId: string) => {
    if (!newTask.title.trim()) return
    setSavingTask(true)
    try {
      await fetch(`/api/checkins/${checkInId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      })
      setAddingTaskToCheckIn(null)
      setNewTask({ title: '', description: '' })
      await fetchMilestones()
    } finally {
      setSavingTask(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { type, id } = deleteTarget
    const url =
      type === 'milestone' ? `/api/milestones/${id}` :
      type === 'checkin' ? `/api/checkins/${id}` :
      `/api/tasks/${id}`

    await fetch(url, { method: 'DELETE' })
    setDeleteTarget(null)
    await fetchMilestones()
  }

  const toggleMilestone = (id: string) => {
    const s = new Set(expandedMilestones)
    s.has(id) ? s.delete(id) : s.add(id)
    setExpandedMilestones(s)
  }

  const toggleCheckIn = (id: string) => {
    const s = new Set(expandedCheckIns)
    s.has(id) ? s.delete(id) : s.add(id)
    setExpandedCheckIns(s)
  }

  return (
    <>
      <Header
        title="Milestones"
        subtitle="Configure your annual engagement timeline"
      />
      <div className="flex-1 overflow-y-auto p-8">
        {/* Add Milestone button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowAddMilestone(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Milestone
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : milestones.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No milestones yet. Create your first milestone above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {milestones.map((milestone) => {
              const isExpanded = expandedMilestones.has(milestone.id)
              return (
                <div key={milestone.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Milestone header */}
                  <div
                    className="flex items-center gap-3 p-5 cursor-pointer hover:bg-gray-50 transition"
                    style={{ borderLeft: `4px solid ${milestone.color}` }}
                    onClick={() => toggleMilestone(milestone.id)}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: milestone.color + '20' }}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{ color: milestone.color }}>
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{milestone.title}</h3>
                        <span className="text-xs text-gray-400">{formatDayOfYear(milestone.dayOfYear)}</span>
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-gray-500 truncate">{milestone.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{milestone.checkIns.length} check-ins</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'milestone', id: milestone.id }) }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Check-ins */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {milestone.checkIns.map((checkIn) => {
                        const ciExpanded = expandedCheckIns.has(checkIn.id)
                        return (
                          <div key={checkIn.id} className="border-b border-gray-50 last:border-b-0">
                            <div
                              className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-gray-50 transition"
                              onClick={() => toggleCheckIn(checkIn.id)}
                            >
                              <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: milestone.color }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-800 text-sm">{checkIn.title}</p>
                                  <span className="text-xs text-gray-400">{formatDayOfYear(checkIn.dayOfYear)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">{checkIn.tasks.length} tasks</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'checkin', id: checkIn.id }) }}
                                  className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                                <svg
                                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${ciExpanded ? 'rotate-180' : ''}`}
                                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>

                            {/* Tasks */}
                            {ciExpanded && (
                              <div className="px-6 pb-3 pl-14">
                                <div className="space-y-2">
                                  {checkIn.tasks.map((task) => (
                                    <div key={task.id} className="flex items-center gap-2 group">
                                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                                      <p className="text-sm text-gray-700 flex-1">{task.title}</p>
                                      <button
                                        onClick={() => setDeleteTarget({ type: 'task', id: task.id })}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 rounded transition"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                {/* Add task inline */}
                                {addingTaskToCheckIn === checkIn.id ? (
                                  <div className="mt-3 flex gap-2">
                                    <input
                                      type="text"
                                      value={newTask.title}
                                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                      onKeyDown={(e) => e.key === 'Enter' && addTask(checkIn.id)}
                                      autoFocus
                                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                      placeholder="Task title..."
                                    />
                                    <button
                                      onClick={() => addTask(checkIn.id)}
                                      disabled={savingTask}
                                      className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 transition"
                                    >
                                      Add
                                    </button>
                                    <button
                                      onClick={() => setAddingTaskToCheckIn(null)}
                                      className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 text-xs rounded transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setAddingTaskToCheckIn(checkIn.id)}
                                    className="mt-2 text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 transition"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add task
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Add check-in */}
                      <div className="px-6 py-3 bg-gray-50">
                        {addingCheckInToMilestone === milestone.id ? (
                          <div className="flex gap-2 flex-wrap">
                            <input
                              type="text"
                              value={newCheckIn.title}
                              onChange={(e) => setNewCheckIn({ ...newCheckIn, title: e.target.value })}
                              autoFocus
                              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              placeholder="Check-in title..."
                            />
                            <input
                              type="number"
                              value={newCheckIn.dayOfYear}
                              onChange={(e) => setNewCheckIn({ ...newCheckIn, dayOfYear: parseInt(e.target.value) || 1 })}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              placeholder="Day"
                              min={1}
                              max={365}
                            />
                            <button
                              onClick={() => addCheckIn(milestone.id)}
                              disabled={savingCheckIn}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => setAddingCheckInToMilestone(null)}
                              className="px-4 py-2 text-gray-500 hover:bg-gray-200 text-sm rounded-lg transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAddingCheckInToMilestone(milestone.id)
                              setNewCheckIn({ title: '', description: '', dayOfYear: milestone.dayOfYear })
                            }}
                            className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1.5 transition"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add check-in
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Milestone Modal */}
      {showAddMilestone && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddMilestone(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Milestone</h2>
              <button onClick={() => setShowAddMilestone(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. Q2 Review"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newMilestone.description}
                  onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Year (1-365) *</label>
                <input
                  type="number"
                  value={newMilestone.dayOfYear}
                  onChange={(e) => setNewMilestone({ ...newMilestone, dayOfYear: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  min={1}
                  max={365}
                />
                <p className="text-xs text-gray-400 mt-1">
                  = {formatDayOfYear(newMilestone.dayOfYear)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {MILESTONE_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewMilestone({ ...newMilestone, color })}
                      className={`w-8 h-8 rounded-full transition ${newMilestone.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddMilestone(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={addMilestone}
                  disabled={savingMilestone || !newMilestone.title.trim()}
                  className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {savingMilestone ? 'Saving...' : 'Add Milestone'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete {deleteTarget.type}?</h3>
            <p className="text-gray-500 text-sm mb-6">
              This will permanently delete this {deleteTarget.type} and all associated data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
