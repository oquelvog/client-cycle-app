'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import ClientDetailModal from '@/components/ClientDetailModal'
import { getDayOfYear, getClientStatus, statusLabel, formatDayOfYear } from '@/lib/utils'

interface ClientCheckIn {
  checkInId: string
  status: string
  checkIn: { dayOfYear: number }
}

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  color: string
  clientCheckIns: ClientCheckIn[]
  clientTasks: { status: string }[]
}

const CLIENT_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B',
  '#EF4444', '#06B6D4', '#84CC16', '#F97316',
  '#EC4899', '#6366F1',
]

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [search, setSearch] = useState('')
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    color: CLIENT_COLORS[0],
    startDayOfYear: 1,
  })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const today = getDayOfYear(new Date())

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients')
      const data = await res.json()
      setClients(data)
    } finally {
      setLoading(false)
    }
  }

  const addClient = async () => {
    if (!newClient.name.trim()) return
    setSaving(true)
    try {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      })
      setShowAddModal(false)
      setNewClient({ name: '', email: '', phone: '', color: CLIENT_COLORS[0], startDayOfYear: 1 })
      await fetchClients()
    } finally {
      setSaving(false)
    }
  }

  const deleteClient = async (id: string) => {
    try {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      await fetchClients()
    } catch (err) {
      console.error(err)
    }
  }

  const getClientStats = (client: Client) => {
    const lastDay = client.clientCheckIns
      .filter((ci) => ci.status === 'completed')
      .map((ci) => ci.checkIn.dayOfYear)
    const maxDay = lastDay.length > 0 ? Math.max(...lastDay) : null
    const status = getClientStatus(maxDay, today)
    const taskTotal = client.clientTasks.length
    const taskDone = client.clientTasks.filter((t) => t.status === 'completed').length
    const percent = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0
    return { status, lastDay: maxDay, percent, taskDone, taskTotal }
  }

  const statusColors: Record<string, string> = {
    on_track: 'bg-green-100 text-green-700 border-green-200',
    behind: 'bg-red-100 text-red-700 border-red-200',
    ahead: 'bg-blue-100 text-blue-700 border-blue-200',
    not_started: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <>
      <Header
        title="Clients"
        subtitle={`${clients.length} clients under management`}
      />
      <div className="flex-1 overflow-y-auto p-8">
        {/* Toolbar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </button>
        </div>

        {/* Client grid */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No clients found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search ? 'Try a different search' : 'Add your first client to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((client) => {
              const { status, lastDay, percent, taskDone, taskTotal } = getClientStats(client)
              return (
                <div
                  key={client.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden cursor-pointer"
                  onClick={() => setSelectedClientId(client.id)}
                >
                  {/* Color header bar */}
                  <div className="h-1.5" style={{ backgroundColor: client.color }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                          style={{ backgroundColor: client.color }}
                        >
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{client.name}</p>
                          {client.email && <p className="text-xs text-gray-400">{client.email}</p>}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColors[status]}`}>
                        {statusLabel(status)}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Progress</span>
                        <span className="text-xs font-medium text-gray-700">{percent}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${percent}%`, backgroundColor: client.color }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{taskDone}/{taskTotal} tasks done</span>
                      <span>{lastDay ? `Last: ${formatDayOfYear(lastDay)}` : 'No check-ins'}</span>
                    </div>
                  </div>
                  <div className="px-5 pb-4 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirm(client.id)
                      }}
                      className="text-xs text-red-400 hover:text-red-600 transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add New Client</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Client full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="client@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="555-0100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {CLIENT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewClient({ ...newClient, color })}
                      className={`w-8 h-8 rounded-full transition ${newClient.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={addClient}
                  disabled={saving || !newClient.name.trim()}
                  className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {saving ? 'Adding...' : 'Add Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Client?</h3>
            <p className="text-gray-500 text-sm mb-6">
              This will permanently delete the client and all their timeline data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteClient(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <ClientDetailModal
        clientId={selectedClientId}
        onClose={() => setSelectedClientId(null)}
        onUpdate={fetchClients}
      />
    </>
  )
}
