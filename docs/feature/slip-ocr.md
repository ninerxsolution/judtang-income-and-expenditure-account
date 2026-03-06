# Slip OCR — Upload Slip to Transaction

## Overview

Slip OCR allows users on **mobile** to upload one or more bank transfer slips and convert them into draft transactions. The flow is:

1. User taps **Slip upload** from the mobile bottom nav.
2. User selects `n` images (bank slips).
3. The app calls **OCR.space** to extract text from each image.
4. The server parses the OCR text into draft transactions (amount, date, note).
5. The user reviews and edits each draft, then confirms to create real transactions.

This feature is optimized for **Kasikorn Bank (KBank) slips** in both English and Thai.

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
  - Uses `OCREngine=3` with automatic language detection
- **Output:**
  - `{ items: Array<{ index, rawFileName, rawText?, parsed?: { amount, occurredAt, note }, error? }> }`

The client-side SlipUploadDialog uses this response to build draft transactions that the user can edit and confirm.

## Components

- `components/dashboard/mobile-bottom-nav.tsx`
  - Adds **Slip upload** button for mobile.
  - Opens SlipUploadDialog when tapped.
- `components/dashboard/slip-upload-dialog.tsx`
  - Handles the flow: select images → processing → preview/edit → confirm create.
  - Uses `/api/ocr/parse-slips` for OCR and parsing.
  - Uses `/api/transactions` to create final transactions.

## Error Handling

- `OCR_SPACE_API_KEY` missing → `503` with `Slip OCR is not configured` (dialog shows a friendly error).
- OCR.space rate limit exceeded (free tier) → `429` with `Slip OCR rate limit exceeded. Please try again later.`
- File too large (> 1 MB) → per-image error `FILE_TOO_LARGE`.
- OCR request/network failure → per-image error `OCR_REQUEST_FAILED`.
- OCR response invalid JSON → per-image error `OCR_RESPONSE_INVALID`.
- OCR processed but no text extracted or parser cannot find amount → per-image error `PARSE_FAILED`, dialog shows “อ่านสลิปอัตโนมัติไม่ได้ กรุณากรอกข้อมูลเอง” and lets the user type manually.

