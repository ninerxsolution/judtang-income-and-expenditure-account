"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
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
      setError("Invalid email or password");
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
          <p className="text-sm text-red-600 dark:text-red-400">{error ?? initialError}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-300 dark:border-zinc-600" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            or
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleGoogleClick}
        className="w-full rounded-md border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
      >
        Sign in with Google
      </button>
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          Create account
        </Link>
      </p>
    </div>
  );
}
