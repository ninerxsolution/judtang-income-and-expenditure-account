export default function DashboardLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100"
          aria-hidden
        />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    </div>
  );
}
