'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

// ── Constants ────────────────────────────────────────────────────
const COLORS = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#F97316']

const MONTHS_LIST = [
  { label: 'January',   startDay: 1,   endDay: 31  },
  { label: 'February',  startDay: 32,  endDay: 59  },
  { label: 'March',     startDay: 60,  endDay: 90  },
  { label: 'April',     startDay: 91,  endDay: 120 },
  { label: 'May',       startDay: 121, endDay: 151 },
  { label: 'June',      startDay: 152, endDay: 181 },
  { label: 'July',      startDay: 182, endDay: 212 },
  { label: 'August',    startDay: 213, endDay: 243 },
  { label: 'September', startDay: 244, endDay: 273 },
  { label: 'October',   startDay: 274, endDay: 304 },
  { label: 'November',  startDay: 305, endDay: 334 },
  { label: 'December',  startDay: 335, endDay: 365 },
]

const QUARTERS_LIST = [
  { label: 'Q1 (Jan – Mar)', startDay: 1,   endDay: 90  },
  { label: 'Q2 (Apr – Jun)', startDay: 91,  endDay: 181 },
  { label: 'Q3 (Jul – Sep)', startDay: 182, endDay: 273 },
  { label: 'Q4 (Oct – Dec)', startDay: 274, endDay: 365 },
]

function dateToDayOfYear(dateStr: string): number {
  const [month, day] = dateStr.split('-').map(Number)
  const date = new Date(new Date().getFullYear(), month - 1, day)
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / 86400000)
}

function dayOfYearToMMDD(day: number): string {
  const date = new Date(new Date().getFullYear(), 0)
  date.setDate(day)
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}-${d}`
}

// ── Types ─────────────────────────────────────────────────────────
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
  email?: string
  phone?: string
  notes?: string
  currentMilestoneId: string | null
  currentMilestone?: { title: string } | null
}

const emptyMilestoneForm = () => ({
  title: '',
  description: '',
  durationType: 'specific_date' as string,
  dateInput: '',       // MM-DD for specific_date / week
  monthIndex: 0,
  quarterIndex: 0,
  color: COLORS[0],
})

const emptyClientForm = () => ({
  name: '',
  email: '',
  phone: '',
  notes: '',
  currentMilestoneId: '',
})

// ── Component ─────────────────────────────────────────────────────
export default function Sidebar({ onRefresh = () => {} }: { onRefresh?: () => void }) {
  const router = useRouter()

  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [clients, setClients] = useState<Client[]>([])

  // Panel open state
  const [milestonesOpen, setMilestonesOpen] = useState(true)
  const [clientsOpen, setClientsOpen] = useState(true)

  // Milestone form state
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null)
  const [mForm, setMForm] = useState(emptyMilestoneForm())

  // Client form state
  const [showClientForm, setShowClientForm] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [cForm, setCForm] = useState(emptyClientForm())

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    const [mRes, cRes] = await Promise.all([fetch('/api/milestones'), fetch('/api/clients')])
    if (mRes.ok) setMilestones(await mRes.json())
    if (cRes.ok) setClients(await cRes.json())
  }

  // ── Milestone helpers ──────────────────────────────────────────
  function buildMilestoneDays(form: typeof mForm): { dayOfYear: number; endDayOfYear: number } {
    if (form.durationType === 'month') {
      const m = MONTHS_LIST[form.monthIndex]
      return { dayOfYear: m.startDay, endDayOfYear: m.endDay }
    }
    if (form.durationType === 'quarter') {
      const q = QUARTERS_LIST[form.quarterIndex]
      return { dayOfYear: q.startDay, endDayOfYear: q.endDay }
    }
    // specific_date or week
    const start = form.dateInput ? dateToDayOfYear(form.dateInput) : 1
    const end = form.durationType === 'week' ? start + 6 : start
    return { dayOfYear: start, endDayOfYear: end }
  }

  function milestoneFormFromData(m: Milestone) {
    const f = emptyMilestoneForm()
    f.title = m.title
    f.description = m.description ?? ''
    f.durationType = m.durationType
    f.color = m.color
    if (m.durationType === 'month') {
      f.monthIndex = MONTHS_LIST.findIndex((mo) => mo.startDay === m.dayOfYear) ?? 0
    } else if (m.durationType === 'quarter') {
      f.quarterIndex = QUARTERS_LIST.findIndex((q) => q.startDay === m.dayOfYear) ?? 0
    } else {
      f.dateInput = dayOfYearToMMDD(m.dayOfYear)
    }
    return f
  }

  const saveMilestone = async () => {
    if (!mForm.title.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    const { dayOfYear, endDayOfYear } = buildMilestoneDays(mForm)
    const body = {
      title: mForm.title.trim(),
      description: mForm.description.trim() || null,
      dayOfYear,
      endDayOfYear,
      durationType: mForm.durationType,
      color: mForm.color,
    }
    const res = editingMilestoneId
      ? await fetch(`/api/milestones/${editingMilestoneId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/milestones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) {
      setShowMilestoneForm(false); setEditingMilestoneId(null); setMForm(emptyMilestoneForm())
      await fetchAll(); onRefresh()
    } else {
      setError('Failed to save milestone')
    }
  }

  const deleteMilestone = async (id: string) => {
    if (!confirm('Delete this milestone? Clients assigned to it will become unassigned.')) return
    await fetch(`/api/milestones/${id}`, { method: 'DELETE' })
    await fetchAll(); onRefresh()
  }

  // ── Client helpers ─────────────────────────────────────────────
  const saveClient = async () => {
    if (!cForm.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    const body = {
      name: cForm.name.trim(),
      email: cForm.email.trim() || null,
      phone: cForm.phone.trim() || null,
      notes: cForm.notes.trim() || null,
      currentMilestoneId: cForm.currentMilestoneId || null,
    }
    const res = editingClientId
      ? await fetch(`/api/clients/${editingClientId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) {
      setShowClientForm(false); setEditingClientId(null); setCForm(emptyClientForm())
      await fetchAll(); onRefresh()
    } else {
      setError('Failed to save client')
    }
  }

  const deleteClient = async (id: string) => {
    if (!confirm('Remove this client?')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    await fetchAll(); onRefresh()
  }

  const startEditMilestone = (m: Milestone) => {
    setEditingMilestoneId(m.id); setMForm(milestoneFormFromData(m)); setShowMilestoneForm(true); setError('')
  }

  const startEditClient = (c: Client) => {
    setEditingClientId(c.id)
    setCForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', notes: c.notes ?? '', currentMilestoneId: c.currentMilestoneId ?? '' })
    setShowClientForm(true); setError('')
  }

  const cancelMilestoneForm = () => { setShowMilestoneForm(false); setEditingMilestoneId(null); setMForm(emptyMilestoneForm()); setError('') }
  const cancelClientForm = () => { setShowClientForm(false); setEditingClientId(null); setCForm(emptyClientForm()); setError('') }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="w-80 flex-shrink-0 bg-slate-900 flex flex-col h-screen overflow-hidden">

      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">ClientCycle</p>
            <p className="text-slate-400 text-xs mt-0.5">Engagement Timeline</p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── MILESTONES SECTION ───────────────────────────── */}
        <div className="border-b border-slate-700">
          <button
            onClick={() => setMilestonesOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-800 transition"
          >
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Milestones</span>
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${milestonesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {milestonesOpen && (
            <div className="px-4 pb-4 space-y-2">
              {/* Milestone list */}
              {milestones.map((m) => (
                <div key={m.id} className="flex items-start gap-2 group">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: m.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 font-medium truncate">{m.title}</p>
                    <p className="text-xs text-slate-500 capitalize">{m.durationType.replace('_', ' ')}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                    <button onClick={() => startEditMilestone(m)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => deleteMilestone(m.id)} className="p-1 rounded hover:bg-red-900 text-slate-400 hover:text-red-300">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Add / Edit milestone form */}
              {showMilestoneForm ? (
                <div className="mt-3 bg-slate-800 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {editingMilestoneId ? 'Edit Milestone' : 'New Milestone'}
                  </p>

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Title *</label>
                    <input
                      className="w-full bg-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                      placeholder="e.g. Q1 Annual Review"
                      value={mForm.title}
                      onChange={(e) => setMForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">What needs to be done</label>
                    <textarea
                      rows={3}
                      className="w-full bg-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 resize-none"
                      placeholder="Describe the tasks or goals for this milestone…"
                      value={mForm.description}
                      onChange={(e) => setMForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Duration</label>
                    <select
                      className="w-full bg-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                      value={mForm.durationType}
                      onChange={(e) => setMForm((f) => ({ ...f, durationType: e.target.value }))}
                    >
                      <option value="specific_date">Specific Date</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="quarter">Quarter</option>
                    </select>
                  </div>

                  {/* Dynamic date/position input */}
                  {(mForm.durationType === 'specific_date' || mForm.durationType === 'week') && (
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">
                        {mForm.durationType === 'week' ? 'Start Date (week begins)' : 'Date'}
                      </label>
                      <input
                        type="text"
                        placeholder="MM-DD  e.g. 01-15"
                        maxLength={5}
                        className="w-full bg-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                        value={mForm.dateInput}
                        onChange={(e) => setMForm((f) => ({ ...f, dateInput: e.target.value }))}
                      />
                      <p className="text-xs text-slate-500 mt-1">Format: MM-DD (e.g. 03-15 for March 15)</p>
                    </div>
                  )}

                  {mForm.durationType === 'month' && (
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Month</label>
                      <select
                        className="w-full bg-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        value={mForm.monthIndex}
                        onChange={(e) => setMForm((f) => ({ ...f, monthIndex: Number(e.target.value) }))}
                      >
                        {MONTHS_LIST.map((m, i) => (
                          <option key={m.label} value={i}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {mForm.durationType === 'quarter' && (
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Quarter</label>
                      <select
                        className="w-full bg-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        value={mForm.quarterIndex}
                        onChange={(e) => setMForm((f) => ({ ...f, quarterIndex: Number(e.target.value) }))}
                      >
                        {QUARTERS_LIST.map((q, i) => (
                          <option key={q.label} value={i}>{q.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Color picker */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setMForm((f) => ({ ...f, color: c }))}
                          className={`w-6 h-6 rounded-full border-2 transition ${mForm.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveMilestone}
                      disabled={saving}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg py-2 transition disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : editingMilestoneId ? 'Update' : 'Add Milestone'}
                    </button>
                    <button onClick={cancelMilestoneForm} className="px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg py-2 transition">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setShowMilestoneForm(true); setEditingMilestoneId(null); setMForm(emptyMilestoneForm()); setError('') }}
                  className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-400 text-xs font-medium transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Milestone
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── CLIENTS SECTION ──────────────────────────────── */}
        <div className="border-b border-slate-700">
          <button
            onClick={() => setClientsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-800 transition"
          >
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Clients</span>
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${clientsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {clientsOpen && (
            <div className="px-4 pb-4 space-y-2">
              {/* Client list */}
              {clients.map((c) => (
                <div key={c.id} className="flex items-start gap-2 group">
                  <svg className="w-3.5 h-3.5 text-slate-500 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 font-medium truncate">{c.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {c.currentMilestone ? c.currentMilestone.title : 'No milestone assigned'}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                    <button onClick={() => startEditClient(c)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => deleteClient(c.id)} className="p-1 rounded hover:bg-red-900 text-slate-400 hover:text-red-300">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Add / Edit client form */}
              {showClientForm ? (
                <div className="mt-3 bg-slate-800 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {editingClientId ? 'Edit Client' : 'New Client'}
                  </p>

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Name *</label>
                    <input
                      className="w-full bg-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                      placeholder="Full name"
                      value={cForm.name}
                      onChange={(e) => setCForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full bg-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                      placeholder="email@example.com"
                      value={cForm.email}
                      onChange={(e) => setCForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Phone</label>
                    <input
                      type="tel"
                      className="w-full bg-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                      placeholder="555-0100"
                      value={cForm.phone}
                      onChange={(e) => setCForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Current Milestone</label>
                    <select
                      className="w-full bg-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                      value={cForm.currentMilestoneId}
                      onChange={(e) => setCForm((f) => ({ ...f, currentMilestoneId: e.target.value }))}
                    >
                      <option value="">— None —</option>
                      {milestones.map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Where is this client in the annual cycle?</p>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Notes</label>
                    <textarea
                      rows={2}
                      className="w-full bg-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 resize-none"
                      placeholder="Any notes about this client…"
                      value={cForm.notes}
                      onChange={(e) => setCForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveClient}
                      disabled={saving}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg py-2 transition disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : editingClientId ? 'Update' : 'Add Client'}
                    </button>
                    <button onClick={cancelClientForm} className="px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg py-2 transition">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setShowClientForm(true); setEditingClientId(null); setCForm(emptyClientForm()); setError('') }}
                  className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-400 text-xs font-medium transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Client
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex-shrink-0 border-t border-slate-700 px-4 py-3 space-y-1">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          Dashboard
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign Out
        </button>
      </div>
    </div>
  )
}
