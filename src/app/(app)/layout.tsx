import { AppHeader } from "@/components/AppHeader";
import { ensureUserExists } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await ensureUserExists();
  } catch {
    // Not authenticated — middleware will redirect.
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
