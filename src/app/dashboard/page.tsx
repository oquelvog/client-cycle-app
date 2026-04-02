'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  color: string
  clientCheckIns: ClientCheckIn[]
}

function getLastCompletedDay(client: Client): number | null {
  const completed = client.clientCheckIns
    .filter((ci) => ci.status === 'completed')
    .map((ci) => ci.checkIn.dayOfYear)
  if (completed.length === 0) return null
  return Math.max(...completed)
}

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
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

  const clientsWithStatus = clients.map((c) => {
    const lastDay = getLastCompletedDay(c)
    const status = getClientStatus(lastDay, today)
    const daysBehind = lastDay !== null ? today - lastDay : null
    return { ...c, status, lastDay, daysBehind }
  })

  // Sort by most behind first
  const sorted = [...clientsWithStatus].sort((a, b) => {
    if (a.status === 'behind' && b.status !== 'behind') return -1
    if (b.status === 'behind' && a.status !== 'behind') return 1
    const aDays = a.daysBehind ?? -999
    const bDays = b.daysBehind ?? -999
    return bDays - aDays
  })

  const stats = {
    total: clients.length,
    onTrack: clientsWithStatus.filter((c) => c.status === 'on_track').length,
    behind: clientsWithStatus.filter((c) => c.status === 'behind').length,
    ahead: clientsWithStatus.filter((c) => c.status === 'ahead').length,
    notStarted: clientsWithStatus.filter((c) => c.status === 'not_started').length,
  }

  const statusColors: Record<string, string> = {
    on_track: 'bg-green-100 text-green-700 border-green-200',
    behind: 'bg-red-100 text-red-700 border-red-200',
    ahead: 'bg-blue-100 text-blue-700 border-blue-200',
    not_started: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Overview of your client engagement timeline"
      />
      <div className="flex-1 overflow-y-auto p-8">
        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">Total Clients</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-5 shadow-sm">
            <p className="text-sm text-green-600 mb-1">On Track</p>
            <p className="text-3xl font-bold text-green-700">{stats.onTrack}</p>
            <div className="mt-2 w-full bg-green-100 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full"
                style={{ width: stats.total > 0 ? `${(stats.onTrack / stats.total) * 100}%` : '0%' }}
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm">
            <p className="text-sm text-red-600 mb-1">Behind</p>
            <p className="text-3xl font-bold text-red-700">{stats.behind}</p>
            {stats.behind > 0 && (
              <p className="text-xs text-red-500 mt-1">Needs attention</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm">
            <p className="text-sm text-blue-600 mb-1">Ahead</p>
            <p className="text-3xl font-bold text-blue-700">{stats.ahead}</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link
            href="/timeline"
            className="bg-navy-950 hover:bg-navy-900 text-white rounded-xl p-5 flex items-center gap-4 shadow-sm transition"
          >
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-lg">View Timeline</p>
              <p className="text-blue-300 text-sm">See all clients on the annual timeline</p>
            </div>
          </Link>
          <Link
            href="/milestones"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-center gap-4 shadow-sm transition"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900">Manage Milestones</p>
              <p className="text-gray-500 text-sm">Configure check-ins and tasks</p>
            </div>
          </Link>
        </div>

        {/* Client list */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Client Status</h2>
            <Link href="/clients" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Manage clients →
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center p-12">
              <p className="text-gray-500">No clients yet.</p>
              <Link href="/clients" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                Add your first client
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sorted.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: client.color }}
                  >
                    {client.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-500">
                      {client.lastDay
                        ? `Last check-in: ${formatDayOfYear(client.lastDay)}`
                        : 'No check-ins completed'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {client.status === 'behind' && client.daysBehind && (
                      <span className="text-xs text-red-600 font-medium">
                        {client.daysBehind}d behind
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[client.status]}`}>
                      {statusLabel(client.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ClientDetailModal
        clientId={selectedClientId}
        onClose={() => setSelectedClientId(null)}
        onUpdate={fetchClients}
      />
    </>
  )
}
