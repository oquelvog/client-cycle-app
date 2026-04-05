import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ensureUserExists } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureUserExists();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top nav */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-6">
          <Link href="/timeline" className="text-lg font-bold text-gray-900 tracking-tight">
            Annua
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/timeline"
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Timeline
            </Link>
            <Link
              href="/manage"
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Manage
            </Link>
          </nav>
        </div>
        <UserButton />
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
