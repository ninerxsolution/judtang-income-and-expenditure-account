/** Thai name -> English translation for default categories. Client-safe (no Prisma). */
export const DEFAULT_CATEGORY_TRANSLATIONS: Record<string, string> = {
  เงินเดือน: "Salary",
  อาหาร: "Food",
  ค่าที่พัก: "Rent",
  ค่าน้ำค่าไฟ: "Utilities",
  ค่าอินเทอร์เน็ต: "Internet",
  ค่าสมัครสมาชิก: "Subscription",
  ช้อปปิ้ง: "Shopping",
  อื่นๆ: "Other",
};

/**
 * Returns the display name for a category based on locale.
 * Default categories use DEFAULT_CATEGORY_TRANSLATIONS; custom categories use nameEn when locale is "en" and nameEn is set.
 * Client-safe (no Prisma).
 */
export function getCategoryDisplayName(
  name: string,
  locale: "th" | "en",
  nameEn?: string | null
): string {
  if (!name) return "";
  if (locale === "en") {
    if (nameEn?.trim()) return nameEn.trim();
    if (name in DEFAULT_CATEGORY_TRANSLATIONS) {
      return DEFAULT_CATEGORY_TRANSLATIONS[name] ?? name;
    }
  }
  return name;
}
