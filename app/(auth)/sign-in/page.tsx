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

type PageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password",
  Default: "Something went wrong. Please try again.",
};

export const metadata: Metadata = {
  title: "Sign in | Judtang",
};

export default async function SignInPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/dashboard";
  const rawError = params.error ?? null;
  const error = rawError ? (ERROR_MESSAGES[rawError] ?? ERROR_MESSAGES.Default) : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <SignInForm callbackUrl={callbackUrl} error={error} />
        </CardContent>
      </Card>
    </div>
  );
}
