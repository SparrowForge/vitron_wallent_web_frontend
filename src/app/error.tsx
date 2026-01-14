"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-(--background) px-6 text-(--foreground)">
          <div className="w-full max-w-md rounded-3xl border border-(--stroke) bg-(--basic-cta) p-6 text-center shadow-xl">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-(--paragraph)">
              Please try again. If the issue persists, refresh the page.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-full bg-(--brand) px-5 py-2 text-sm font-semibold text-(--background)"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-full border border-(--stroke) px-5 py-2 text-sm font-semibold text-(--foreground)"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
