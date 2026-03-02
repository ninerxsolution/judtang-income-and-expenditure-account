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
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col justify-center space-y-6">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
              {translate(language, "home.hero.headline")}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              {translate(language, "home.hero.subheadline")}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                asChild
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Link href="/register">
                  {translate(language, "home.hero.primaryCta")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#engine">
                  {translate(language, "home.hero.secondaryCta")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
