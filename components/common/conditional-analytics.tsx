"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useConsent } from "@/components/providers/consent-provider";

export function ConditionalAnalytics() {
  const { consent, hasDecided, mounted } = useConsent();

  if (!mounted || !hasDecided || !consent?.analytics) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
