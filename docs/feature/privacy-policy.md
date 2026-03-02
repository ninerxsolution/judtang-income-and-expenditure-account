# Privacy Policy

**Product:** Judtang Financial Engine  
**Feature:** Privacy Policy & Data Governance Foundation  
**Version:** 1.0  
**Route:** `/privacy`  
**Audience:** Public (no login required)

---

## 1. Overview

A public-facing Privacy Policy page that reflects actual system behavior, satisfies PDPA / GDPR-ready transparency requirements, and discloses how user data is collected, used, and protected.

The page is accessible without authentication and is linked in the landing page footer.

---

## 2. Route & Access

| Route | Auth required | Component |
|---|---|---|
| `/privacy` | No | `app/privacy/page.tsx` (Server Component) |

---

## 3. Page Structure

- **Sticky header** — "Back to Home" button + page title
- **Policy header** — Title, version badge (`Version 1.0`), effective date (`2 March 2026`)
- **10 content sections** (each with a unique anchor ID for deep-linking)

| # | Section | Anchor |
|---|---|---|
| 1 | Introduction | `#introduction` |
| 2 | Information We Collect | `#data-collected` |
| 3 | How We Use Information | `#data-use` |
| 4 | Data Storage & Security | `#security` |
| 5 | Third-Party Services | `#third-party` |
| 6 | Data Retention | `#retention` |
| 7 | User Rights | `#rights` |
| 8 | Account Deletion | `#deletion` |
| 9 | Changes to This Policy | `#changes` |
| 10 | Contact Information | `#contact` |

---

## 4. Data Classification

### 4.1 Collected

| Category | Fields |
|---|---|
| Account Information | Email, username, hashed password |
| Financial Metadata | Account name, account type, credit limit, statement cycle, due date, last 4 digits of card (if provided) |
| Usage & Technical | IP address, device/browser info, login timestamps, basic audit logs |

### 4.2 Explicitly NOT Collected

The system does not collect or store:

- Full credit card number
- CVV
- Card expiration date
- Online banking credentials
- National ID number
- Biometric data

This constraint is disclosed in Section 2 of the public Privacy Policy page with a highlighted "Not Collected" callout.

---

## 5. Third-Party Services Disclosed

| Provider | Purpose |
|---|---|
| Cloud Hosting Provider | Application infrastructure and hosting |
| Email Delivery Service | Transactional emails (verification, reset) |
| Cloudflare Turnstile | Bot protection and CAPTCHA verification |

---

## 6. Versioning

- Version is stored in i18n dictionaries (`privacy.version`)
- Effective date is stored in i18n dictionaries (`privacy.effectiveDate`)
- Future version bumps require updating the i18n dictionaries and adding a CHANGELOG entry

---

## 7. i18n

All page content is stored in both language dictionaries under the `privacy` namespace:

```
i18n/dictionaries/th.ts  →  privacy.*
i18n/dictionaries/en.ts  →  privacy.*
```

The page uses `getDictionary(language)` directly (not `translate()`) because the content includes arrays of objects (categories, providers, list items) that cannot be expressed as flat string keys.

---

## 8. Footer Link

`components/landing/landing-footer.tsx` includes a link to `/privacy` labeled with `home.footer.privacyPolicy` (Thai: "นโยบายความเป็นส่วนตัว", English: "Privacy Policy"), rendered beside the Release Notes link.

---

## 9. Out of Scope (this version)

- Account deletion endpoint (to be implemented separately)
- Data export (JSON/CSV)
- Consent management / cookie banner
- Cookie policy separation
- DPA template
