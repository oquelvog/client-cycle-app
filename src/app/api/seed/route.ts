import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { seedNewAdvisor } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

// Manual seed endpoint — only runs if the account has no review cycles yet.
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.reviewCycle.count({ where: { advisorId: userId } });
    if (existing > 0) {
      return NextResponse.json({ error: "Account already has data. Clear it first." }, { status: 409 });
    }

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, onboarded: false },
    });

    await seedNewAdvisor(userId);
    return NextResponse.json({ ok: true, message: "Example data seeded." });
  } catch (err) {
    console.error("[/api/seed]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
