---
name: i18n-localization
description: i18n and localization for Judtang — adding translation keys, using useI18n in client components, using translate() in server code, Thai/English language support, and year display. Use when adding new UI text, building new pages or components, translating strings, or working with language-specific display logic.
---

# i18n & Localization

The app supports **Thai (th)** and **English (en)**. Default language is **Thai**.

## How it works

| Context | Tool | Import |
|---------|------|--------|
| Client component | `useI18n()` hook | `@/hooks/use-i18n` |
| Server component / API | `translate(language, key)` | `@/i18n` |
| Dictionary files | `en.ts` / `th.ts` | `@/i18n/dictionaries/` |

## Client component usage

```tsx
import { useI18n } from "@/hooks/use-i18n"

function MyComponent() {
  const { t, language } = useI18n()
  return <p>{t("someSection.someKey")}</p>
}
```

`t(key, params?)` — translates a key with optional interpolation: `t("greeting", { name: "Anna" })`  
`language` — current language (`"th"` | `"en"`)

## Server component / API usage

```ts
import { translate } from "@/i18n"
import type { Language } from "@/i18n"

const text = translate(language, "someSection.someKey")
// With params:
const text2 = translate(language, "items.count", { count: 5 })
```

## Adding a new translation key

1. Add the key to `i18n/dictionaries/th.ts` (Thai text)
2. Add the **same key** to `i18n/dictionaries/en.ts` (English text)
3. Keys are dot-notation paths reflecting the nested object structure

```ts
// th.ts
export const thDictionary = {
  myFeature: {
    title: "ชื่อฟีเจอร์",
    saveButton: "บันทึก",
    errorMessage: "เกิดข้อผิดพลาด: {detail}",
  },
}

// en.ts
export const enDictionary = {
  myFeature: {
    title: "Feature Name",
    saveButton: "Save",
    errorMessage: "Error: {detail}",
  },
}
```

- If a key is missing, `translate()` returns the key string itself (visible in dev as a bug signal)
- Interpolation: use `{paramName}` in the string, pass `{ paramName: value }` as params

## Language detection

Language is stored in a cookie and resolved by the layout. The `I18nProvider` wraps the dashboard and provides the context consumed by `useI18n()`.

Getting language in a server component:
```ts
import { getLanguage } from "@/lib/language" // or similar utility
```

## Year display (พ.ศ. / ค.ศ.)

When rendering a year in the UI:
```ts
import { formatYearForDisplay } from "@/lib/format-year"

// Thai: Gregorian + 543, English: Gregorian as-is
formatYearForDisplay(2025, "th") // → "2568"
formatYearForDisplay(2025, "en") // → "2025"
```

Never store or send Buddhist year to API — only convert at display time.

## Key files

| File | Purpose |
|------|---------|
| `i18n/config.ts` | `SUPPORTED_LANGUAGES`, `DEFAULT_LANGUAGE` (`"th"`) |
| `i18n/index.ts` | `translate()`, `getDictionary()` |
| `i18n/dictionaries/th.ts` | Thai strings |
| `i18n/dictionaries/en.ts` | English strings |
| `hooks/use-i18n.ts` | `useI18n()` hook for client components |
| `lib/format-year.ts` | `formatYearForDisplay()` |
| `components/providers/i18n-provider.tsx` | Context provider |

## Checklist when adding UI text

- [ ] Added key to **both** `th.ts` and `en.ts`
- [ ] Used `useI18n()` in client components (not hardcoded strings)
- [ ] Used `translate(language, key)` in server components / API error messages
- [ ] Year display uses `formatYearForDisplay()` — not raw Gregorian year
