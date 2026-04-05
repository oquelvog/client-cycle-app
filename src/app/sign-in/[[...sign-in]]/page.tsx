import { SignIn } from "@clerk/nextjs";
import { AnnuaLogo } from "@/components/AnnuaLogo";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      {/* Branding */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <AnnuaLogo iconSize="w-12 h-12" textSize="text-4xl" />
        <p className="text-sm text-gray-500 dark:text-gray-400 tracking-wide max-w-xs">
          Every Client. Every Milestone. Always in View.
        </p>
      </div>

      {/* Clerk sign-in widget */}
      <SignIn />
    </main>
  );
}
