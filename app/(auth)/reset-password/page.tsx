/**
 * Reset password page — set new password using token from email link.
 */
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_LANGUAGE, translate, type Language } from "@/i18n";

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
    <div className="auth-page flex min-h-screen flex-col bg-[#F5F0E8] dark:bg-stone-950">
      <header className="sticky top-0 z-10 border-b border-[#D4C9B0] bg-[#FDFAF4]/95 backdrop-blur supports-backdrop-filter:bg-[#FDFAF4]/80 dark:border-stone-800 dark:bg-stone-950/95 dark:supports-backdrop-filter:bg-stone-950/80">
        <div className="mx-auto flex min-h-[68px] max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold text-[#3D3020] dark:text-stone-100"
          >
            <Image
              src="/judtang-logo-temp.png"
              alt="Judtang"
              width={36}
              height={36}
              className="rounded-full"
            />
            Judtang
          </Link>
          <span className="text-sm font-medium text-[#6B5E4E] dark:text-stone-400">
            {translate(lang, "auth.resetPassword.title")}
          </span>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="mb-6">
          <Image
            src="/judtang-logo-temp.png"
            alt="Judtang"
            width={56}
            height={56}
            className="mx-auto rounded-full"
          />
        </div>
        <Card className="w-full max-w-sm border-[#D4C9B0] bg-[#FDFAF4] dark:border-stone-800 dark:bg-stone-900">
          <CardHeader>
            <CardTitle className="text-xl text-[#3D3020] dark:text-stone-100">
              {translate(lang, "auth.resetPassword.title")}
            </CardTitle>
            {token ? (
              <CardDescription className="text-[#6B5E4E] dark:text-stone-400">
                {translate(lang, "auth.resetPassword.subtitle")}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            {token ? (
              <ResetPasswordForm token={token} />
            ) : (
              <div className="space-y-4">
                <p className="text-destructive text-sm">
                  {translate(lang, "auth.resetPassword.invalidOrExpiredToken")}
                </p>
                <p className="text-center text-sm text-[#6B5E4E] dark:text-stone-400">
                  <Link
                    href="/forgot-password"
                    className="font-medium text-[#3D3020] underline underline-offset-4 dark:text-stone-100"
                  >
                    {translate(lang, "auth.resetPassword.requestNewLink")}
                  </Link>
                  {" · "}
                  <Link
                    href="/sign-in"
                    className="font-medium text-[#3D3020] underline underline-offset-4 dark:text-stone-100"
                  >
                    {translate(lang, "auth.resetPassword.backToSignIn")}
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
