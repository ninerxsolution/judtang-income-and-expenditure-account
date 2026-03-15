export type LocalizedString = { th: string; en: string };

export type Announcement = {
  id: string;
  title: LocalizedString | string;
  content?: LocalizedString | string;
  image: string;
  image_alt?: LocalizedString | string;
  start_at: string;
  end_at: string;
  show_once: boolean;
  dismissible: boolean;
  action_url?: string;
  action_label?: LocalizedString | string;
};

export function resolveLocalized(
  value: LocalizedString | string | undefined,
  lang: "th" | "en"
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[lang] ?? value.en ?? value.th ?? "";
}
