"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdvisorId } from "@/lib/auth";

export async function getReviewCycles() {
  const advisorId = await getAdvisorId();
  return prisma.reviewCycle.findMany({
    where: { advisorId },
    include: {
      milestones: {
        orderBy: { order: "asc" },
        include: {
          checkIns: {
            orderBy: { dayOfYear: "asc" },
            include: { tasks: { orderBy: { createdAt: "asc" } } },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createReviewCycle(data: { name: string }) {
  const advisorId = await getAdvisorId();
  const cycle = await prisma.reviewCycle.create({
    data: { name: data.name, advisorId },
  });
  revalidatePath("/timeline");
  revalidatePath("/manage");
  return cycle;
}

export async function updateReviewCycle(id: string, data: { name: string }) {
  const advisorId = await getAdvisorId();
  const cycle = await prisma.reviewCycle.update({
    where: { id, advisorId },
    data: { name: data.name },
  });
  revalidatePath("/timeline");
  revalidatePath("/manage");
  return cycle;
}

export async function deleteReviewCycle(id: string) {
  const advisorId = await getAdvisorId();
  await prisma.reviewCycle.delete({ where: { id, advisorId } });
  revalidatePath("/timeline");
  revalidatePath("/manage");
}
