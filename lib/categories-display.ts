/** Thai name -> English translation for default categories. Client-safe (no Prisma). */
export const DEFAULT_CATEGORY_TRANSLATIONS: Record<string, string> = {
  เงินเดือน: "Salary",
  อาหาร: "Food",
  ค่าขนส่ง: "Transport",
  ค่าที่พัก: "Rent",
  ค่าน้ำค่าไฟ: "Utilities",
  ค่าอินเทอร์เน็ต: "Internet",
  ช้อปปิ้ง: "Shopping",
  ค่าอื่นๆ: "Other",
};

/**
 * Returns the display name for a category based on locale.
 * Default categories are translated; custom categories use the stored name.
 * Client-safe (no Prisma).
 */
export function getCategoryDisplayName(
  name: string,
  locale: "th" | "en"
): string {
  if (!name) return "";
  if (locale === "en" && name in DEFAULT_CATEGORY_TRANSLATIONS) {
    return DEFAULT_CATEGORY_TRANSLATIONS[name] ?? name;
  }
  return name;
}
