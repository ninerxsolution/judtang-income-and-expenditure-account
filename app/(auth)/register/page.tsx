/**
 * Register page — form to create an account (Credentials).
 */
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_LANGUAGE, translate, type Language } from "@/i18n";

export const metadata: Metadata = {
  title: "Register | Judtang",
};

type PageProps = {
  searchParams: Promise<{ lang?: Language }>;
};

export default async function RegisterPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const lang = (params.lang as Language | undefined) ?? DEFAULT_LANGUAGE;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {translate(lang, "auth.register.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
