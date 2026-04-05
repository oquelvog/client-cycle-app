"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdvisorId } from "@/lib/auth";

export async function getClients() {
  const advisorId = await getAdvisorId();
  return prisma.client.findMany({
    where: { advisorId },
    include: {
      reviewCycle: true,
      currentMilestone: {
        include: {
          checkIns: {
            include: { tasks: true },
            orderBy: { dayOfYear: "asc" },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createClient(data: {
  name: string;
  color?: string;
  tags?: string[];
  reviewCycleId: string;
  currentMilestoneId?: string;
  cycleYear?: number;
}) {
  const advisorId = await getAdvisorId();

  // Verify review cycle ownership
  const cycle = await prisma.reviewCycle.findFirst({
    where: { id: data.reviewCycleId, advisorId },
  });
  if (!cycle) throw new Error("Review cycle not found");

  const client = await prisma.client.create({
    data: {
      name: data.name,
      color: data.color ?? "#6366f1",
      tags: data.tags ?? [],
      reviewCycleId: data.reviewCycleId,
      currentMilestoneId: data.currentMilestoneId ?? null,
      cycleYear: data.cycleYear ?? new Date().getFullYear(),
      advisorId,
    },
  });

  // Initialize ClientTask records for current milestone
  if (data.currentMilestoneId) {
    await initClientTasksForMilestone(client.id, data.currentMilestoneId);
  }

  revalidatePath("/timeline");
  revalidatePath("/manage");
  return client;
}

export async function updateClient(
  id: string,
  data: {
    name?: string;
    color?: string;
    tags?: string[];
    notes?: string;
    lastContacted?: Date | null;
    cycleYear?: number;
    reviewCycleId?: string;
    currentMilestoneId?: string | null;
  }
) {
  const advisorId = await getAdvisorId();
  const client = await prisma.client.findFirst({ where: { id, advisorId } });
  if (!client) throw new Error("Client not found");

  const updated = await prisma.client.update({
    where: { id },
    data,
  });
  revalidatePath("/timeline");
  revalidatePath("/manage");
  return updated;
}

export async function deleteClient(id: string) {
  const advisorId = await getAdvisorId();
  await prisma.client.delete({ where: { id, advisorId } });
  revalidatePath("/timeline");
  revalidatePath("/manage");
}

/**
 * Returns live task completion stats for the current milestone only.
 * Rule 1: Always reads from actual ClientTask records.
 */
export async function getClientTaskStats(
  clientId: string
): Promise<{ total: number; completed: number }> {
  const advisorId = await getAdvisorId();
  const client = await prisma.client.findFirst({
    where: { id: clientId, advisorId },
    select: { currentMilestoneId: true },
  });
  if (!client?.currentMilestoneId) return { total: 0, completed: 0 };

  const tasks = await prisma.task.findMany({
    where: { checkIn: { milestoneId: client.currentMilestoneId } },
    select: { id: true },
  });

  if (tasks.length === 0) return { total: 0, completed: 0 };

  const taskIds = tasks.map((t) => t.id);
  const completed = await prisma.clientTask.count({
    where: {
      clientId,
      taskId: { in: taskIds },
      status: "completed",
    },
  });

  return { total: tasks.length, completed };
}

/**
 * Advance a household to the next milestone.
 * Rule 2: Resets all ClientTask records for the new milestone to pending.
 * Rule 5: Always resets destination milestone tasks regardless of prior state.
 */
export async function advanceClient(clientId: string) {
  const advisorId = await getAdvisorId();
  const client = await prisma.client.findFirst({
    where: { id: clientId, advisorId },
    include: {
      reviewCycle: {
        include: {
          milestones: { orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!client) throw new Error("Client not found");

  const milestones = client.reviewCycle.milestones;
  if (milestones.length === 0) throw new Error("No milestones in review cycle");

  const currentIndex = client.currentMilestoneId
    ? milestones.findIndex((m) => m.id === client.currentMilestoneId)
    : -1;

  const isLastMilestone = currentIndex === milestones.length - 1;
  const nextIndex = isLastMilestone ? 0 : currentIndex + 1;
  const nextMilestone = milestones[nextIndex];

  const newCycleYear =
    isLastMilestone && currentIndex >= 0
      ? client.cycleYear + 1
      : client.cycleYear;

  // Mark all current milestone tasks complete
  if (client.currentMilestoneId) {
    const currentTasks = await prisma.task.findMany({
      where: { checkIn: { milestoneId: client.currentMilestoneId } },
      select: { id: true },
    });
    for (const task of currentTasks) {
      await prisma.clientTask.upsert({
        where: { clientId_taskId: { clientId, taskId: task.id } },
        update: { status: "completed", completedAt: new Date() },
        create: {
          clientId,
          taskId: task.id,
          status: "completed",
          completedAt: new Date(),
        },
      });
    }
  }

  // Update client to new milestone
  await prisma.client.update({
    where: { id: clientId },
    data: {
      currentMilestoneId: nextMilestone.id,
      cycleYear: newCycleYear,
    },
  });

  // Reset all tasks for new milestone to pending (Rule 2 & 5)
  await initClientTasksForMilestone(clientId, nextMilestone.id);

  revalidatePath("/timeline");
  return { nextMilestone, newCycleYear };
}

/** Initialize/reset ClientTask records for a milestone to pending */
export async function initClientTasksForMilestone(
  clientId: string,
  milestoneId: string
) {
  const tasks = await prisma.task.findMany({
    where: { checkIn: { milestoneId } },
    select: { id: true },
  });

  for (const task of tasks) {
    await prisma.clientTask.upsert({
      where: { clientId_taskId: { clientId, taskId: task.id } },
      update: { status: "pending", completedAt: null },
      create: { clientId, taskId: task.id, status: "pending" },
    });
  }
}

export async function updateClientYear(clientId: string, year: number) {
  const advisorId = await getAdvisorId();
  await prisma.client.update({
    where: { id: clientId, advisorId },
    data: { cycleYear: year },
  });
  revalidatePath("/timeline");
}
