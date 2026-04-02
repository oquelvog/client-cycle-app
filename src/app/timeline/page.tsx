'use client'

import Header from '@/components/Header'
import Timeline from '@/components/Timeline'

export default function TimelinePage() {
  return (
    <>
      <Header
        title="Engagement Timeline"
        subtitle="Annual client engagement milestones and check-ins"
      />
      <div className="flex-1 overflow-hidden p-8">
        <Timeline />
      </div>
    </>
  )
}
