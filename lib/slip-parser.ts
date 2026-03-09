/**
 * Parse bank slip OCR text into structured transaction data.
 * Supports Kasikorn and similar Thai bank slip formats.
 */

import { MAX_NOTE_LENGTH } from "@/lib/validation";

export type ParsedSlip = {
  amount: number;
  occurredAt?: Date;
  note?: string;
};

const MONTH_MAP: Record<string, number> = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

const THAI_MONTH_MAP: Record<string, number> = {
  "ม.ค.": 0,
  "ก.พ.": 1,
  "มี.ค.": 2,
  "เม.ย.": 3,
  "พ.ค.": 4,
  "มิ.ย.": 5,
  "ก.ค.": 6,
  "ส.ค.": 7,
  "ก.ย.": 8,
  "ต.ค.": 9,
  "พ.ย.": 10,
  "ธ.ค.": 11,
};

/**
 * Extract amount from OCR text. Kasikorn format: "Amount:\n5,000.00 Baht"
 */
function extractAmount(text: string): number | null {
  const normalized = text.replace(/\r\n/g, "\n");

  // English pattern: "Amount:\n5,000.00 Baht"
  const englishMatch =
    /Amount:\s*([\d,]+(?:\.\d+)?)\s*Baht/i.exec(normalized);
  if (englishMatch) {
    const amountNumber = Number.parseFloat(englishMatch[1].replace(/,/g, ""));
    if (Number.isFinite(amountNumber) && amountNumber > 0) {
      return amountNumber;
    }
  }

  // Thai Kasikorn pattern: "จำนวน: 888.00 บาท" or "จำนวน: | 888.00 บาท |"
  const thaiMatch =
    /จำนวน[^0-9]*([\d,]+(?:\.\d+)?)\s*บาท/i.exec(normalized);
  if (thaiMatch) {
    const amountNumber = Number.parseFloat(thaiMatch[1].replace(/,/g, ""));
    if (Number.isFinite(amountNumber) && amountNumber > 0) {
      return amountNumber;
    }
  }

  return null;
}

/**
 * Extract date/time from OCR text. Format: "6 Mar 19 2:46 PM"
 */
function extractOccurredAt(text: string): Date | undefined {
  const normalized = text.replace(/\r\n/g, "\n");

  // 1) English pattern: "6 Mar 19 2:46 PM"
  const enRegex =
    /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i;
  const enMatch = enRegex.exec(normalized);
  if (enMatch) {
    const day = Number.parseInt(enMatch[1], 10);
    const monthAbbr = enMatch[2].toUpperCase();
    const yearTwo = Number.parseInt(enMatch[3], 10);
    const hour12 = Number.parseInt(enMatch[4], 10);
    const minute = Number.parseInt(enMatch[5], 10);
    const ampm = enMatch[6].toUpperCase();

    const monthIndex = MONTH_MAP[monthAbbr];
    if (monthIndex === undefined || day < 1 || day > 31) {
      return undefined;
    }

    const yearFull = yearTwo >= 0 && yearTwo <= 99 ? 2000 + yearTwo : yearTwo;
    let hour24 = hour12 % 12;
    if (ampm === "PM") hour24 += 12;

    const d = new Date(yearFull, monthIndex, day, hour24, minute, 0, 0);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // 2) Thai pattern: "25 ม.ค. 65 23:06 น."
  const thRegex =
    /(\d{1,2})\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+(\d{2,4})\s+(\d{1,2}):(\d{2})\s*น\./;
  const thMatch = thRegex.exec(normalized);
  if (thMatch) {
    const day = Number.parseInt(thMatch[1], 10);
    const monthKey = thMatch[2] as keyof typeof THAI_MONTH_MAP;
    const yearRaw = Number.parseInt(thMatch[3], 10);
    const hour24 = Number.parseInt(thMatch[4], 10);
    const minute = Number.parseInt(thMatch[5], 10);

    const monthIndex = THAI_MONTH_MAP[monthKey];
    if (monthIndex === undefined || day < 1 || day > 31) {
      return undefined;
    }

    let yearFull: number;
    if (yearRaw >= 2500) {
      yearFull = yearRaw - 543; // Buddhist Era 4-digit -> Gregorian
    } else if (yearRaw < 100) {
      yearFull = 2500 + yearRaw - 543; // Thai slips use พ.ศ. short form, e.g. 68 = พ.ศ. 2568 = 2025
    } else {
      yearFull = yearRaw;
    }

    const d = new Date(yearFull, monthIndex, day, hour24, minute, 0, 0);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return undefined;
}

/**
 * Extract meaningful note from first few lines (transaction type, recipient, etc.)
 */
function extractNote(text: string): string | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const skipPatterns = [
    /^\d{1,2}:\d{2}\s*(AM|PM)$/i,
    /^\d{1,2}:\d{2}$/, // time without AM/PM
    /^Back$/i,
    /^Share$/i,
    /^Save as$/i,
    /^Favorite$/i,
    /^Verified by$/i,
    /^Create$/i,
    /^Schedule$/i,
    /^to Banking$/i,
    /^ย้อนกลับ$/u,
    /^สแกน$/u,
    /^เลือกที่รายการ[:]?\s*$/u,
    /^ยกเลิก$/u,
    /^ต่อไป$/u,
    /^บันทึกช่วยจำ[:]?\s*$/u,
    /^จำนวน[:]?\s*$/u,
  ];

  const meaningful = lines.filter(
    (line) => !skipPatterns.some((p) => p.test(line))
  );
  const rawNote = meaningful.slice(0, 4).join(" · ");
  if (rawNote.length === 0) return undefined;
  return rawNote.slice(0, MAX_NOTE_LENGTH);
}

/**
 * Parse OCR text from a bank slip into structured data.
 * Returns null if amount cannot be extracted.
 */
export function parseSlipText(text: string): ParsedSlip | null {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const amount = extractAmount(normalized);
  if (amount === null) return null;

  const occurredAt = extractOccurredAt(normalized);
  const note = extractNote(normalized);

  return {
    amount,
    occurredAt,
    note,
  };
}
