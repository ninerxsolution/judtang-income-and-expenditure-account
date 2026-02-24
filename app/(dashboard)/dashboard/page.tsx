/**
 * Dashboard home (placeholder for testing flow).
 * Protected by proxy — requires login. URL: /dashboard
 */
export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        You are logged in. This area is protected.
      </p>
    </div>
  );
}
