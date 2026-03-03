"use client";

import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { translate, type Language } from "@/i18n";

type LandingHeroProps = {
  language: Language;
};

export function LandingHero({ language }: LandingHeroProps) {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:gap-16">
          <div className="flex flex-col align-center justify-center text-center space-y-6">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#3D3020] dark:text-stone-100 sm:text-5xl">
              {translate(language, "home.hero.headline")}
            </h1>
            <p className="text-lg leading-relaxed text-[#6B5E4E] dark:text-stone-400">
              {translate(language, "home.hero.subheadline")}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-[#5C6B52] hover:bg-[#4A5E40] text-white"
              >
                <Link href="/register">
                  {translate(language, "home.hero.primaryCta")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
