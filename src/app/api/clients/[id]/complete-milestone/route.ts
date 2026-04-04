import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getNextMilestone } from '@/lib/advance'

export const dynamic = 'force-dynamic'

export async function POST(
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
      currentMilestone: {
        include: { checkIns: { include: { tasks: true } } },
      },
    },
  })

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  if (!client.currentMilestoneId || !client.currentMilestone) {
    return NextResponse.json({ error: 'Client has no current milestone' }, { status: 400 })
  }

  const tasks = client.currentMilestone.checkIns.flatMap(ci => ci.tasks)

  // Mark all tasks complete
  await Promise.all(
    tasks.map(t =>
      prisma.clientTask.upsert({
        where: { clientId_taskId: { clientId: id, taskId: t.id } },
        update: { status: 'completed', completedAt: new Date() },
        create: { clientId: id, taskId: t.id, status: 'completed', completedAt: new Date() },
      })
    )
  )

  // Always advance — getNextMilestone wraps around to the first milestone
  // when the client has completed the last one in the sequence
  const next = await getNextMilestone(client.currentMilestoneId)

  const updated = await prisma.client.update({
    where: { id },
    // Only update the milestone if a next one was found; keeps current if
    // there is genuinely only one milestone in the system
    data: { currentMilestoneId: next ? next.id : client.currentMilestoneId },
    include: { currentMilestone: true },
  })

  return NextResponse.json({
    client: updated,
    advanced: !!next,
    nextMilestone: next ?? null,
  })
}
