"use server";

import { prisma } from "@/lib/prisma";
import { getAdvisorId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { initClientTasksForMilestone } from "./clients";

export interface ImportRow {
  householdName: string;
  reviewCycleName: string;
  milestoneName: string;
}

export interface ImportResult {
  created: number;
  errors: { row: number; message: string }[];
}

export async function importClients(rows: ImportRow[]): Promise<ImportResult> {
  const advisorId = await getAdvisorId();
  let created = 0;
  const errors: { row: number; message: string }[] = [];

  // Cache review cycles to avoid repeated queries
  const cycleCache = new Map<string, { id: string; milestones: { id: string; title: string }[] }>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    if (!row.householdName?.trim()) {
      errors.push({ row: rowNum, message: "Missing Household Name" });
      continue;
    }
    if (!row.reviewCycleName?.trim()) {
      errors.push({ row: rowNum, message: "Missing Review Cycle" });
      continue;
    }
    if (!row.milestoneName?.trim()) {
      errors.push({ row: rowNum, message: "Missing Milestone" });
      continue;
    }

    try {
      const cycleName = row.reviewCycleName.trim();

      let cycle = cycleCache.get(cycleName.toLowerCase());
      if (!cycle) {
        const dbCycle = await prisma.reviewCycle.findFirst({
          where: {
            advisorId,
            name: { equals: cycleName, mode: "insensitive" },
          },
          include: { milestones: { select: { id: true, title: true } } },
        });
        if (!dbCycle) {
          errors.push({ row: rowNum, message: `Review cycle "${cycleName}" not found` });
          continue;
        }
        cycle = { id: dbCycle.id, milestones: dbCycle.milestones };
        cycleCache.set(cycleName.toLowerCase(), cycle);
      }

      const milestoneName = row.milestoneName.trim();
      const milestone = cycle.milestones.find(
        (m) => m.title.toLowerCase() === milestoneName.toLowerCase()
      );
      if (!milestone) {
        errors.push({
          row: rowNum,
          message: `Milestone "${milestoneName}" not found in cycle "${cycleName}"`,
        });
        continue;
      }

      const client = await prisma.client.create({
        data: {
          name: row.householdName.trim(),
          reviewCycleId: cycle.id,
          currentMilestoneId: milestone.id,
          cycleYear: new Date().getFullYear(),
          advisorId,
        },
      });

      await initClientTasksForMilestone(client.id, milestone.id);
      created++;
    } catch {
      errors.push({ row: rowNum, message: "Unexpected error" });
    }
  }

  revalidatePath("/timeline");
  revalidatePath("/manage");
  return { created, errors };
}
