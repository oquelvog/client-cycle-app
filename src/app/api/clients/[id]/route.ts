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
    include: {
      currentMilestone: true,
      clientCheckIns: {
        include: {
          checkIn: {
            include: { milestone: true, tasks: true },
          },
        },
        orderBy: { checkIn: { dayOfYear: 'asc' } },
      },
      clientTasks: {
        include: {
          task: {
            include: { checkIn: { include: { milestone: true } } },
          },
        },
      },
    },
  })

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  return NextResponse.json(client)
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
  const body = await req.json()
  const { name, notes, currentMilestoneId, reviewCycleId, cycleYear } = body

  const client = await prisma.client.findFirst({
    where: { id, advisorId: session.user.id },
  })

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(notes !== undefined && { notes }),
      ...(currentMilestoneId !== undefined && {
        currentMilestoneId: currentMilestoneId || null,
      }),
      ...(reviewCycleId !== undefined && {
        reviewCycleId: reviewCycleId || null,
      }),
      ...(cycleYear !== undefined && { cycleYear }),
    },
    include: { currentMilestone: true, reviewCycle: { select: { id: true, name: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
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

  await prisma.client.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
