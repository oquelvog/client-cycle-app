import { prisma } from './prisma'

/**
 * Returns the next milestone after the given one (by dayOfYear order),
 * or null if the given milestone is already the last.
 */
export async function getNextMilestone(currentMilestoneId: string) {
  const current = await prisma.milestone.findUnique({ where: { id: currentMilestoneId } })
  if (!current) return null
  return prisma.milestone.findFirst({
    where: { dayOfYear: { gt: current.dayOfYear } },
    orderBy: { dayOfYear: 'asc' },
  })
}

/**
 * Checks whether all tasks belonging to a client's current milestone are
 * complete. If they are, advances the client to the next milestone.
 *
 * Returns { advanced, nextMilestone } so callers can surface the change.
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
