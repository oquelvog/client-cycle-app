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

  const clients = await prisma.client.findMany({
    where: { advisorId: session.user.id },
    include: {
      clientCheckIns: {
        include: {
          checkIn: true,
        },
        orderBy: { checkIn: { dayOfYear: 'desc' } },
      },
      clientTasks: true,
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
  const { name, email, phone, tags, color, startDayOfYear, notes } = body

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // Get all check-ins and tasks to initialize for new client
  const allCheckIns = await prisma.checkIn.findMany()
  const allTasks = await prisma.task.findMany()

  const client = await prisma.client.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      tags: tags || '',
      color: color || '#10B981',
      startDayOfYear: startDayOfYear || 1,
      notes: notes || null,
      advisorId: session.user.id,
      clientCheckIns: {
        create: allCheckIns.map((ci) => ({
          checkInId: ci.id,
          status: 'pending',
        })),
      },
      clientTasks: {
        create: allTasks.map((t) => ({
          taskId: t.id,
          status: 'pending',
        })),
      },
    },
    include: {
      clientCheckIns: {
        include: { checkIn: true },
      },
      clientTasks: true,
    },
  })

  return NextResponse.json(client, { status: 201 })
}
