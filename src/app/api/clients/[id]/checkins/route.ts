import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await prisma.client.findFirst({
    where: { id: params.id, advisorId: session.user.id },
  })
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const checkIns = await prisma.clientCheckIn.findMany({
    where: { clientId: params.id },
    include: { checkIn: { include: { milestone: true } } },
    orderBy: { checkIn: { dayOfYear: 'asc' } },
  })

  return NextResponse.json(checkIns)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await prisma.client.findFirst({
    where: { id: params.id, advisorId: session.user.id },
  })
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const body = await req.json()
  const { checkInId, status, notes } = body

  if (!checkInId) {
    return NextResponse.json({ error: 'checkInId is required' }, { status: 400 })
  }

  const updated = await prisma.clientCheckIn.upsert({
    where: { clientId_checkInId: { clientId: params.id, checkInId } },
    update: {
      status,
      notes,
      completedAt: status === 'completed' ? new Date() : null,
    },
    create: {
      clientId: params.id,
      checkInId,
      status: status || 'pending',
      notes,
      completedAt: status === 'completed' ? new Date() : null,
    },
  })

  return NextResponse.json(updated)
}
