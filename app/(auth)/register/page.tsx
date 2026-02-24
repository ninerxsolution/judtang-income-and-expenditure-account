/**
 * Register page — form to create an account (Credentials).
 */
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-6 text-xl font-semibold">Create account</h1>
      <RegisterForm />
    </div>
  );
}
