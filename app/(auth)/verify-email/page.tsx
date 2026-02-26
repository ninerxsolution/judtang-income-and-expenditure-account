/**
 * Verify email page — user clicks link from email to verify address.
 */
import type { Metadata } from "next";
import { VerifyEmailHandler } from "@/components/auth/verify-email-handler";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_LANGUAGE, translate, type Language } from "@/i18n";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Verify email | Judtang",
};

type PageProps = {
  searchParams: Promise<{ token?: string; lang?: Language }>;
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token ?? null;
  const lang = (params.lang as Language | undefined) ?? DEFAULT_LANGUAGE;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {translate(lang, "auth.verifyEmail.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {token ? (
            <VerifyEmailHandler token={token} />
          ) : (
            <div className="space-y-4">
              <p className="text-destructive text-sm">
                {translate(lang, "auth.verifyEmail.invalidOrExpired")}
              </p>
              <p className="text-center text-sm">
                <Link
                  href="/sign-in"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {translate(lang, "auth.verifyEmail.backToSignIn")}
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
