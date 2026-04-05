'use client'

import { useSession } from 'next-auth/react'
import { formatDayOfYear, getDayOfYear } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession()
  const today = new Date()
  const todayDay = getDayOfYear(today)

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-8 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <img src="/logo-dark.svg" alt="Annua" className="h-8 w-auto block dark:hidden" />
          <img src="/logo-white.svg" alt="Annua" className="h-8 w-auto hidden dark:block" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">
              {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-xs text-gray-400">Day {todayDay} of 365</p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-700 font-semibold text-sm">
                {session?.user?.name?.charAt(0) || 'A'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{session?.user?.name || 'Advisor'}</p>
              <p className="text-xs text-gray-400">{session?.user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
