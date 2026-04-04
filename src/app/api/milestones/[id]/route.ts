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
  const milestone = await prisma.milestone.findUnique({
    where: { id },
    include: { checkIns: { include: { tasks: true }, orderBy: { dayOfYear: 'asc' } } },
  })

  if (!milestone) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }

  return NextResponse.json(milestone)
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
  const { title, description, dayOfYear, endDayOfYear, durationType, color, reviewCycleId } = body

  const updated = await prisma.milestone.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(dayOfYear !== undefined && { dayOfYear }),
      ...(endDayOfYear !== undefined && { endDayOfYear }),
      ...(durationType !== undefined && { durationType }),
      ...(color !== undefined && { color }),
      ...(reviewCycleId !== undefined && { reviewCycleId: reviewCycleId || null }),
    },
    include: { checkIns: { include: { tasks: true } } },
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
  await prisma.milestone.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
