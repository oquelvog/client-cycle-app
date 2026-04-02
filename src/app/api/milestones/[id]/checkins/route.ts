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

  const checkIns = await prisma.checkIn.findMany({
    where: { milestoneId: params.id },
    include: { tasks: true },
    orderBy: { dayOfYear: 'asc' },
  })

  return NextResponse.json(checkIns)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, description, dayOfYear } = body

  if (!title || dayOfYear === undefined) {
    return NextResponse.json(
      { error: 'title and dayOfYear are required' },
      { status: 400 }
    )
  }

  // Create check-in
  const checkIn = await prisma.checkIn.create({
    data: {
      title,
      description: description || null,
      dayOfYear,
      milestoneId: params.id,
    },
    include: { tasks: true },
  })

  // Create ClientCheckIn records for all existing clients
  const clients = await prisma.client.findMany()
  for (const c of clients) {
    await prisma.clientCheckIn.upsert({
      where: { clientId_checkInId: { clientId: c.id, checkInId: checkIn.id } },
      update: {},
      create: { clientId: c.id, checkInId: checkIn.id, status: 'pending' },
    })
  }

  return NextResponse.json(checkIn, { status: 201 })
}
