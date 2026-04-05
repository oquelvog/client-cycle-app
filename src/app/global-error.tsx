"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="max-w-xl w-full bg-white rounded-xl border border-red-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-red-700 mb-2">
            Something went wrong
          </h2>
          {error.digest && (
            <p className="text-xs text-gray-400 mb-3">Digest: {error.digest}</p>
          )}
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-auto whitespace-pre-wrap break-all text-gray-700 mb-4">
            {error.message || String(error)}
          </pre>
          <button
            onClick={reset}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
