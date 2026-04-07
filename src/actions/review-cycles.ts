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
            orderBy: { order: "asc" },
            include: { tasks: { orderBy: { order: "asc" } } },
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

  // Verify ownership before touching anything
  const cycle = await prisma.reviewCycle.findUnique({ where: { id, advisorId } });
  if (!cycle) throw new Error("Cycle not found or access denied");

  // Clients have a non-nullable FK to ReviewCycle with no cascade, so we must
  // delete them (and their task/check-in records) explicitly first.
  const clients = await prisma.client.findMany({
    where: { reviewCycleId: id },
    select: { id: true },
  });
  const clientIds = clients.map((c) => c.id);

  if (clientIds.length > 0) {
    await prisma.clientTask.deleteMany({ where: { clientId: { in: clientIds } } });
    await prisma.clientCheckIn.deleteMany({ where: { clientId: { in: clientIds } } });
    await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
  }

  // Deleting the cycle cascades to Milestone → CheckIn → Task via schema rules
  await prisma.reviewCycle.delete({ where: { id } });

  revalidatePath("/timeline");
  revalidatePath("/manage");
}
