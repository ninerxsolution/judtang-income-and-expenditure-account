"use client";

import Turnstile from "react-turnstile";
import { useIsLocalhost } from "@/hooks/use-is-localhost";

type TurnstileCaptchaProps = {
  onTokenChange: (token: string | null) => void;
};

export function TurnstileCaptcha({ onTokenChange }: TurnstileCaptchaProps) {
  const sitekey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITEKEY;
  const isLocalhost = useIsLocalhost();
  if (!sitekey || isLocalhost) {
    return null;
  }

  return (
    <div className="mt-4 flex justify-center">
      <Turnstile
        sitekey={sitekey}
        theme="auto"
        onVerify={(token) => onTokenChange(token)}
        onExpire={() => onTokenChange(null)}
        onError={() => onTokenChange(null)}
      />
    </div>
  );
}
