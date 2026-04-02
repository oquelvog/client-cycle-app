import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const client = await prisma.client.findFirst({
    where: { id, advisorId: session.user.id },
  })
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const tasks = await prisma.clientTask.findMany({
    where: { clientId: id },
    include: { task: { include: { checkIn: { include: { milestone: true } } } } },
  })

  return NextResponse.json(tasks)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const client = await prisma.client.findFirst({
    where: { id, advisorId: session.user.id },
  })
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const body = await req.json()
  const { taskId, status, notes } = body

  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
  }

  const updated = await prisma.clientTask.upsert({
    where: { clientId_taskId: { clientId: id, taskId } },
    update: {
      status,
      notes,
      completedAt: status === 'completed' ? new Date() : null,
    },
    create: {
      clientId: id,
      taskId,
      status: status || 'pending',
      notes,
      completedAt: status === 'completed' ? new Date() : null,
    },
  })

  return NextResponse.json(updated)
}
