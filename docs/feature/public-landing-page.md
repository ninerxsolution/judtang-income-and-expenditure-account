# Public Product Landing Page

**Product:** Judtang Financial Engine  
**Type:** Public Landing / Product Overview Page  
**Route:** `/`  
**Audience:** General users, developers, early adopters

---

## 1. Overview

The home page (`/`) serves as the public entry point for Judtang Financial Engine. It introduces the product, explains core capabilities, and provides entry points to sign in or register. The page is designed to feel mature, structured, and intentional—without marketing exaggeration.

---

## 2. Page Structure

Sections in order:

1. **Navbar** — Logo, Theme switcher, Language switcher, Releases, GitHub (optional), Login, Get Started
2. **Hero Section** — Headline, subheadline, primary/secondary CTAs, dashboard mock preview
3. **Core Value Section** — Three columns: Structured accounting, Multi-account support, Deterministic balance
4. **Feature Grid** — 2×2 grid: Credit card management, Transfer between accounts, Import/Export, Update history
5. **Engine / Architecture Section** — Design principles (ledger-based, liability separation, etc.)
6. **Call To Action** — Single headline + Get Started button
7. **Footer** — Version, Tech stack, Release Notes link, Privacy Policy link, Copyright

---

## 3. Navbar

### Items

- **Logo / Product Name** — Links to `/`
- **Theme switcher** — Dropdown: Light, Dark, System (next-themes)
- **Language switcher** — Dropdown: ไทย, English (i18n, cookie + localStorage)
- **Releases** — Links to `/releases` (public changelog)
- **GitHub** — Optional, via `NEXT_PUBLIC_GITHUB_URL`
- **Login** — Links to `/sign-in`
- **Get Started** — Links to `/register`

### Design

- Minimal styling
- Sticky header with backdrop blur
- No clutter

---

## 4. Hero Section

### Content (i18n)

- **Headline:** ควบคุมเงินทุกบัญชีอย่างเป็นระบบ
- **Subheadline:** ระบบบริหารรายรับ–รายจ่ายที่รองรับหลายบัญชี บัตรเครดิตแบบมีรอบบิล และคำนวณยอดอย่างแม่นยำ
- **Primary CTA:** เริ่มใช้งาน → `/register`
- **Secondary CTA:** ดูว่าทำอะไรได้บ้าง → `#engine` (scroll)

### Visual Element

- Static dashboard mock: Income, Expense, Balance cards (sample data)
- Uses `home.hero.previewLabel` and `dashboard.summary.*` for labels

---

## 5. Core Value Section

Three-column layout. Content uses user-friendly language (no technical jargon).

| Column | Title | Description |
|--------|-------|-------------|
| 1 | บัญชีแบบมีโครงสร้าง | ไม่ใช่แค่บันทึกรายการ รองรับรอบบิลและแบ่งจ่ายค่าบัตรเครดิตได้ |
| 2 | รองรับหลายบัญชี | ใช้ได้ทั้งบัญชีธนาคาร กระเป๋าเงิน เงินสด และบัตรเครดิต |
| 3 | ยอดเงินแม่นยำ | คำนวณจากรายการจริง ไม่มีตัวเลขลอยหรือคำนวณผิดพลาด |

---

## 6. Feature Grid

2×2 grid. All content translated for general users.

| Feature | Items |
|---------|-------|
| จัดการบัตรเครดิต | รอบบิลชัดเจน, แจ้งเตือนวันครบกำหนดชำระ, จ่ายขั้นต่ำ/จ่ายเต็มได้, แบ่งโอนชำระจากบัญชีอื่นได้ |
| โอนระหว่างบัญชี | โอนเงินระหว่างบัญชีได้, ระบบคิดยอดอัตโนมัติถูกต้อง, ตรวจสอบความถูกต้องได้ |
| นำเข้า / ส่งออกข้อมูล | นำเข้าจากไฟล์ Excel หรือ CSV, เช็คกับใบยอดบัญชีได้, ตรวจสอบประวัติรายการได้ |
| ประวัติการอัปเดต | ดูเวอร์ชันย้อนหลังได้, มีหมายเหตุการอัปเดตทุกครั้ง, แยกประเภทการเปลี่ยนแปลง |

---

## 7. Engine Section

- **Title:** ออกแบบมาเพื่อจัดการเงินจริง ไม่ใช่แค่จดบันทึก
- **Bullets:** บันทึกรายการอย่างเป็นระบบ, แยกบัญชีบัตรเครดิตชัดเจน, ติดตามรอบบิลตามจริง, จัดการวงจรชีวิตรายการได้, โครงสร้างข้อมูลชัดเจน ดูแลง่าย

---

## 8. Public Releases Page

- **Route:** `/releases`
- **Access:** Public (no login required)
- **Content:** Renders `CHANGELOG.md` via `getChangelogVersions(language)`
- **Layout:** Simple header with "Back to home" link, changelog content below

---

## 9. i18n Keys

All landing content under `home.*`:

- `home.nav.*` — Navbar (releases, login, getStarted, themeLight, themeDark, themeSystem)
- `home.hero.*` — Hero (headline, subheadline, primaryCta, secondaryCta, previewLabel)
- `home.coreValue.*` — Core value columns
- `home.features.*` — Feature grid (creditCard, transfer, importExport, releaseTracking)
- `home.engine.*` — Engine section
- `home.cta.*` — CTA section
- `home.footer.*` — Footer (version, techStack, releaseNotes, privacyPolicy, copyright)

---

## 10. Components

| Component | Path |
|-----------|------|
| LandingNavbar | `components/landing/landing-navbar.tsx` |
| LandingHero | `components/landing/landing-hero.tsx` |
| LandingCoreValue | `components/landing/landing-core-value.tsx` |
| LandingFeatureGrid | `components/landing/landing-feature-grid.tsx` |
| LandingEngine | `components/landing/landing-engine.tsx` |
| LandingCta | `components/landing/landing-cta.tsx` |
| LandingFooter | `components/landing/landing-footer.tsx` |

---

## 11. Visual Guidelines

- **Background:** `bg-stone-50` / `dark:bg-stone-950` (Earth tone)
- **Accent:** `amber-600` for primary CTAs; `emerald-500` for bullets/dots
- **Typography:** Large headline, generous line height
- **Spacing:** `py-16` to `py-20` between sections
- **Avoid:** Heavy gradients, buzzwords, excessive animations

---

## 12. Non-Goals

- No internal schema deep dive
- No full feature documentation
- No dashboard functionality on this page
