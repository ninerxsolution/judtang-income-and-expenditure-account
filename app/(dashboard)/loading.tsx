// import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        {/* <Skeleton className="h-8 w-8 rounded-full" aria-hidden /> */}
        <div className="flex flex-col gap-2 text-center">
          {/* <Skeleton className="h-4 w-32" /> */}
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </div>
    </div>
  );
}
