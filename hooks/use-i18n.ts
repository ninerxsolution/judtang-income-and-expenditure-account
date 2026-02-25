import { useContext } from "react";
import { I18nContext } from "@/components/providers/i18n-provider";

export function useI18n() {
  return useContext(I18nContext);
}

