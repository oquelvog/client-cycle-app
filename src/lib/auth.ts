import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export async function getAdvisorId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function ensureUserExists(): Promise<string> {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");

  await prisma.user.upsert({
    where: { id: user.id },
    update: {},
    create: { id: user.id },
  });

  return user.id;
}
