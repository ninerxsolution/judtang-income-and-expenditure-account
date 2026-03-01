"use client";

import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Something went wrong
      </h2>
      <p className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
