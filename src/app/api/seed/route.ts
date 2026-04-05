import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Day-of-year constants (non-leap year)
// Jan 15 = 15, Apr 1 = 91, Apr 30 = 120
// Jul 1 = 182, Sep 30 = 273, Nov 15 = 319

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ensure user record exists
    await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId } });

    // ── Review Cycle ──────────────────────────────────────────────────────────
    const cycle = await prisma.reviewCycle.create({
      data: { name: "Semi-Annual Meeting Cycle", advisorId: userId },
    });

    // ── Milestones + CheckIns + Tasks ─────────────────────────────────────────

    // 1. Goals and Tax Prep — Jan 15 (specific_date)
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

    // 2. Spring Review — Apr 1–30 (month)
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

    // 3. Mid-Year Check-In — Jul 1–Sep 30 (quarter)
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

    // 4. Year-End Planning — Nov 15 (specific_date)
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

    // ── Clients ───────────────────────────────────────────────────────────────

    // 1. Anderson Family — Spring Review, 2026, 2 tasks complete
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
    // Init all Spring Review tasks as pending first
    for (const task of m2tasks) {
      await prisma.clientTask.create({ data: { clientId: anderson.id, taskId: task.id, status: "pending" } });
    }
    // Mark first 2 complete
    await prisma.clientTask.update({
      where: { clientId_taskId: { clientId: anderson.id, taskId: m2tasks[0].id } },
      data: { status: "completed", completedAt: new Date() },
    });
    await prisma.clientTask.update({
      where: { clientId_taskId: { clientId: anderson.id, taskId: m2tasks[1].id } },
      data: { status: "completed", completedAt: new Date() },
    });

    // 2. David Wilson — Goals and Tax Prep, 2025 (lagging — amber badge)
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
      await prisma.clientTask.create({ data: { clientId: wilson.id, taskId: task.id, status: "pending" } });
    }

    // 3. Martinez Family — Year-End Planning, 2026, no tasks complete
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
      await prisma.clientTask.create({ data: { clientId: martinez.id, taskId: task.id, status: "pending" } });
    }

    return NextResponse.json({
      ok: true,
      cycle: cycle.name,
      milestones: ["Goals and Tax Prep", "Spring Review", "Mid-Year Check-In", "Year-End Planning"],
      clients: [
        { name: anderson.name, milestone: "Spring Review", tasksComplete: 2, cycleYear: 2026 },
        { name: wilson.name, milestone: "Goals and Tax Prep", tasksComplete: 0, cycleYear: 2025 },
        { name: martinez.name, milestone: "Year-End Planning", tasksComplete: 0, cycleYear: 2026 },
      ],
    });
  } catch (err) {
    console.error("[/api/seed]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
