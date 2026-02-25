/**
 * Home (public). Placeholder for testing flow — link to sign-in and dashboard.
 */
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Judtang Income and Expenditure Account</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Sign in to access your dashboard.
      </p>
      <div className="flex gap-4">
        <Link
          href="/sign-in"
          className="rounded-md bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Sign in
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-300 px-4 py-2 hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          Dashboard (protected)
        </Link>
      </div>
    </div>
  );
}
