"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdvisorId } from "@/lib/auth";
import { DurationType } from "@/types";

export async function createMilestone(data: {
  reviewCycleId: string;
  title: string;
  description?: string;
  dayOfYear: number;
  endDayOfYear: number;
  durationType: DurationType;
  color: string;
  order?: number;
}) {
  const advisorId = await getAdvisorId();
  // Verify ownership
  const cycle = await prisma.reviewCycle.findFirst({
    where: { id: data.reviewCycleId, advisorId },
  });
  if (!cycle) throw new Error("Review cycle not found");

  const count = await prisma.milestone.count({
    where: { reviewCycleId: data.reviewCycleId },
  });

  const milestone = await prisma.milestone.create({
    data: {
      reviewCycleId: data.reviewCycleId,
      title: data.title,
      description: data.description,
      dayOfYear: data.dayOfYear,
      endDayOfYear: data.endDayOfYear,
      durationType: data.durationType,
      color: data.color,
      order: data.order ?? count,
    },
    include: {
      checkIns: { include: { tasks: true } },
    },
  });
  revalidatePath("/timeline");
  revalidatePath("/manage");
  return milestone;
}

export async function updateMilestone(
  id: string,
  data: {
    title?: string;
    description?: string;
    dayOfYear?: number;
    endDayOfYear?: number;
    durationType?: DurationType;
    color?: string;
    order?: number;
  }
) {
  const advisorId = await getAdvisorId();
  const milestone = await prisma.milestone.findFirst({
    where: { id, reviewCycle: { advisorId } },
  });
  if (!milestone) throw new Error("Milestone not found");

  const updated = await prisma.milestone.update({
    where: { id },
    data,
  });
  revalidatePath("/timeline");
  revalidatePath("/manage");
  return updated;
}

export async function deleteMilestone(id: string) {
  const advisorId = await getAdvisorId();
  const milestone = await prisma.milestone.findFirst({
    where: { id, reviewCycle: { advisorId } },
  });
  if (!milestone) throw new Error("Milestone not found");

  await prisma.milestone.delete({ where: { id } });
  revalidatePath("/timeline");
  revalidatePath("/manage");
}

export async function createCheckIn(data: {
  milestoneId: string;
  title: string;
  description?: string;
  dayOfYear: number;
}) {
  const advisorId = await getAdvisorId();
  const milestone = await prisma.milestone.findFirst({
    where: { id: data.milestoneId, reviewCycle: { advisorId } },
  });
  if (!milestone) throw new Error("Milestone not found");

  const count = await prisma.checkIn.count({ where: { milestoneId: data.milestoneId } });

  const checkIn = await prisma.checkIn.create({
    data: {
      milestoneId: data.milestoneId,
      title: data.title,
      description: data.description,
      dayOfYear: data.dayOfYear,
      order: count,
    },
    include: { tasks: true },
  });
  revalidatePath("/manage");
  return checkIn;
}

export async function updateCheckIn(id: string, data: { title: string }) {
  const advisorId = await getAdvisorId();
  const checkIn = await prisma.checkIn.findFirst({
    where: { id, milestone: { reviewCycle: { advisorId } } },
  });
  if (!checkIn) throw new Error("Deliverable not found");
  await prisma.checkIn.update({ where: { id }, data: { title: data.title } });
  revalidatePath("/manage");
}

export async function reorderCheckIns(orderedIds: string[]) {
  if (orderedIds.length === 0) return;
  const advisorId = await getAdvisorId();
  const first = await prisma.checkIn.findFirst({
    where: { id: orderedIds[0], milestone: { reviewCycle: { advisorId } } },
  });
  if (!first) throw new Error("Deliverable not found");
  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.checkIn.update({ where: { id }, data: { order: i } }))
  );
  revalidatePath("/manage");
  revalidatePath("/timeline");
}

export async function deleteCheckIn(id: string) {
  const advisorId = await getAdvisorId();
  const checkIn = await prisma.checkIn.findFirst({
    where: { id, milestone: { reviewCycle: { advisorId } } },
  });
  if (!checkIn) throw new Error("Check-in not found");
  await prisma.checkIn.delete({ where: { id } });
  revalidatePath("/manage");
}

export async function createTask(data: {
  checkInId: string;
  title: string;
  description?: string;
}) {
  const advisorId = await getAdvisorId();
  const checkIn = await prisma.checkIn.findFirst({
    where: { id: data.checkInId, milestone: { reviewCycle: { advisorId } } },
  });
  if (!checkIn) throw new Error("Check-in not found");

  const count = await prisma.task.count({ where: { checkInId: data.checkInId } });

  const task = await prisma.task.create({
    data: {
      checkInId: data.checkInId,
      title: data.title,
      description: data.description,
      order: count,
    },
  });
  revalidatePath("/manage");
  return task;
}

export async function updateTask(id: string, data: { title: string }) {
  const advisorId = await getAdvisorId();
  const task = await prisma.task.findFirst({
    where: { id, checkIn: { milestone: { reviewCycle: { advisorId } } } },
  });
  if (!task) throw new Error("Task not found");
  await prisma.task.update({ where: { id }, data: { title: data.title } });
  revalidatePath("/manage");
}

export async function reorderTasks(orderedIds: string[]) {
  if (orderedIds.length === 0) return;
  const advisorId = await getAdvisorId();
  const first = await prisma.task.findFirst({
    where: { id: orderedIds[0], checkIn: { milestone: { reviewCycle: { advisorId } } } },
  });
  if (!first) throw new Error("Task not found");
  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.task.update({ where: { id }, data: { order: i } }))
  );
  revalidatePath("/manage");
  revalidatePath("/timeline");
}

export async function deleteTask(id: string) {
  const advisorId = await getAdvisorId();
  const task = await prisma.task.findFirst({
    where: {
      id,
      checkIn: { milestone: { reviewCycle: { advisorId } } },
    },
  });
  if (!task) throw new Error("Task not found");
  await prisma.task.delete({ where: { id } });
  revalidatePath("/manage");
}
