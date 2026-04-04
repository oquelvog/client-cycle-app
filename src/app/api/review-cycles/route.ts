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

  const cycles = await prisma.reviewCycle.findMany({
    where: { advisorId: session.user.id },
    include: {
      milestones: {
        include: { checkIns: { include: { tasks: true }, orderBy: { dayOfYear: 'asc' } } },
        orderBy: { dayOfYear: 'asc' },
      },
      _count: { select: { clients: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(cycles)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const cycle = await prisma.reviewCycle.create({
    data: { name: name.trim(), advisorId: session.user.id },
    include: { milestones: true, _count: { select: { clients: true } } },
  })

  return NextResponse.json(cycle, { status: 201 })
}
