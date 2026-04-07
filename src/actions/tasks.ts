"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdvisorId } from "@/lib/auth";

/**
 * Toggle a single task for a client.
 * Returns updated stats for the current milestone (live from DB — Rule 1).
 */
export async function toggleClientTask(
  clientId: string,
  taskId: string,
  completed: boolean
) {
  const advisorId = await getAdvisorId();
  const client = await prisma.client.findFirst({
    where: { id: clientId, advisorId },
    select: { id: true, currentMilestoneId: true },
  });
  if (!client) throw new Error("Client not found");

  await prisma.clientTask.upsert({
    where: { clientId_taskId: { clientId, taskId } },
    update: {
      status: completed ? "completed" : "pending",
      completedAt: completed ? new Date() : null,
    },
    create: {
      clientId,
      taskId,
      status: completed ? "completed" : "pending",
      completedAt: completed ? new Date() : null,
    },
  });

  // Return live stats for current milestone
  const stats = await getLiveStats(clientId, client.currentMilestoneId);
  revalidatePath("/timeline");
  return stats;
}

/**
 * Get live task completion for a client's current milestone.
 * Rule 1: Always reads from actual ClientTask records.
 */
export async function getLiveStats(
  clientId: string,
  milestoneId: string | null
): Promise<{ total: number; completed: number }> {
  if (!milestoneId) return { total: 0, completed: 0 };

  const tasks = await prisma.task.findMany({
    where: { checkIn: { milestoneId } },
    select: { id: true },
  });
  if (tasks.length === 0) return { total: 0, completed: 0 };

  const taskIds = tasks.map((t) => t.id);
  const completedCount = await prisma.clientTask.count({
    where: { clientId, taskId: { in: taskIds }, status: "completed" },
  });

  return { total: tasks.length, completed: completedCount };
}

/**
 * Get all tasks for a client's current milestone with their completion state.
 */
export async function getClientMilestoneTasks(clientId: string) {
  const advisorId = await getAdvisorId();
  const client = await prisma.client.findFirst({
    where: { id: clientId, advisorId },
    select: { currentMilestoneId: true },
  });
  if (!client?.currentMilestoneId) return [];

  const checkIns = await prisma.checkIn.findMany({
    where: { milestoneId: client.currentMilestoneId },
    include: {
      tasks: {
        include: {
          clientTasks: {
            where: { clientId },
          },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  });

  return checkIns;
}

/**
 * Mark a specific task complete across multiple clients.
 * Used by the Multi-Client Action feature.
 * Returns which clients are now fully complete (for advancement prompting).
 */
export async function bulkCompleteTask(
  taskId: string,
  clientIds: string[]
): Promise<string[]> {
  const advisorId = await getAdvisorId();

  // Verify all clients belong to this advisor
  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds }, advisorId },
    select: { id: true, currentMilestoneId: true },
  });

  const verifiedIds = clients.map((c) => c.id);

  // Mark task complete for all verified clients
  for (const clientId of verifiedIds) {
    await prisma.clientTask.upsert({
      where: { clientId_taskId: { clientId, taskId } },
      update: { status: "completed", completedAt: new Date() },
      create: { clientId, taskId, status: "completed", completedAt: new Date() },
    });
  }

  // Determine which clients are now fully complete
  const nowComplete: string[] = [];
  for (const client of clients) {
    if (!client.currentMilestoneId) continue;
    const stats = await getLiveStats(client.id, client.currentMilestoneId);
    if (stats.total > 0 && stats.completed === stats.total) {
      nowComplete.push(client.id);
    }
  }

  revalidatePath("/timeline");
  return nowComplete;
}
