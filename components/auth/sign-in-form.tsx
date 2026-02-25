"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FormField } from "./form-field";

type SignInFormProps = {
  callbackUrl?: string;
  error?: string | null;
};

export function SignInForm({ callbackUrl = "/dashboard", error: initialError }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, setPending] = useState(false);

  async function handleCredentialsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: true,
    });
    setPending(false);
    if (result?.error) {
      const message = "Invalid email or password";
      setError(message);
      toast.error(message);
      return;
    }
  }

  function handleGoogleClick() {
    signIn("google", { callbackUrl });
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <form onSubmit={handleCredentialsSubmit} className="space-y-4">
        <FormField
          id="signin-email"
          label="Email"
          type="email"
          required
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <FormField
          id="signin-password"
          label="Password"
          type="password"
          required
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        {(error ?? initialError) && (
          <p className="text-destructive text-sm">{error ?? initialError}</p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="relative flex items-center gap-2">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">or</span>
        <Separator className="flex-1" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleClick}
      >
        Sign in with Google
      </Button>
      <p className="text-center text-muted-foreground text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary underline underline-offset-4">
          Create account
        </Link>
      </p>
    </div>
  );
}
