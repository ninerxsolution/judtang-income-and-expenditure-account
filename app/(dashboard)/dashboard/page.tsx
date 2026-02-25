"use client";

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
import { useI18n } from "@/hooks/use-i18n";

export default function DashboardPage() {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.pageTitle.dashboard")}</CardTitle>
        <CardDescription>
          {t("dashboard.home.subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          {t("dashboard.home.body")}
        </p>
      </CardContent>
    </Card>
  );
}
