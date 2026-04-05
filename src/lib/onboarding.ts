import { prisma } from "./prisma";

/**
 * Seeds example data for a brand-new advisor account.
 * Called once on first login. Safe to call multiple times — the caller
 * must check user.onboarded before calling.
 */
export async function seedNewAdvisor(userId: string) {
  // Review cycle
  const cycle = await prisma.reviewCycle.create({
    data: { name: "Semi-Annual Meeting Cycle", advisorId: userId },
  });

  // ── Milestones ──────────────────────────────────────────────────────────────
  // Jan 15 = day 15 | Apr 1 = day 91, Apr 30 = day 120
  // Jul 1  = day 182, Sep 30 = day 273 | Nov 15 = day 319

  const m1 = await prisma.milestone.create({
    data: {
      reviewCycleId: cycle.id,
      title: "Goals and Tax Prep",
      dayOfYear: 15,
      endDayOfYear: 15,
      durationType: "specific_date",
      color: "#6366f1",
      order: 0,
    },
  });
  const ci1 = await prisma.checkIn.create({
    data: { milestoneId: m1.id, title: "Tax Prep Tasks", dayOfYear: 15 },
  });
  const m1tasks = await Promise.all([
    prisma.task.create({ data: { checkInId: ci1.id, title: "Send annual survey" } }),
    prisma.task.create({ data: { checkInId: ci1.id, title: "Request updated pay stubs" } }),
    prisma.task.create({ data: { checkInId: ci1.id, title: "Send tax document checklist" } }),
    prisma.task.create({ data: { checkInId: ci1.id, title: "Schedule planning meeting" } }),
  ]);

  const m2 = await prisma.milestone.create({
    data: {
      reviewCycleId: cycle.id,
      title: "Spring Review",
      dayOfYear: 91,
      endDayOfYear: 120,
      durationType: "month",
      color: "#22c55e",
      order: 1,
    },
  });
  const ci2 = await prisma.checkIn.create({
    data: { milestoneId: m2.id, title: "Spring Review Tasks", dayOfYear: 91 },
  });
  const m2tasks = await Promise.all([
    prisma.task.create({ data: { checkInId: ci2.id, title: "Review investment allocation" } }),
    prisma.task.create({ data: { checkInId: ci2.id, title: "Update risk profile" } }),
    prisma.task.create({ data: { checkInId: ci2.id, title: "Review insurance coverage" } }),
    prisma.task.create({ data: { checkInId: ci2.id, title: "Confirm beneficiary designations" } }),
    prisma.task.create({ data: { checkInId: ci2.id, title: "Hold planning meeting" } }),
  ]);

  const m3 = await prisma.milestone.create({
    data: {
      reviewCycleId: cycle.id,
      title: "Mid-Year Check-In",
      dayOfYear: 182,
      endDayOfYear: 273,
      durationType: "quarter",
      color: "#f97316",
      order: 2,
    },
  });
  const ci3 = await prisma.checkIn.create({
    data: { milestoneId: m3.id, title: "Mid-Year Tasks", dayOfYear: 182 },
  });
  await Promise.all([
    prisma.task.create({ data: { checkInId: ci3.id, title: "Review progress toward goals" } }),
    prisma.task.create({ data: { checkInId: ci3.id, title: "Check tax withholding" } }),
    prisma.task.create({ data: { checkInId: ci3.id, title: "Review estate documents" } }),
    prisma.task.create({ data: { checkInId: ci3.id, title: "Send check-in email" } }),
  ]);

  const m4 = await prisma.milestone.create({
    data: {
      reviewCycleId: cycle.id,
      title: "Year-End Planning",
      dayOfYear: 319,
      endDayOfYear: 319,
      durationType: "specific_date",
      color: "#8b5cf6",
      order: 3,
    },
  });
  const ci4 = await prisma.checkIn.create({
    data: { milestoneId: m4.id, title: "Year-End Tasks", dayOfYear: 319 },
  });
  const m4tasks = await Promise.all([
    prisma.task.create({ data: { checkInId: ci4.id, title: "Review tax loss harvesting opportunities" } }),
    prisma.task.create({ data: { checkInId: ci4.id, title: "Max out retirement contributions" } }),
    prisma.task.create({ data: { checkInId: ci4.id, title: "Update financial plan" } }),
    prisma.task.create({ data: { checkInId: ci4.id, title: "Schedule year-end meeting" } }),
  ]);

  // ── Sample households ───────────────────────────────────────────────────────

  // Anderson Family — Spring Review, 2026, 2/5 tasks complete
  const anderson = await prisma.client.create({
    data: {
      name: "Anderson Family",
      color: "#22c55e",
      reviewCycleId: cycle.id,
      currentMilestoneId: m2.id,
      cycleYear: 2026,
      advisorId: userId,
    },
  });
  for (const task of m2tasks) {
    await prisma.clientTask.create({
      data: { clientId: anderson.id, taskId: task.id, status: "pending" },
    });
  }
  await prisma.clientTask.updateMany({
    where: { clientId: anderson.id, taskId: { in: [m2tasks[0].id, m2tasks[1].id] } },
    data: { status: "completed", completedAt: new Date() },
  });

  // David Wilson — Goals and Tax Prep, 2025 (lagging — amber year badge)
  const wilson = await prisma.client.create({
    data: {
      name: "David Wilson",
      color: "#f97316",
      reviewCycleId: cycle.id,
      currentMilestoneId: m1.id,
      cycleYear: 2025,
      advisorId: userId,
    },
  });
  for (const task of m1tasks) {
    await prisma.clientTask.create({
      data: { clientId: wilson.id, taskId: task.id, status: "pending" },
    });
  }

  // Martinez Family — Year-End Planning, 2026, 0 tasks complete
  const martinez = await prisma.client.create({
    data: {
      name: "Martinez Family",
      color: "#8b5cf6",
      reviewCycleId: cycle.id,
      currentMilestoneId: m4.id,
      cycleYear: 2026,
      advisorId: userId,
    },
  });
  for (const task of m4tasks) {
    await prisma.clientTask.create({
      data: { clientId: martinez.id, taskId: task.id, status: "pending" },
    });
  }

  // Mark user as onboarded
  await prisma.user.update({
    where: { id: userId },
    data: { onboarded: true },
  });
}
