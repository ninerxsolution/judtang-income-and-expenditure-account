"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";
import { FormField } from "./form-field";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      const msg = "Password must be at least 8 characters.";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (password !== confirmPassword) {
      const msg = "Passwords do not match.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? "Registration failed";
        setError(msg);
        toast.error(msg);
        setPending(false);
        return;
      }
      toast.success("Account created. Please sign in.");
      router.push("/sign-in");
      return;
    } catch {
      const msg = "Registration failed";
      setError(msg);
      toast.error(msg);
    }
    setPending(false);
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          id="register-email"
          label="Email"
          type="email"
          required
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <FormField
          id="register-password"
          label="Password"
          type="password"
          required
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <FormField
          id="register-confirm-password"
          label="Confirm password"
          type="password"
          required
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        <FormField
          id="register-name"
          label="Name (optional)"
          type="text"
          value={name}
          onChange={setName}
          autoComplete="name"
        />
        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="text-center text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
