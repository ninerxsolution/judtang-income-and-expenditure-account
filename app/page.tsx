/**
 * Home (public). Overview of the project and entry points.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_LANGUAGE, translate, type Language } from "@/i18n";

export const metadata: Metadata = {
  title: "Home | Judtang",
};

type PageProps = {
  searchParams: Promise<{ lang?: Language }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const lang = (params.lang as Language | undefined) ?? DEFAULT_LANGUAGE;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            {translate(lang, "home.title")}
          </CardTitle>
          <CardDescription>
            {translate(lang, "home.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {translate(lang, "home.body")}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild>
              <Link href="/sign-in">{translate(lang, "home.signInCta")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                {translate(lang, "home.dashboardCta")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
