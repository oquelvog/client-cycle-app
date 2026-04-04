import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { name } = await req.json()

  const cycle = await prisma.reviewCycle.findFirst({
    where: { id, advisorId: session.user.id },
  })
  if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.reviewCycle.update({
    where: { id },
    data: { name: name.trim() },
    include: { milestones: true, _count: { select: { clients: true } } },
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
  const cycle = await prisma.reviewCycle.findFirst({
    where: { id, advisorId: session.user.id },
  })
  if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Detach clients and milestones before deleting
  await prisma.client.updateMany({
    where: { reviewCycleId: id },
    data: { reviewCycleId: null, currentMilestoneId: null },
  })

  await prisma.reviewCycle.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
