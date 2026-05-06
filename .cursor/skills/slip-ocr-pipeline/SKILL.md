---
name: slip-ocr-pipeline
description: Slip OCR pipeline for Judtang — OCR engine fallback logic, KBank slip parser (Thai/English), draft transaction lifecycle, localStorage persistence, and error handling. Use when modifying slip upload, OCR parsing, draft creation/confirmation, or the SlipUploadDialog.
---

# Slip OCR Pipeline

Converts bank transfer slip images to draft transactions on mobile.

## Flow

```
User selects images
  → client compresses (< 1 MB each)
  → POST /api/ocr/parse-slips (multipart)
    → OCREngine=2 first (faster)
    → if parse fails → retry with OCREngine=3
    → parseSlipText() extracts amount, date, note
  → client builds draft transactions
  → user reviews/edits drafts
  → POST /api/transactions (confirm)
```

## API

**`POST /api/ocr/parse-slips`** — `multipart/form-data`, field `file` or `files[]`

Response:
```ts
{
  items: Array<{
    index: number
    rawFileName: string
    rawText?: string
    parsed?: { amount: number; occurredAt: string; note: string }
    error?: string   // "PARSE_FAILED" | "OCR_REQUEST_FAILED" | "FILE_TOO_LARGE" | ...
  }>
}
```

## OCR engine fallback

```
1. Call OCR.space with OCREngine=2
2. If OCR text exists but parseSlipText() cannot find amount → retry with OCREngine=3
3. If still no amount → return error: "PARSE_FAILED"
```

`OCR_SPACE_API_KEY` must be set in env (server-side only). Missing key → 503.

## Supported slip formats

### English (KBank)
- Amount: `Amount:\n5,000.00 Baht`
- Date: `6 Mar 19 2:46 PM`

### Thai (KBank)
- Amount: `จำนวน: 888.00 บาท` or `จำนวน: | 888.00 บาท |`
- Date: `25 ม.ค. 65 23:06 น.` (2-digit Buddhist year) or `25 ม.ค. 2565 23:06 น.` (4-digit Buddhist year)
- 2-digit year: add 2500 → `65` = 2565 BE = 2022 CE

Parse is in `lib/slip-ocr/parser.ts` (`parseSlipText`).

## Draft lifecycle

```
UPLOADING → PROCESSING → READY (can confirm) | PARSE_FAILED (manual entry)
```

Drafts are stored in `localStorage` under a versioned key. Raw image files are NOT persisted.

On page refresh:
- Completed/error drafts: restored
- In-flight drafts: restored as **interrupted** (need re-upload to retry OCR)

## Error handling

| Error | Cause | User sees |
|-------|-------|-----------|
| `FILE_TOO_LARGE` | File > 1 MB | Per-slip error |
| `OCR_REQUEST_FAILED` | Network / OCR.space failure | Per-slip error |
| `OCR_RESPONSE_INVALID` | Malformed JSON from OCR | Per-slip error |
| `PARSE_FAILED` | Text extracted but amount not found | "กรุณากรอกข้อมูลเอง" — manual entry |
| 503 | `OCR_SPACE_API_KEY` not set | Friendly dialog error |
| 429 | OCR.space free tier rate limit | "กรุณาลองใหม่ภายหลัง" |

## Client-side processing

- Images compressed client-side before upload
- Multiple slips processed **concurrently** (not serially)
- Upload via `XMLHttpRequest` — shows upload %, bytes, speed, elapsed time per slip
- Dialog can be closed during processing; reopening restores in-progress state

## Components

| File | Purpose |
|------|---------|
| `components/dashboard/slip-upload-dialog.tsx` | Main UI: select → process → review → confirm |
| `components/dashboard/mobile-bottom-nav.tsx` | "Slip upload" button (mobile only) |
| `app/api/ocr/parse-slips/route.ts` | Server route: OCR call + parsing |
| `lib/slip-ocr/parser.ts` | `parseSlipText()` — KBank EN/TH parser |

## Key rules when modifying

- Parser changes: test both English and Thai KBank formats
- localStorage key is versioned — bump version if draft shape changes
- `OCR_SPACE_API_KEY` is server-side only — never expose to client
- Rate limit is per free-tier OCR.space account; do not add retry loops that could burn through quota
