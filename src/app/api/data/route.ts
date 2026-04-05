import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { seedNewAdvisor } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Upsert user record and check onboarding status
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, onboarded: false },
    });

    // First-login onboarding: seed example data automatically
    if (!user.onboarded) {
      await seedNewAdvisor(userId);
    }

    const [reviewCycles, clients] = await Promise.all([
      prisma.reviewCycle.findMany({
        where: { advisorId: userId },
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
      }),
      prisma.client.findMany({
        where: { advisorId: userId },
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
      }),
    ]);

    return NextResponse.json({ reviewCycles, clients });
  } catch (err) {
    console.error("[/api/data]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
