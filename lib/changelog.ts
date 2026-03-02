/**
 * Changelog parser for CHANGELOG.md / CHANGELOG.th.md (release notes / patch note page).
 * Single source of truth per language. Parsed at build time in Server Components.
 * @see docs (PRD: Release Notes Page)
 */

import { readFile } from "fs/promises";
import path from "path";
import type { Language } from "@/i18n";

export type ChangelogSection = {
  title: string;
  body: string;
};

export type ChangelogVersion = {
  version: string;
  releaseDate: string;
  sections: ChangelogSection[];
};

const VERSION_HEADER = /^# v(\d+\.\d+\.\d+)\s*-\s*(.+)$/gm;
const SECTION_HEADER = /^## (\w+)\s*$/gm;

function parseSections(body: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  const matches = [...body.matchAll(SECTION_HEADER)];
  for (let i = 0; i < matches.length; i++) {
    const sectionStart = matches[i].index! + matches[i][0].length;
    const sectionEnd = i < matches.length - 1 ? matches[i + 1].index! : body.length;
    const sectionBody = body.slice(sectionStart, sectionEnd).trim();
    if (sectionBody) {
      sections.push({ title: matches[i][1], body: sectionBody });
    }
  }
  return sections;
}

/**
 * Parses raw CHANGELOG.md content into structured version blocks.
 * Version line format: # vMAJOR.MINOR.PATCH - release date
 * Section format: ## Added | Changed | Fixed | Removed | Breaking | Migration
 */
export function parseChangelog(content: string): ChangelogVersion[] {
  const versions: ChangelogVersion[] = [];
  const matches = [...content.matchAll(VERSION_HEADER)];
  for (let i = 0; i < matches.length; i++) {
    const bodyStart = matches[i].index! + matches[i][0].length;
    const bodyEnd = i < matches.length - 1 ? matches[i + 1].index! : content.length;
    const body = content.slice(bodyStart, bodyEnd).trim();
    const sections = parseSections(body);
    versions.push({
      version: matches[i][1],
      releaseDate: matches[i][2].trim(),
      sections,
    });
  }
  return versions;
}

/**
 * Reads changelog from project root and parses it.
 * For Thai: tries CHANGELOG.th.md first, falls back to CHANGELOG.md if missing.
 * Call from Server Component only. Returns versions newest-first; empty array on read/parse error.
 */
export async function getChangelogVersions(language: Language): Promise<ChangelogVersion[]> {
  try {
    const candidates =
      language === "th" ? ["CHANGELOG.th.md", "CHANGELOG.md"] : ["CHANGELOG.md"];
    let content: string | null = null;
    for (const fileName of candidates) {
      try {
        content = await readFile(path.join(process.cwd(), fileName), "utf-8");
        break;
      } catch {
        // try next file
      }
    }
    if (!content) return [];
    const versions = parseChangelog(content);
    return versions.sort((a, b) => {
      const vA = a.version.split(".").map(Number);
      const vB = b.version.split(".").map(Number);
      for (let i = 0; i < 3; i++) {
        const diff = (vB[i] ?? 0) - (vA[i] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
  } catch {
    return [];
  }
}
