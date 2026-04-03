import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkAndAutoAdvance } from '@/lib/advance'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { taskId, clientIds } = body as { taskId: string; clientIds: string[] }

  if (!taskId || !Array.isArray(clientIds) || clientIds.length === 0) {
    return NextResponse.json({ error: 'taskId and clientIds are required' }, { status: 400 })
  }

  // Verify all clients belong to the requesting advisor
  const ownedClients = await prisma.client.findMany({
    where: { id: { in: clientIds }, advisorId: session.user.id },
    select: { id: true },
  })
  const ownedIds = new Set(ownedClients.map(c => c.id))
  const validIds = clientIds.filter(id => ownedIds.has(id))

  if (validIds.length === 0) {
    return NextResponse.json({ error: 'No authorized clients found' }, { status: 403 })
  }

  // Mark task complete for all valid clients
  await Promise.all(
    validIds.map(clientId =>
      prisma.clientTask.upsert({
        where: { clientId_taskId: { clientId, taskId } },
        update: { status: 'completed', completedAt: new Date() },
        create: { clientId, taskId, status: 'completed', completedAt: new Date() },
      })
    )
  )

  // Auto-advance any clients that have now completed all milestone tasks
  const advanceResults = await Promise.all(
    validIds.map(async clientId => {
      const result = await checkAndAutoAdvance(clientId)
      return { clientId, ...result }
    })
  )

  return NextResponse.json({
    updated: validIds.length,
    advanced: advanceResults.filter(r => r.advanced).map(r => r.clientId),
  })
}
