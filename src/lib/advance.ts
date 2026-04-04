import { prisma } from './prisma'

/**
 * Returns the next milestone after the given one (by dayOfYear order).
 * If the current milestone is the last one, wraps around to the first —
 * completing the final milestone of the year restarts the annual cycle.
 */
export async function getNextMilestone(currentMilestoneId: string) {
  const current = await prisma.milestone.findUnique({ where: { id: currentMilestoneId } })
  if (!current) return null

  // Next milestone in sequence
  const next = await prisma.milestone.findFirst({
    where: { dayOfYear: { gt: current.dayOfYear } },
    orderBy: { dayOfYear: 'asc' },
  })
  if (next) return next

  // Wrap around: return first milestone to restart the annual cycle
  return prisma.milestone.findFirst({
    where: { id: { not: currentMilestoneId } },
    orderBy: { dayOfYear: 'asc' },
  })
}

/**
 * Checks whether all tasks for a client's current milestone are complete.
 * If so, advances the client to the next milestone.
 */
export async function checkAndAutoAdvance(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      currentMilestone: {
        include: { checkIns: { include: { tasks: true } } },
      },
    },
  })

  if (!client?.currentMilestoneId || !client.currentMilestone) {
    return { advanced: false, nextMilestone: null }
  }

  const milestoneTasks = client.currentMilestone.checkIns.flatMap(ci => ci.tasks)
  if (milestoneTasks.length === 0) return { advanced: false, nextMilestone: null }

  const clientTasks = await prisma.clientTask.findMany({
    where: { clientId, taskId: { in: milestoneTasks.map(t => t.id) } },
  })

  const allDone = milestoneTasks.every(t =>
    clientTasks.find(ct => ct.taskId === t.id)?.status === 'completed'
  )
  if (!allDone) return { advanced: false, nextMilestone: null }

  const next = await getNextMilestone(client.currentMilestoneId)
  if (!next) return { advanced: false, nextMilestone: null }

  await prisma.client.update({
    where: { id: clientId },
    data: { currentMilestoneId: next.id },
  })

  return { advanced: true, nextMilestone: next }
}
