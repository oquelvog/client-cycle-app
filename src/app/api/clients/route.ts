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

  // Jan 1 rollback: once per year, decrement all clients' cycleYear by 1
  const currentYear = new Date().getFullYear()
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user && user.lastRollbackYear < currentYear) {
    await prisma.$transaction([
      prisma.client.updateMany({
        where: { advisorId: session.user.id, cycleYear: { gt: 0 } },
        data: { cycleYear: { decrement: 1 } },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { lastRollbackYear: currentYear },
      }),
    ])
  }

  const clients = await prisma.client.findMany({
    where: { advisorId: session.user.id },
    include: {
      currentMilestone: true,
      reviewCycle: { select: { id: true, name: true } },
      clientCheckIns: {
        include: { checkIn: true },
        orderBy: { checkIn: { dayOfYear: 'desc' } },
      },
      clientTasks: {
        include: {
          task: {
            include: { checkIn: { include: { milestone: true } } },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, notes, currentMilestoneId, reviewCycleId } = body

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const allCheckIns = await prisma.checkIn.findMany()
  const allTasks = await prisma.task.findMany()

  const client = await prisma.client.create({
    data: {
      name,
      notes: notes || null,
      currentMilestoneId: currentMilestoneId || null,
      reviewCycleId: reviewCycleId || null,
      advisorId: session.user.id,
      cycleYear: new Date().getFullYear(),
      clientCheckIns: {
        create: allCheckIns.map((ci) => ({ checkInId: ci.id, status: 'pending' })),
      },
      clientTasks: {
        create: allTasks.map((t) => ({ taskId: t.id, status: 'pending' })),
      },
    },
    include: {
      currentMilestone: true,
      reviewCycle: { select: { id: true, name: true } },
      clientCheckIns: { include: { checkIn: true } },
      clientTasks: true,
    },
  })

  return NextResponse.json(client, { status: 201 })
}
