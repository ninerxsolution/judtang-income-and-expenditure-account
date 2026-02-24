/**
 * Sign-in page — form (Credentials + Google) and link to register.
 */
import { SignInForm } from "@/components/auth/sign-in-form";

type PageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password",
  Default: "Something went wrong. Please try again.",
};

export default async function SignInPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/dashboard";
  const rawError = params.error ?? null;
  const error = rawError ? (ERROR_MESSAGES[rawError] ?? ERROR_MESSAGES.Default) : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-6 text-xl font-semibold">Sign in</h1>
      <SignInForm callbackUrl={callbackUrl} error={error} />
    </div>
  );
}
