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

const THAI_FULL_MONTH_MAP: Record<string, number> = {
  มกราคม: 0,
  กุมภาพันธ์: 1,
  มีนาคม: 2,
  เมษายน: 3,
  พฤษภาคม: 4,
  มิถุนายน: 5,
  กรกฎาคม: 6,
  สิงหาคม: 7,
  กันยายน: 8,
  ตุลาคม: 9,
  พฤศจิกายน: 10,
  ธันวาคม: 11,
};

// Amount labels that PROMOTE a money figure (the actual transfer amount).
const POSITIVE_AMOUNT_LABELS =
  /จำนวนเงิน|จำนวน|ยอดเงินโอน|ยอดโอนเงิน|ยอดโอน|ยอดชำระ|ยอดเงิน|amount|transfer/i;
// Labels that DISQUALIFY a money figure (balance, fee, tax — never the amount).
const NEGATIVE_AMOUNT_LABELS =
  /คงเหลือ|ค่าธรรมเนียม|ธรรมเนียม|fee|balance|remaining|bal\.|ภาษี|vat/i;

/**
 * Convert a Thai year token to a Gregorian year.
 * 4-digit >= 2500 is พ.ศ.; 2-digit short form is treated as 25xx พ.ศ.
 */
function thaiYearToGregorian(yearRaw: number): number {
  if (yearRaw >= 2500) return yearRaw - 543;
  if (yearRaw < 100) return 2500 + yearRaw - 543;
  return yearRaw;
}

/**
 * Extract amount from OCR text. Kasikorn format: "Amount:\n5,000.00 Baht"
 */
function extractAmount(text: string): number | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  type Candidate = { value: number; score: number; index: number };
  const candidates: Candidate[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    // Labels usually sit on the same line or the line just above the figure.
    const context = `${lines[i - 1] ?? ""} ${line}`;
    if (NEGATIVE_AMOUNT_LABELS.test(context)) continue; // fee / balance / tax line

    const hasCurrency = /บาท|฿|baht|thb/i.test(line);
    const isPositive = POSITIVE_AMOUNT_LABELS.test(context);

    // Money figures: a number with decimals; an integer + 2 digits split by a
    // space where OCR dropped the dot ("50 00 THB"); a number followed by a
    // currency word; or a number preceded by ฿ ("฿1,500").
    const moneyRe =
      /([\d,]+\.\d{1,2})(?!\d)|([\d,]+)[ \t]+(\d{2})\s*(?:บาท|฿|baht|thb)|([\d,]+)\s*(?:บาท|฿|baht|thb)|฿\s*([\d,]+(?:\.\d{1,2})?)/gi;
    let match: RegExpExecArray | null;
    while ((match = moneyRe.exec(line)) !== null) {
      const raw = (
        match[1] ??
        (match[2] != null ? `${match[2]}.${match[3]}` : match[4] ?? match[5]) ??
        ""
      ).replace(/,/g, "");
      const value = Number.parseFloat(raw);
      if (!Number.isFinite(value) || value <= 0) continue;

      let score = 0;
      if (isPositive) score += 10;
      if (hasCurrency) score += 2;
      if (/\.\d{2}\b/.test(match[0])) score += 1; // looks like a real money figure
      candidates.push({ value, score, index: i });
    }
  }

  if (candidates.length === 0) return null;
  // Highest score wins; ties broken by earliest position (amount appears before balance).
  candidates.sort((a, b) => b.score - a.score || a.index - b.index);
  return candidates[0].value;
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

  // 2) Thai abbrev: "25 ม.ค. 65 23:06 น." / "11 พ.ค. 2567 - 02:57" / "28 ต.ค. 2566 17:41:13".
  // Time is optional and may be separated by space or a dash; seconds are ignored.
  const thRegex =
    /(\d{1,2})\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+(\d{2,4})(?:[\s\-–—]+(\d{1,2}):(\d{2})(?::\d{2})?)?(?:\s*น\s*[.,]?)?/;
  const thMatch = thRegex.exec(normalized);
  if (thMatch) {
    const day = Number.parseInt(thMatch[1], 10);
    const monthKey = thMatch[2] as keyof typeof THAI_MONTH_MAP;
    const yearRaw = Number.parseInt(thMatch[3], 10);
    const hour24 = thMatch[4] ? Number.parseInt(thMatch[4], 10) : 0;
    const minute = thMatch[5] ? Number.parseInt(thMatch[5], 10) : 0;

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

  // 3) Thai full month name: "26 มกราคม 2565 14:30"
  const thFullRegex =
    /(\d{1,2})\s+(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s+(\d{2,4})(?:[\s,]+(\d{1,2})[:.](\d{2}))?/;
  const thFullMatch = thFullRegex.exec(normalized);
  if (thFullMatch) {
    const day = Number.parseInt(thFullMatch[1], 10);
    const monthIndex = THAI_FULL_MONTH_MAP[thFullMatch[2]];
    const yearFull = thaiYearToGregorian(Number.parseInt(thFullMatch[3], 10));
    const hour = thFullMatch[4] ? Number.parseInt(thFullMatch[4], 10) : 0;
    const minute = thFullMatch[5] ? Number.parseInt(thFullMatch[5], 10) : 0;
    if (monthIndex !== undefined && day >= 1 && day <= 31) {
      const d = new Date(yearFull, monthIndex, day, hour, minute, 0, 0);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  // 4) Numeric: "26/01/2565", "26-01-2022", "26.01.65" (+ optional HH:MM)
  const numRegex =
    /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:[\s,]+(\d{1,2})[:.](\d{2}))?/g;
  let numMatch: RegExpExecArray | null;
  while ((numMatch = numRegex.exec(normalized)) !== null) {
    const day = Number.parseInt(numMatch[1], 10);
    const month = Number.parseInt(numMatch[2], 10);
    if (day < 1 || day > 31 || month < 1 || month > 12) continue;
    const yearFull = thaiYearToGregorian(Number.parseInt(numMatch[3], 10));
    const hour = numMatch[4] ? Number.parseInt(numMatch[4], 10) : 0;
    const minute = numMatch[5] ? Number.parseInt(numMatch[5], 10) : 0;
    const d = new Date(yearFull, month - 1, day, hour, minute, 0, 0);
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
 * Normalize raw OCR text so the extractors see consistent labels/numbers.
 * Tesseract (tha) sprinkles spaces between Thai glyphs ("จ ํ า น ว น") and
 * sometimes loses the decimal point ("50.00" → "50 00"); fix the recoverable ones.
 */
function normalizeOcrText(text: string): string {
  let s = text.replace(/\r\n/g, "\n");

  // Collapse spaces Tesseract inserts BETWEEN Thai glyphs (to fixpoint).
  // Per-line ([ \t], not \s) so line structure (used for label context) survives.
  let prev: string;
  do {
    prev = s;
    s = s.replace(/([฀-๿])[ \t]+([฀-๿])/g, "$1$2");
  } while (s !== prev);

  return (
    s
      // Recompose สระอำ (ำ) that Tesseract splits into ◌ํ + า.
      .replace(/ํา/g, "ำ")
      // Thai numerals → Arabic.
      .replace(/[๐-๙]/g, (d) => String("๐๑๒๓๔๕๖๗๘๙".indexOf(d)))
      // Decimal point lost to spaces: "000 . 02" → "000.02".
      .replace(/(\d)[ \t]*\.[ \t]*(\d)/g, "$1.$2")
      // Thai abbrev dots: "ต . ค . 2566" → "ต.ค. 2566".
      .replace(/([฀-๿])[ \t]*\.[ \t]*(?=[฀-๿])/g, "$1.")
      .replace(/([฀-๿])[ \t]*\./g, "$1.")
      .trim()
  );
}

/**
 * Parse OCR text from a bank slip into structured data.
 * Returns null if amount cannot be extracted.
 */
export function parseSlipText(text: string): ParsedSlip | null {
  const normalized = normalizeOcrText(text);
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
