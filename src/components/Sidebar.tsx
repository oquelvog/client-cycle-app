'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

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
  { label: 'Q1 — Jan through Mar', startDay: 1,   endDay: 90  },
  { label: 'Q2 — Apr through Jun', startDay: 91,  endDay: 181 },
  { label: 'Q3 — Jul through Sep', startDay: 182, endDay: 273 },
  { label: 'Q4 — Oct through Dec', startDay: 274, endDay: 365 },
]

function dateToDayOfYear(mmdd: string): number {
  const [mm, dd] = mmdd.split('-').map(Number)
  if (!mm || !dd) return 1
  const d = new Date(new Date().getFullYear(), mm - 1, dd)
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d.getTime() - start.getTime()) / 86400000)
}

function dayOfYearToMMDD(day: number): string {
  const d = new Date(new Date().getFullYear(), 0)
  d.setDate(day)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Milestone {
  id: string; title: string; description?: string
  dayOfYear: number; endDayOfYear: number; durationType: string; color: string
}
interface Client {
  id: string; name: string; notes?: string
  currentMilestoneId: string | null; currentMilestone?: { title: string } | null
}

const emptyMF = () => ({
  title: '', description: '',
  durationType: 'month',
  monthIndex: 0, quarterIndex: 0,
  customStart: '', customEnd: '',
  color: COLORS[0],
})
const emptyCF = () => ({ name: '', notes: '', currentMilestoneId: '' })
const emptyUF = () => ({ name: '', email: '', password: '' })

export default function Sidebar({ onRefresh = () => {} }: { onRefresh?: () => void }) {
  const router = useRouter()
  const { data: session } = useSession()

  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [clients, setClients] = useState<Client[]>([])

  const [msOpen, setMsOpen] = useState(true)
  const [clOpen, setClOpen] = useState(true)
  const [tmOpen, setTmOpen] = useState(false)

  const [showMF, setShowMF] = useState(false)
  const [editMid, setEditMid] = useState<string | null>(null)
  const [mf, setMf] = useState(emptyMF())

  const [showCF, setShowCF] = useState(false)
  const [editCid, setEditCid] = useState<string | null>(null)
  const [cf, setCf] = useState(emptyCF())

  const [showUF, setShowUF] = useState(false)
  const [uf, setUf] = useState(emptyUF())

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [mr, cr] = await Promise.all([fetch('/api/milestones'), fetch('/api/clients')])
    if (mr.ok) setMilestones((await mr.json()).sort((a: Milestone, b: Milestone) => a.dayOfYear - b.dayOfYear))
    if (cr.ok) setClients(await cr.json())
  }

  // ── Milestone helpers ──────────────────────────────────────────
  function buildMDays(f: ReturnType<typeof emptyMF>) {
    if (f.durationType === 'month') {
      const m = MONTHS_LIST[f.monthIndex]
      return { dayOfYear: m.startDay, endDayOfYear: m.endDay }
    }
    if (f.durationType === 'quarter') {
      const q = QUARTERS_LIST[f.quarterIndex]
      return { dayOfYear: q.startDay, endDayOfYear: q.endDay }
    }
    // custom
    const s = f.customStart ? dateToDayOfYear(f.customStart) : 1
    const e = f.customEnd ? dateToDayOfYear(f.customEnd) : s
    return { dayOfYear: Math.min(s, e), endDayOfYear: Math.max(s, e) }
  }

  function mfFromData(m: Milestone) {
    const f = emptyMF()
    f.title = m.title; f.description = m.description ?? ''; f.color = m.color
    let dt = m.durationType
    if (dt === 'specific_date' || dt === 'week') dt = 'custom'
    f.durationType = dt
    if (dt === 'month') {
      f.monthIndex = Math.max(0, MONTHS_LIST.findIndex(mo => m.dayOfYear >= mo.startDay && m.dayOfYear <= mo.endDay))
    } else if (dt === 'quarter') {
      f.quarterIndex = Math.max(0, QUARTERS_LIST.findIndex(q => m.dayOfYear >= q.startDay && m.dayOfYear <= q.endDay))
    } else {
      f.customStart = dayOfYearToMMDD(m.dayOfYear)
      f.customEnd = dayOfYearToMMDD(m.endDayOfYear > 0 ? m.endDayOfYear : m.dayOfYear)
    }
    return f
  }

  const saveMilestone = async () => {
    if (!mf.title.trim()) { setErr('Title is required'); return }
    setSaving(true); setErr('')
    const days = buildMDays(mf)
    const body = { title: mf.title.trim(), description: mf.description.trim() || null, ...days, durationType: mf.durationType, color: mf.color }
    const res = editMid
      ? await fetch(`/api/milestones/${editMid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/milestones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { setShowMF(false); setEditMid(null); setMf(emptyMF()); await fetchAll(); onRefresh() }
    else setErr('Failed to save milestone')
  }

  const deleteMilestone = async (id: string) => {
    if (!confirm('Delete this milestone? Clients assigned to it will become unassigned.')) return
    await fetch(`/api/milestones/${id}`, { method: 'DELETE' })
    await fetchAll(); onRefresh()
  }

  // ── Client helpers ─────────────────────────────────────────────
  const saveClient = async () => {
    if (!cf.name.trim()) { setErr('Household name is required'); return }
    setSaving(true); setErr('')
    const body = { name: cf.name.trim(), notes: cf.notes.trim() || null, currentMilestoneId: cf.currentMilestoneId || null }
    const res = editCid
      ? await fetch(`/api/clients/${editCid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { setShowCF(false); setEditCid(null); setCf(emptyCF()); await fetchAll(); onRefresh() }
    else setErr('Failed to save client')
  }

  const deleteClient = async (id: string) => {
    if (!confirm('Remove this household?')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    await fetchAll(); onRefresh()
  }

  const startEditM = (m: Milestone) => { setEditMid(m.id); setMf(mfFromData(m)); setShowMF(true); setErr('') }
  const startEditC = (c: Client) => {
    setEditCid(c.id)
    setCf({ name: c.name, notes: c.notes ?? '', currentMilestoneId: c.currentMilestoneId ?? '' })
    setShowCF(true); setErr('')
  }
  const cancelMF = () => { setShowMF(false); setEditMid(null); setMf(emptyMF()); setErr('') }
  const cancelCF = () => { setShowCF(false); setEditCid(null); setCf(emptyCF()); setErr('') }

  // ── Team member helper ─────────────────────────────────────────
  const saveUser = async () => {
    if (!uf.name.trim() || !uf.email.trim() || !uf.password.trim()) { setErr('All fields required'); return }
    setSaving(true); setErr('')
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(uf) })
    setSaving(false)
    if (res.ok) { setShowUF(false); setUf(emptyUF()) }
    else { const d = await res.json(); setErr(d.error || 'Failed to create account') }
  }

  // ── Shared input classes ───────────────────────────────────────
  const inp = 'w-full bg-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500'
  const btn = (variant: 'primary'|'ghost') =>
    variant === 'primary'
      ? 'flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg py-2 transition disabled:opacity-50'
      : 'px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg py-2 transition'

  const SectionBtn = ({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) => (
    <button onClick={onClick} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-800 transition">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )

  const AddBtn = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button onClick={onClick} className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-400 text-xs font-medium transition">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
      {label}
    </button>
  )

  return (
    <div className="w-80 flex-shrink-0 bg-slate-900 flex flex-col h-screen overflow-hidden">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-700 flex-shrink-0">
        <img src="/logo-white.svg" alt="Annua" className="h-9 w-auto" />
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto">

        {/* ── MILESTONES ── */}
        <div className="border-b border-slate-700">
          <SectionBtn open={msOpen} label="Milestones" onClick={() => setMsOpen(o => !o)} />
          {msOpen && (
            <div className="px-4 pb-4 space-y-2">
              {milestones.map(m => (
                <div key={m.id} className="flex items-start gap-2 group">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: m.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 font-medium truncate">{m.title}</p>
                    <p className="text-xs text-slate-500 capitalize">{m.durationType === 'custom' ? 'Custom range' : m.durationType}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                    <button onClick={() => startEditM(m)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => deleteMilestone(m.id)} className="p-1 rounded hover:bg-red-900 text-slate-400 hover:text-red-300">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}

              {showMF ? (
                <div className="mt-3 bg-slate-800 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{editMid ? 'Edit Milestone' : 'New Milestone'}</p>
                  {err && <p className="text-xs text-red-400">{err}</p>}

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Title *</label>
                    <input className={inp} placeholder="e.g. Q1 Annual Review" value={mf.title} onChange={e => setMf(f => ({ ...f, title: e.target.value }))} />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">What needs to be done</label>
                    <textarea rows={3} className={inp + ' resize-none'} placeholder="Describe the goals or tasks for this milestone…" value={mf.description} onChange={e => setMf(f => ({ ...f, description: e.target.value }))} />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Spans a</label>
                    <select className={inp} value={mf.durationType} onChange={e => setMf(f => ({ ...f, durationType: e.target.value }))}>
                      <option value="month">Specific Month</option>
                      <option value="quarter">Quarter</option>
                      <option value="custom">Custom Date Range</option>
                    </select>
                  </div>

                  {mf.durationType === 'month' && (
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Month</label>
                      <select className={inp} value={mf.monthIndex} onChange={e => setMf(f => ({ ...f, monthIndex: Number(e.target.value) }))}>
                        {MONTHS_LIST.map((m, i) => <option key={m.label} value={i}>{m.label}</option>)}
                      </select>
                    </div>
                  )}

                  {mf.durationType === 'quarter' && (
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Quarter</label>
                      <select className={inp} value={mf.quarterIndex} onChange={e => setMf(f => ({ ...f, quarterIndex: Number(e.target.value) }))}>
                        {QUARTERS_LIST.map((q, i) => <option key={q.label} value={i}>{q.label}</option>)}
                      </select>
                    </div>
                  )}

                  {mf.durationType === 'custom' && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Start date (MM-DD)</label>
                        <input className={inp} placeholder="e.g. 03-01" maxLength={5} value={mf.customStart} onChange={e => setMf(f => ({ ...f, customStart: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">End date (MM-DD)</label>
                        <input className={inp} placeholder="e.g. 03-31" maxLength={5} value={mf.customEnd} onChange={e => setMf(f => ({ ...f, customEnd: e.target.value }))} />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => setMf(f => ({ ...f, color: c }))}
                          className={`w-6 h-6 rounded-full border-2 transition ${mf.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button onClick={saveMilestone} disabled={saving} className={btn('primary')}>{saving ? 'Saving…' : editMid ? 'Update' : 'Add Milestone'}</button>
                    <button onClick={cancelMF} className={btn('ghost')}>Cancel</button>
                  </div>
                </div>
              ) : (
                <AddBtn label="Add Milestone" onClick={() => { setShowMF(true); setEditMid(null); setMf(emptyMF()); setErr('') }} />
              )}
            </div>
          )}
        </div>

        {/* ── CLIENTS ── */}
        <div className="border-b border-slate-700">
          <SectionBtn open={clOpen} label="Households" onClick={() => setClOpen(o => !o)} />
          {clOpen && (
            <div className="px-4 pb-4 space-y-2">
              {clients.map(c => (
                <div key={c.id} className="flex items-start gap-2 group">
                  <svg className="w-3.5 h-3.5 text-slate-500 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 font-medium truncate">{c.name}</p>
                    <p className="text-xs text-slate-500 truncate">{c.currentMilestone?.title ?? 'Unassigned'}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                    <button onClick={() => startEditC(c)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => deleteClient(c.id)} className="p-1 rounded hover:bg-red-900 text-slate-400 hover:text-red-300">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}

              {showCF ? (
                <div className="mt-3 bg-slate-800 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{editCid ? 'Edit Household' : 'New Household'}</p>
                  {err && <p className="text-xs text-red-400">{err}</p>}

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Household Name *</label>
                    <input className={inp} placeholder="e.g. Johnson Family" value={cf.name} onChange={e => setCf(f => ({ ...f, name: e.target.value }))} />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Current Milestone</label>
                    <select className={inp} value={cf.currentMilestoneId} onChange={e => setCf(f => ({ ...f, currentMilestoneId: e.target.value }))}>
                      <option value="">— Not yet placed —</option>
                      {milestones.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Where is this household in the annual cycle?</p>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Notes</label>
                    <textarea rows={2} className={inp + ' resize-none'} placeholder="Any notes…" value={cf.notes} onChange={e => setCf(f => ({ ...f, notes: e.target.value }))} />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button onClick={saveClient} disabled={saving} className={btn('primary')}>{saving ? 'Saving…' : editCid ? 'Update' : 'Add Household'}</button>
                    <button onClick={cancelCF} className={btn('ghost')}>Cancel</button>
                  </div>
                </div>
              ) : (
                <AddBtn label="Add Household" onClick={() => { setShowCF(true); setEditCid(null); setCf(emptyCF()); setErr('') }} />
              )}
            </div>
          )}
        </div>

        {/* ── TEAM MEMBERS ── */}
        <div className="border-b border-slate-700">
          <SectionBtn open={tmOpen} label="Team Members" onClick={() => setTmOpen(o => !o)} />
          {tmOpen && (
            <div className="px-4 pb-4">
              <p className="text-xs text-slate-500 mb-3">Add a colleague so they can log in and manage the timeline.</p>
              {showUF ? (
                <div className="bg-slate-800 rounded-xl p-4 space-y-3">
                  {err && <p className="text-xs text-red-400">{err}</p>}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Name</label>
                    <input className={inp} placeholder="Jane Smith" value={uf.name} onChange={e => setUf(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Email</label>
                    <input type="email" className={inp} placeholder="jane@firm.com" value={uf.email} onChange={e => setUf(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Temporary Password</label>
                    <input type="password" className={inp} placeholder="They can change it later" value={uf.password} onChange={e => setUf(f => ({ ...f, password: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={saveUser} disabled={saving} className={btn('primary')}>{saving ? 'Creating…' : 'Create Account'}</button>
                    <button onClick={() => { setShowUF(false); setUf(emptyUF()); setErr('') }} className={btn('ghost')}>Cancel</button>
                  </div>
                </div>
              ) : (
                <AddBtn label="Add Team Member" onClick={() => { setShowUF(true); setErr('') }} />
              )}
            </div>
          )}
        </div>

      </div>

      {/* Bottom nav */}
      <div className="flex-shrink-0 border-t border-slate-700 px-4 py-3 space-y-1">
        <div className="text-xs text-slate-500 px-3 py-1 truncate">{session?.user?.email}</div>
        <button onClick={() => router.push('/dashboard')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          Dashboard
        </button>
        <button onClick={() => signOut({ callbackUrl: '/auth/signin' })} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign Out
        </button>
      </div>
    </div>
  )
}
