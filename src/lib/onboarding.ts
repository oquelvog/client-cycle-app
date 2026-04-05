import { prisma } from "./prisma";

/**
 * Seeds four pre-loaded Touchpoint Cycles for a brand-new advisor account.
 * Called once on first login via /api/data when user.onboarded === false.
 */
export async function seedNewAdvisor(userId: string) {
  // Quarter date ranges (day-of-year)
  const Q1 = { dayOfYear: 1,   endDayOfYear: 90,  durationType: "quarter" as const };
  const Q2 = { dayOfYear: 91,  endDayOfYear: 181, durationType: "quarter" as const };
  const Q3 = { dayOfYear: 182, endDayOfYear: 273, durationType: "quarter" as const };
  const Q4 = { dayOfYear: 274, endDayOfYear: 365, durationType: "quarter" as const };

  // ── Cycle 1: Annual Review ─────────────────────────────────────────────────
  const cycle1 = await prisma.reviewCycle.create({
    data: { name: "Annual Review", advisorId: userId },
  });

  const c1m1 = await prisma.milestone.create({
    data: { reviewCycleId: cycle1.id, title: "Annual Review Meeting", color: "#6366f1", order: 0, ...Q4 },
  });
  const c1ci1 = await prisma.checkIn.create({
    data: { milestoneId: c1m1.id, title: c1m1.title, dayOfYear: Q4.dayOfYear },
  });
  const c1tasks = await Promise.all([
    "Send pre-meeting agenda",
    "Review investment policy statement",
    "Rebalance portfolio",
    "Review tax planning opportunities",
    "Update goals and priorities",
    "Hold annual review meeting",
    "Send follow-up summary",
  ].map((title) => prisma.task.create({ data: { checkInId: c1ci1.id, title } })));

  // Johnson Family → Q4 (only milestone)
  const johnson = await prisma.client.create({
    data: {
      advisorId: userId,
      reviewCycleId: cycle1.id,
      currentMilestoneId: c1m1.id,
      cycleYear: 2026,
      name: "The Johnson Family",
      color: "#6366f1",
    },
  });
  for (const t of c1tasks) {
    await prisma.clientTask.create({ data: { clientId: johnson.id, taskId: t.id, status: "pending" } });
  }

  // ── Cycle 2: Semi-Annual Review ────────────────────────────────────────────
  const cycle2 = await prisma.reviewCycle.create({
    data: { name: "Semi-Annual Review", advisorId: userId },
  });

  const c2m1 = await prisma.milestone.create({
    data: { reviewCycleId: cycle2.id, title: "Spring Review Meeting", color: "#22c55e", order: 0, ...Q2 },
  });
  const c2m2 = await prisma.milestone.create({
    data: { reviewCycleId: cycle2.id, title: "Fall Review Meeting", color: "#22c55e", order: 1, ...Q4 },
  });
  const c2ci1 = await prisma.checkIn.create({
    data: { milestoneId: c2m1.id, title: c2m1.title, dayOfYear: Q2.dayOfYear },
  });
  const c2ci2 = await prisma.checkIn.create({
    data: { milestoneId: c2m2.id, title: c2m2.title, dayOfYear: Q4.dayOfYear },
  });
  const c2m1tasks = await Promise.all([
    "Send pre-meeting agenda",
    "Review portfolio performance",
    "Mid-year tax planning check",
    "Hold spring meeting",
    "Send follow-up summary",
  ].map((title) => prisma.task.create({ data: { checkInId: c2ci1.id, title } })));
  const c2m2tasks = await Promise.all([
    "Send pre-meeting agenda",
    "Review investment policy statement",
    "Rebalance portfolio",
    "Year-end tax planning",
    "Hold fall meeting",
    "Send follow-up summary",
  ].map((title) => prisma.task.create({ data: { checkInId: c2ci2.id, title } })));

  // Martinez Family → Q2 (currently active milestone)
  const martinez = await prisma.client.create({
    data: {
      advisorId: userId,
      reviewCycleId: cycle2.id,
      currentMilestoneId: c2m1.id,
      cycleYear: 2026,
      name: "The Martinez Family",
      color: "#22c55e",
    },
  });
  for (const t of [...c2m1tasks, ...c2m2tasks]) {
    await prisma.clientTask.create({ data: { clientId: martinez.id, taskId: t.id, status: "pending" } });
  }

  // ── Cycle 3: Tri-Annual Review ─────────────────────────────────────────────
  const cycle3 = await prisma.reviewCycle.create({
    data: { name: "Tri-Annual Review", advisorId: userId },
  });

  const c3m1 = await prisma.milestone.create({
    data: { reviewCycleId: cycle3.id, title: "Winter Check-In", color: "#f97316", order: 0, ...Q1 },
  });
  const c3m2 = await prisma.milestone.create({
    data: { reviewCycleId: cycle3.id, title: "Mid-Year Review", color: "#f97316", order: 1, ...Q2 },
  });
  const c3m3 = await prisma.milestone.create({
    data: { reviewCycleId: cycle3.id, title: "Year-End Planning", color: "#f97316", order: 2, ...Q4 },
  });
  const c3ci1 = await prisma.checkIn.create({
    data: { milestoneId: c3m1.id, title: c3m1.title, dayOfYear: Q1.dayOfYear },
  });
  const c3ci2 = await prisma.checkIn.create({
    data: { milestoneId: c3m2.id, title: c3m2.title, dayOfYear: Q2.dayOfYear },
  });
  const c3ci3 = await prisma.checkIn.create({
    data: { milestoneId: c3m3.id, title: c3m3.title, dayOfYear: Q4.dayOfYear },
  });
  const c3m1tasks = await Promise.all([
    "Send check-in email",
    "Review January tax documents",
    "Confirm investment allocations",
  ].map((title) => prisma.task.create({ data: { checkInId: c3ci1.id, title } })));
  const c3m2tasks = await Promise.all([
    "Send pre-meeting agenda",
    "Mid-year tax planning check",
    "Portfolio performance review",
    "Hold mid-year meeting",
    "Send follow-up summary",
  ].map((title) => prisma.task.create({ data: { checkInId: c3ci2.id, title } })));
  const c3m3tasks = await Promise.all([
    "Review investment policy statement",
    "Rebalance portfolio",
    "Year-end tax moves",
    "Hold year-end meeting",
    "Send follow-up summary",
  ].map((title) => prisma.task.create({ data: { checkInId: c3ci3.id, title } })));

  // Anderson Family → Q2 (Q1 is past, Q2 is currently active)
  const anderson = await prisma.client.create({
    data: {
      advisorId: userId,
      reviewCycleId: cycle3.id,
      currentMilestoneId: c3m2.id,
      cycleYear: 2026,
      name: "The Anderson Family",
      color: "#f97316",
    },
  });
  for (const t of [...c3m1tasks, ...c3m2tasks, ...c3m3tasks]) {
    await prisma.clientTask.create({ data: { clientId: anderson.id, taskId: t.id, status: "pending" } });
  }

  // ── Cycle 4: Quarterly Review ──────────────────────────────────────────────
  const cycle4 = await prisma.reviewCycle.create({
    data: { name: "Quarterly Review", advisorId: userId },
  });

  const c4m1 = await prisma.milestone.create({
    data: { reviewCycleId: cycle4.id, title: "Q1 Review Meeting", color: "#8b5cf6", order: 0, ...Q1 },
  });
  const c4m2 = await prisma.milestone.create({
    data: { reviewCycleId: cycle4.id, title: "Q2 Review Meeting", color: "#8b5cf6", order: 1, ...Q2 },
  });
  const c4m3 = await prisma.milestone.create({
    data: { reviewCycleId: cycle4.id, title: "Q3 Review Meeting", color: "#8b5cf6", order: 2, ...Q3 },
  });
  const c4m4 = await prisma.milestone.create({
    data: { reviewCycleId: cycle4.id, title: "Q4 Review Meeting", color: "#8b5cf6", order: 3, ...Q4 },
  });
  const c4ci1 = await prisma.checkIn.create({
    data: { milestoneId: c4m1.id, title: c4m1.title, dayOfYear: Q1.dayOfYear },
  });
  const c4ci2 = await prisma.checkIn.create({
    data: { milestoneId: c4m2.id, title: c4m2.title, dayOfYear: Q2.dayOfYear },
  });
  const c4ci3 = await prisma.checkIn.create({
    data: { milestoneId: c4m3.id, title: c4m3.title, dayOfYear: Q3.dayOfYear },
  });
  const c4ci4 = await prisma.checkIn.create({
    data: { milestoneId: c4m4.id, title: c4m4.title, dayOfYear: Q4.dayOfYear },
  });
  const c4m1tasks = await Promise.all([
    "Send pre-meeting agenda",
    "Review portfolio performance",
    "Quarterly tax check",
    "Hold Q1 meeting",
    "Send follow-up summary",
  ].map((title) => prisma.task.create({ data: { checkInId: c4ci1.id, title } })));
  const c4m2tasks = await Promise.all([
    "Send pre-meeting agenda",
    "Review portfolio performance",
    "Quarterly tax check",
    "Hold Q2 meeting",
    "Send follow-up summary",
  ].map((title) => prisma.task.create({ data: { checkInId: c4ci2.id, title } })));
  const c4m3tasks = await Promise.all([
    "Send pre-meeting agenda",
    "Review portfolio performance",
    "Quarterly tax check",
    "Hold Q3 meeting",
    "Send follow-up summary",
  ].map((title) => prisma.task.create({ data: { checkInId: c4ci3.id, title } })));
  const c4m4tasks = await Promise.all([
    "Send pre-meeting agenda",
    "Review investment policy statement",
    "Rebalance portfolio",
    "Year-end tax planning",
    "Hold Q4 meeting",
    "Send follow-up summary",
  ].map((title) => prisma.task.create({ data: { checkInId: c4ci4.id, title } })));

  // Williams Family → Q2 (Q1 is past, Q2 is currently active)
  const williams = await prisma.client.create({
    data: {
      advisorId: userId,
      reviewCycleId: cycle4.id,
      currentMilestoneId: c4m2.id,
      cycleYear: 2026,
      name: "The Williams Family",
      color: "#8b5cf6",
    },
  });
  for (const t of [...c4m1tasks, ...c4m2tasks, ...c4m3tasks, ...c4m4tasks]) {
    await prisma.clientTask.create({ data: { clientId: williams.id, taskId: t.id, status: "pending" } });
  }

  // Mark user as onboarded
  await prisma.user.update({
    where: { id: userId },
    data: { onboarded: true },
  });
}
