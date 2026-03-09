# Slip OCR — Upload Slip to Transaction

## Overview

Slip OCR allows users on **mobile** to upload one or more bank transfer slips and convert them into draft transactions. The flow is:

1. User taps **Slip upload** from the mobile bottom nav.
2. User selects `n` images (bank slips).
3. The app calls **OCR.space** to extract text from each image.
4. The server parses the OCR text into draft transactions (amount, date, note).
5. The user reviews and edits each draft, then confirms to create real transactions.

This feature is optimized for **Kasikorn Bank (KBank) slips** in both English and Thai.

## Current UX Flow

The current mobile slip upload flow is optimized for batch processing and delayed confirmation:

1. User opens **Slip upload** from the mobile bottom nav.
2. If there are unfinished drafts from a previous session, the dialog restores them from `localStorage`.
3. User can upload multiple slips in one batch and also **upload more** while existing drafts are still visible.
4. Each slip shows its own processing status, upload telemetry, OCR result, and response details.
5. After OCR completes, the card switches to a compact summary view (`amount`, `type`, `date`).
6. The user can expand **Edit details** to adjust the draft, then collapse it again with **Confirm**.
7. When all desired drafts are ready, the user taps **Confirm & create** to create real transactions.

If the dialog is closed while the page is still open, background OCR/upload continues. Reopening the dialog shows the same in-progress or completed drafts.

## Supported Formats

### English (KBank)

- Amount pattern:
  - `Amount:\n5,000.00 Baht`
- Date/time pattern:
  - `6 Mar 19 2:46 PM`

Example (simplified):

```text
Transaction Completed
Transfer Completed
6 Mar 19 2:46 PM
...
Amount:
5,000.00 Baht
Fee:
0.00 Baht
```

### Thai (KBank)

- Amount pattern:
  - `จำนวน: 888.00 บาท`
  - `จำนวน: | 888.00 บาท |`
- Date/time pattern:
  - `25 ม.ค. 65 23:06 น.` (2-digit year)
  - `25 ม.ค. 2565 23:06 น.` (Buddhist Era year → 2022)

Example (simplified):

```text
ตอนเงินสำเร็จ
25 ม.ค. 65 23:06 น.
...
จำนวน: | 888.00 บาท |
ค่าธรรมเนียม: | 0.00 บาท |
Verified by K+
```

If the parser cannot confidently extract an amount (or the OCR output is too noisy), the draft is marked as **PARSE_FAILED** and the user is asked to fill in the fields manually.

## API

- **Route:** `POST /api/ocr/parse-slips`
- **Auth:** Requires signed-in user (NextAuth session)
- **Input:** `multipart/form-data` with `file` (can be multiple) or `files[]` keys (images only, max 1 MB per file)
- **External service:** `https://api.ocr.space/parse/image` (OCR.space Free API)
  - Uses API key from `OCR_SPACE_API_KEY` (server-side only)
  - Uses `OCREngine=2` first for faster throughput
  - Falls back to `OCREngine=3` when OCR text exists but parsing fails
- **Output:**
  - `{ items: Array<{ index, rawFileName, rawText?, parsed?: { amount, occurredAt, note }, error? }> }`

The client-side SlipUploadDialog uses this response to build draft transactions that the user can edit and confirm.

## Components

- `components/dashboard/mobile-bottom-nav.tsx`
  - Adds **Slip upload** button for mobile.
  - Opens SlipUploadDialog when tapped.
- `components/dashboard/slip-upload-dialog.tsx`
  - Handles the flow: restore/select images → processing → preview/edit → confirm create.
  - Uses `/api/ocr/parse-slips` for OCR and parsing.
  - Uses `/api/transactions` to create final transactions.
  - Persists slip drafts/results in `localStorage` so the user can close the dialog and reopen later.

## Client-Side Processing

- Images are compressed client-side before upload to reduce latency.
- Slip processing runs concurrently on the client (multiple workers) instead of waiting for the whole batch to finish serially.
- Upload uses `XMLHttpRequest` so the UI can show:
  - upload percentage
  - uploaded bytes / total bytes
  - estimated upload speed
  - original vs compressed file size
  - per-slip elapsed time and whole-batch elapsed time

## Persistence & Recovery

- Draft data is stored in `localStorage` under a versioned key.
- Persisted data includes draft fields, OCR/transaction responses, and telemetry metadata.
- Raw image files are **not** stored in `localStorage` to avoid quota and performance issues.
- If the page is refreshed while a slip is still processing:
  - completed/error drafts are restored
  - in-flight drafts are restored as **interrupted** drafts and must be reviewed or re-uploaded
- If all drafts are cleared or all transactions are created successfully, the stored state is removed.

## Review & Edit UI

- While a slip is still loading, the compact draft summary and edit controls stay hidden.
- After OCR completes (success or parse error), the card shows:
  - amount
  - transaction type (default: `EXPENSE`)
  - date
- The advanced editor (`amount`, `type`, `account`, `date`, `category`, `note`) is hidden behind an expandable **Edit details** section.
- Response details can be opened from the `...` action button per slip.

## Error Handling

- `OCR_SPACE_API_KEY` missing → `503` with `Slip OCR is not configured` (dialog shows a friendly error).
- OCR.space rate limit exceeded (free tier) → `429` with `Slip OCR rate limit exceeded. Please try again later.`
- File too large (> 1 MB) → per-image error `FILE_TOO_LARGE`.
- OCR request/network failure → per-image error `OCR_REQUEST_FAILED`.
- OCR response invalid JSON → per-image error `OCR_RESPONSE_INVALID`.
- OCR processed but no text extracted or parser cannot find amount → per-image error `PARSE_FAILED`, dialog shows “อ่านสลิปอัตโนมัติไม่ได้ กรุณากรอกข้อมูลเอง” and lets the user type manually.
- Browser refresh during in-flight upload/OCR → restored as interrupted draft; raw file must be uploaded again if the user wants to retry OCR.

