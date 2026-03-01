/**
 * Reset password page — set new password using token from email link.
 */
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_LANGUAGE, translate, type Language } from "@/i18n";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reset password | Judtang",
};

type PageProps = {
  searchParams: Promise<{ token?: string; lang?: Language }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token ?? null;
  const lang = (params.lang as Language | undefined) ?? DEFAULT_LANGUAGE;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {translate(lang, "auth.resetPassword.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="space-y-4">
              <p className="text-destructive text-sm">
                {translate(lang, "auth.resetPassword.invalidOrExpiredToken")}
              </p>
              <p className="text-center text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {translate(lang, "auth.resetPassword.requestNewLink")}
                </Link>
                {" · "}
                <Link
                  href="/sign-in"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {translate(lang, "auth.resetPassword.backToSignIn")}
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
