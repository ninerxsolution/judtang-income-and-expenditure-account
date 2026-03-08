# Date/Time Components: Year Display (พ.ศ. / ค.ศ.)

**Convention:** ภาษาไทยแสดงปีเป็น พ.ศ. (Buddhist Era) ภาษาอังกฤษแสดงปีเป็น ค.ศ. (Christian Era / Gregorian).

---

## กฎการแสดงปี

- **ภาษาไทย (th):** ปี พ.ศ. = ปี ค.ศ. + 543 (เช่น 2026 → 2569)
- **ภาษาอังกฤษ (en):** ปี ค.ศ. แสดงตามค่า Gregorian (2026 → 2026)

การคำนวณและ API ภายในโปรเจกต์ใช้ **Gregorian (ค.ศ.) เสมอ** — การแสดงผลใน UI เท่านั้นที่เปลี่ยนตาม language.

---

## Shared utility

- **ไฟล์:** [lib/format-year.ts](../../lib/format-year.ts)
- **ฟังก์ชัน:** `formatYearForDisplay(year: number, language: string): string`
- ใช้เมื่อต้องการแสดงปีใน UI (dropdown, label, copyright ฯลฯ)

---

## Component ที่เกี่ยวข้อง

| Component / หน้า | การใช้ปี |
|------------------|----------|
| DatePicker | แสดงวันที่แบบเต็ม — ใช้ Buddhist year ในข้อความเมื่อ locale เป็น th (date-fns + year+543) |
| DateRangePicker | เหมือน DatePicker |
| Budget page (month/year selector) | dropdown ปีใช้ `formatYearForDisplay(y, language)` |
| Summary page (year select) | dropdown ปีใช้ `formatYearForDisplay(y, language)` |
| TransactionsCalendar | header ปีและ year view ใช้ `formatYearForDisplay` จาก lib |
| Landing footer (copyright) | ปีใน copyright ใช้ `formatYearForDisplay` |

---

## หมายเหตุ

- API และ database เก็บและรับปีเป็น **Gregorian เท่านั้น** — ไม่ส่ง พ.ศ. ไป API
- option `value` ใน select ปียังเป็นเลขค.ศ. เพื่อให้ส่ง API ถูกต้อง มีเฉพาะข้อความที่แสดง (option label) ที่เป็น พ.ศ. เมื่อภาษาไทย
