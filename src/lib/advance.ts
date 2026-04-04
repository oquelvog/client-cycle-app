import { prisma } from './prisma'

/**
 * Resets all ClientTask records for a given milestone back to pending.
 * Called whenever a client advances so the new milestone starts clean.
 */
export async function resetMilestoneTasks(clientId: string, milestoneId: string) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { checkIns: { include: { tasks: true } } },
  })
  const tasks = milestone?.checkIns.flatMap(ci => ci.tasks) ?? []
  if (tasks.length === 0) return
  await prisma.clientTask.updateMany({
    where: { clientId, taskId: { in: tasks.map(t => t.id) } },
    data: { status: 'pending', completedAt: null },
  })
}

/**
 * Returns true if every task in the client's current milestone is completed.
 * Does NOT advance — callers decide whether to proceed.
 */
export async function checkAllMilestoneTasksComplete(clientId: string): Promise<boolean> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      currentMilestone: { include: { checkIns: { include: { tasks: true } } } },
    },
  })
  if (!client?.currentMilestoneId || !client.currentMilestone) return false
  const milestoneTasks = client.currentMilestone.checkIns.flatMap(ci => ci.tasks)
  if (milestoneTasks.length === 0) return false
  const clientTasks = await prisma.clientTask.findMany({
    where: { clientId, taskId: { in: milestoneTasks.map(t => t.id) } },
  })
  return milestoneTasks.every(t =>
    clientTasks.find(ct => ct.taskId === t.id)?.status === 'completed'
  )
}

/**
 * Returns the next milestone after the given one (by dayOfYear order).
 * Wraps around to the first milestone when the client finishes the last one.
 */
export async function getNextMilestone(currentMilestoneId: string) {
  const current = await prisma.milestone.findUnique({ where: { id: currentMilestoneId } })
  if (!current) return null

  const next = await prisma.milestone.findFirst({
    where: { dayOfYear: { gt: current.dayOfYear } },
    orderBy: { dayOfYear: 'asc' },
  })
  if (next) return next

  // Wrap around: annual cycle restarts at the first milestone
  return prisma.milestone.findFirst({
    where: { id: { not: currentMilestoneId } },
    orderBy: { dayOfYear: 'asc' },
  })
}

/**
 * Checks whether all tasks are done, advances the client if so, and resets
 * the new milestone's tasks to pending. Used by the bulk-task route.
 */
export async function checkAndAutoAdvance(clientId: string) {
  const allDone = await checkAllMilestoneTasksComplete(clientId)
  if (!allDone) return { advanced: false, nextMilestone: null }

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client?.currentMilestoneId) return { advanced: false, nextMilestone: null }

  const next = await getNextMilestone(client.currentMilestoneId)
  if (!next) return { advanced: false, nextMilestone: null }

  await prisma.client.update({
    where: { id: clientId },
    data: { currentMilestoneId: next.id },
  })

  await resetMilestoneTasks(clientId, next.id)

  return { advanced: true, nextMilestone: next }
}
