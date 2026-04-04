import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getNextMilestone, resetMilestoneTasks } from '@/lib/advance'

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

  // Mark all tasks in the current milestone complete
  await Promise.all(
    tasks.map(t =>
      prisma.clientTask.upsert({
        where: { clientId_taskId: { clientId: id, taskId: t.id } },
        update: { status: 'completed', completedAt: new Date() },
        create: { clientId: id, taskId: t.id, status: 'completed', completedAt: new Date() },
      })
    )
  )

  // Advance to the next milestone (wraps around if this was the last one)
  const { milestone: next, isWrapAround } = await getNextMilestone(client.currentMilestoneId)

  const updated = await prisma.client.update({
    where: { id },
    data: {
      currentMilestoneId: next ? next.id : client.currentMilestoneId,
      // Increment cycleYear on any wrap-around, including single-milestone cycles
      ...(isWrapAround && client.cycleYear > 0 && { cycleYear: client.cycleYear + 1 }),
    },
    include: { currentMilestone: true },
  })

  // Always reset tasks for the destination milestone.
  // When next is null (single-milestone cycle) the client stays at the same
  // milestone, so reset that one — otherwise the tasks stay 'completed' forever.
  const milestoneToReset = next?.id ?? client.currentMilestoneId
  await resetMilestoneTasks(id, milestoneToReset)

  return NextResponse.json({
    client: updated,
    advanced: true,
    nextMilestone: next ?? client.currentMilestone,
  })
}
