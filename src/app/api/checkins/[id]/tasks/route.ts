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
  const tasks = await prisma.task.findMany({
    where: { checkInId: id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(tasks)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { title, description } = body

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      checkInId: id,
    },
  })

  const clients = await prisma.client.findMany()
  for (const c of clients) {
    await prisma.clientTask.upsert({
      where: { clientId_taskId: { clientId: c.id, taskId: task.id } },
      update: {},
      create: { clientId: c.id, taskId: task.id, status: 'pending' },
    })
  }

  return NextResponse.json(task, { status: 201 })
}
