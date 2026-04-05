import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      {/* Branding */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <img src="/logo-dark.svg" alt="Annua" className="h-16 w-auto dark:hidden" />
        <img src="/logo-white.svg" alt="Annua" className="h-16 w-auto hidden dark:block" />
        <p className="text-sm text-gray-500 dark:text-gray-400 tracking-wide max-w-xs">
          Every Client. Every Milestone. Always in View.
        </p>
      </div>

      {/* Clerk sign-in widget */}
      <SignIn />
    </main>
  );
}
