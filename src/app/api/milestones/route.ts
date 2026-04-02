import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const milestones = await prisma.milestone.findMany({
    include: {
      checkIns: {
        include: { tasks: true },
        orderBy: { dayOfYear: 'asc' },
      },
    },
    orderBy: { dayOfYear: 'asc' },
  })

  return NextResponse.json(milestones)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, description, dayOfYear, endDayOfYear, durationType, color } = body

  if (!title || dayOfYear === undefined) {
    return NextResponse.json({ error: 'title and dayOfYear are required' }, { status: 400 })
  }

  const milestone = await prisma.milestone.create({
    data: {
      title,
      description: description || null,
      dayOfYear,
      endDayOfYear: endDayOfYear || 0,
      durationType: durationType || 'specific_date',
      color: color || '#3B82F6',
    },
    include: { checkIns: { include: { tasks: true } } },
  })

  return NextResponse.json(milestone, { status: 201 })
}
