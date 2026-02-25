/**
 * Dashboard home (placeholder for testing flow).
 * Protected by proxy — requires login. URL: /dashboard
 */
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            You are logged in. This area is protected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Use the navigation above to access User profile, Sessions, Transactions, Tools, Calendar, and Activity Log.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
