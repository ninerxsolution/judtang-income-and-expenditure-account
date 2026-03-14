export type ConsentData = {
  necessary: true;
  analytics: boolean;
  timestamp: number;
};

const CONSENT_KEY = "judtang_consent";

export function getStoredConsent(): ConsentData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      typeof parsed.analytics === "boolean"
    ) {
      return parsed as ConsentData;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveConsent(analytics: boolean): ConsentData {
  const data: ConsentData = {
    necessary: true,
    analytics,
    timestamp: Date.now(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
  return data;
}

export function clearConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
}
