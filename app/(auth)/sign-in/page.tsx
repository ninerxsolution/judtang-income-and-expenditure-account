/**
 * Sign-in page — form (Credentials + Google) and link to register.
 */
import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_LANGUAGE, translate, type Language } from "@/i18n";

type PageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string; lang?: Language }>;
};

const ERROR_MESSAGES: Record<string, keyof typeof errorKeys> = {
  CredentialsSignin: "credentials",
  Default: "default",
};

const errorKeys = {
  credentials: "auth.signIn.invalidCredentials",
  default: "auth.signIn.genericError",
} as const;

export const metadata: Metadata = {
  title: "Sign in | Judtang",
};

export default async function SignInPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/dashboard";
  const rawError = params.error ?? null;
  const lang = (params.lang as Language | undefined) ?? DEFAULT_LANGUAGE;

  const errorKey = rawError ? ERROR_MESSAGES[rawError] ?? ERROR_MESSAGES.Default : null;
  const error = errorKey ? translate(lang, errorKeys[errorKey]) : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {translate(lang, "auth.signIn.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SignInForm callbackUrl={callbackUrl} error={error} />
        </CardContent>
      </Card>
    </div>
  );
}
