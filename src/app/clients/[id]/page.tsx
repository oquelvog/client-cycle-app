'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { getDayOfYear, getClientStatus, statusLabel, formatDayOfYear } from '@/lib/utils'

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
  checkIn: CheckIn
}

interface ClientTask {
  id: string
  taskId: string
  status: string
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

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const today = getDayOfYear(new Date())

  useEffect(() => {
    fetchClient()
  }, [params.id])

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}`)
      if (!res.ok) {
        router.push('/clients')
        return
      }
      const data = await res.json()
      setClient(data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!client) return null

  const lastDay = client.clientCheckIns
    .filter((ci) => ci.status === 'completed')
    .map((ci) => ci.checkIn.dayOfYear)
  const maxDay = lastDay.length > 0 ? Math.max(...lastDay) : null
  const status = getClientStatus(maxDay, today)
  const taskTotal = client.clientTasks.length
  const taskDone = client.clientTasks.filter((t) => t.status === 'completed').length
  const percent = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0

  return (
    <>
      <Header title={client.name} subtitle="Client detail view" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/clients" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Clients
          </Link>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl"
                style={{ backgroundColor: client.color }}
              >
                {client.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
                {client.email && <p className="text-gray-500">{client.email}</p>}
                {client.phone && <p className="text-gray-500">{client.phone}</p>}
              </div>
              <div className="ml-auto">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                  status === 'on_track' ? 'bg-green-100 text-green-700 border-green-200' :
                  status === 'behind' ? 'bg-red-100 text-red-700 border-red-200' :
                  status === 'ahead' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                  'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {statusLabel(status)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm text-gray-500">{taskDone}/{taskTotal} tasks ({percent}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${percent}%`, backgroundColor: client.color }}
                />
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 text-center">
            Use the client detail modal on the Clients or Dashboard page for full management.
          </p>
        </div>
      </div>
    </>
  )
}
