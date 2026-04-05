import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Annua</h1>
          <p className="text-sm text-gray-500 mt-1">Client milestone planning</p>
        </div>
        <SignIn />
      </div>
    </main>
  );
}
