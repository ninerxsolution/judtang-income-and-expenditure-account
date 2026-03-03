# Terms & Conditions

**Product:** Judtang Financial Engine  
**Feature:** Public Terms & Conditions Page  
**Version:** 1.0  
**Route:** `/terms`

---

## 1. Overview

A public Terms & Conditions page that defines the service agreement, acceptable use, and user obligations. Accessible without authentication.

---

## 2. Route & Access

- **Route:** `/terms`
- **Access:** Public (no login required)
- **Content:** Versioned legal text (Thai/English via i18n)

---

## 3. Content Sections

- Service description and scope
- Acceptable use
- User obligations
- Data and privacy (reference to Privacy Policy)
- Limitation of liability
- Dispute resolution
- Changes to terms
- Contact information

---

## 4. Integration

- **Footer:** Linked from landing page footer (`home.footer.termsAndConditions`)
- **Registration:** Terms modal may be shown during sign-up; user must accept before proceeding
- **Version:** `TERMS_VERSION` in `lib/terms.ts`; increment when content changes materially

---

## 5. i18n

- Keys under `terms.*` (meta.title, meta.description, sections, etc.)
- Language follows cookie/localStorage preference (same as landing page)
