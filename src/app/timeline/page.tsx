'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Timeline from '@/components/Timeline'

export default function TimelinePage() {
  const { status } = useSession()
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status !== 'authenticated') return null

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar onRefresh={() => setRefreshKey((k) => k + 1)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Timeline refreshKey={refreshKey} />
      </div>
    </div>
  )
}
