# Cosmogeek Certificate QR Verification & Automatic Certificate Generation System

An enterprise-grade, secure, and production-oriented certificate generation and cryptographic QR verification portal engineered for **Cosmogeek Software Solutions Pvt. Ltd.**

---

## 🌟 System Overview & Features

1. **Single Authorized Administrator Security**:
   - Protected admin session with HMAC SHA-256 tokens and HTTP-only cookies.
   - Passwords hashed using `bcrypt` (10 salt rounds).
   - Rate limiting on authentication attempts (maximum 5 failed attempts per 5-minute sliding window).

2. **Automated PDF Certificate Generation**:
   - Uses `pdf-lib` to load the original landscape master template (`templates/certificate-template.pdf`) without overwriting it.
   - Clears dynamic text areas with precision background masking to prevent text overlaps.
   - Dynamically renders recipient name (with auto-font scaling), designation, internship duration, ISO/Indian date formatting, and signatory information.

3. **Cryptographic QR Code Pipeline**:
   - Generates high-contrast QR code for every issued credential with error correction level `H` (30% recovery) and clean quiet-zone borders.
   - Encodes exclusively the canonical verification URL (`http://localhost:3000/verify/<verificationId>` or public HTTPS URL).
   - Zero exposure of private student emails or internal notes in QR payloads.

4. **Public Verification Portal (Mobile-First)**:
   - Matches the requested dark navy background (`#070E1A`), white typography, emerald-green verification badge, and responsive rounded cards.
   - **VALID**: Emerald verified credential badge, student role, timeline, issuing company, authorized signatory, and official PDF download.
   - **REVOKED**: Prominent crimson/amber revocation warning detailing revocation timestamp and official audit reason.
   - **INVALID / NOT FOUND**: Error state advising employers and verifiers on next steps.

5. **Persistent Database Engine**:
   - Self-contained SQLite engine powered by `sql.js` (WebAssembly) with atomic write-ahead filesystem persistence (`data/certificates.sqlite`).
   - Zero native compilation (`node-gyp`) dependencies, guaranteeing 100% out-of-the-box compatibility on Windows, Linux, and macOS.

---

## 🗂️ Project Directory Structure

```text
├── data/
│   └── certificates.sqlite       # Local SQLite persistent database (gitignored)
├── storage/
│   └── certificates/            # Generated PDF files (e.g. 26832.pdf, 26836.pdf)
├── templates/
│   └── certificate-template.pdf  # Master certificate template (read-only)
├── server/
│   ├── auth.ts                  # Session tokens, bcrypt hashing, rate limiting middleware
│   ├── db.ts                    # SQLite database queries, transactions & migrations
│   ├── pdfEngine.ts             # PDF template inspection, overlay, and clearance engine
│   ├── qr.ts                    # High-contrast QR code generation
│   ├── routes.ts                # Express API router (auth, metrics, certificates, verification)
│   └── validation.ts            # Zod input schemas, date calculation, Indian date formatting
├── src/
│   ├── components/
│   │   ├── AdminLogin.tsx       # Secure administrator sign-in portal
│   │   ├── CertificateDetailModal.tsx # Full metadata & QR code PNG export modal
│   │   ├── CertificateForm.tsx  # Student entry & automatic certificate generation form
│   │   ├── CertificateTable.tsx # Searchable, paginated certificates management table
│   │   ├── DashboardOverview.tsx# Metrics cards & recently issued certificates
│   │   ├── Navbar.tsx           # Responsive corporate header with navigation tabs
│   │   ├── RevokeModal.tsx      # Revocation confirmation dialog with audit reason
│   │   ├── TemplateSettings.tsx # Coordinate inspector & template layout preview
│   │   └── VerificationPage.tsx # Public mobile-first QR verification portal
│   ├── services/
│   │   └── api.ts               # Frontend API client
│   ├── tests/
│   │   ├── authAndDb.test.ts    # Unit tests for db, auth, sessions & revocation
│   │   ├── pdfAndQr.test.ts     # Unit tests for PDF compilation & QR generation
│   │   └── validation.test.ts   # Unit tests for Zod schemas & duration math
│   ├── App.tsx                  # Main React SPA component with client-side router
│   ├── index.css                # Tailwind CSS v4 styling
│   └── types/index.ts           # Shared TypeScript domain models
├── server.ts                    # Express server entry point mounting API + Vite
├── package.json                 # Dependencies and npm scripts
└── .env.example                 # Environment configuration template
```

---

## 💻 Windows Setup & Local Execution (PowerShell)

### Step 1: Prerequisites
- **Node.js**: v20.x or v22.x LTS installed.
- **npm**: v10.x+ or **bun**.
- Check versions in PowerShell:
  ```powershell
  node --version
  npm --version
  ```

### Step 2: Clone & Install Dependencies
Open **Windows PowerShell** in the project directory:
```powershell
npm install
```

### Step 3: Environment Configuration
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Default `.env` configuration:
```ini
APP_URL="http://localhost:3000"
PUBLIC_BASE_URL="http://localhost:3000"
ADMIN_DEFAULT_USERNAME="admin"
ADMIN_DEFAULT_PASSWORD="Admin@Cosmogeek2026!"
SESSION_SECRET="cosmogeek-ultra-secure-session-key-change-in-production-2026"
STORAGE_DIR="storage/certificates"
TEMPLATES_DIR="templates"
DATABASE_FILE="data/certificates.sqlite"
```

### Step 4: Run the Development Server
Start the full-stack server (runs Express backend + Vite frontend on port 3000):
```powershell
npm run dev
```
Open your browser at:
`http://localhost:3000`

---

## 🔑 Initial Admin Setup & Credentials

The system automatically initializes the SQLite database and seeds the first administrator on initial startup:
- **Admin Username**: `admin`
- **Default Password**: `Admin@Cosmogeek2026!`

The login screen includes a one-click **"Load Default Admin Credentials"** helper for rapid local testing.

---

## 📜 Existing Certificate Reference Template

The reference certificate for Cosmogeek Software Solutions Pvt. Ltd. is seeded automatically on initial boot:
- **Recipient**: Yuvraj Dhumale
- **Certificate Number**: `#26832`
- **Certificate Type**: Certificate of Completion
- **Internship**: 3 months
- **Designation**: Jr. Software Developer
- **Start Date**: 10/07/2026
- **End Date**: 16/10/2026
- **Authorized Signatory**: Anirudh Hatwar (Director / Authorized Signatory)
- **Company**: Cosmogeek Software Solutions Pvt. Ltd.
- **Verification ID**: `cg-26832-7a8e`
- **Public Verification Link**: `http://localhost:3000/verify/cg-26832-7a8e`
- **PDF Download**: `http://localhost:3000/api/download/26832`

---

## 🧪 Automated Testing

Run the test suite using Node's test runner:
```powershell
npm test
```
Or directly:
```powershell
npx tsx --test src/**/*.test.ts
```

All 14 unit tests pass cleanly:
1. `Database initializes and seeds default admin and reference certificate`
2. `Session token signing and tamper verification`
3. `Rate limiting tracks failed login attempts and blocks after threshold`
4. `Certificate revocation updates status and prevents valid display`
5. `getDashboardMetrics returns accurate counts`
6. `ensureMasterTemplateExists creates and preserves template without corruption`
7. `generateQrPngBuffer returns valid PNG bytes`
8. `generateQrDataUrl returns formatted data URL`
9. `generateCertificatePdf generates valid PDF and embeds QR without overwriting template`
10. `CertificateInputSchema accepts valid input`
11. `CertificateInputSchema rejects empty recipient name`
12. `CertificateInputSchema rejects invalid date ranges (endDate before startDate)`
13. `calculateInternshipDuration calculates months accurately`
14. `formatDateToIndianStandard formats YYYY-MM-DD to DD/MM/YYYY`

---

## 📱 Verification & Revocation Workflow Guide

### How to Issue a New Certificate:
1. Log in to the Admin Dashboard.
2. Click **"Generate Certificate"** in the navigation bar.
3. Fill in student name, designation (e.g. `Cloud & DevOps Intern`), and dates.
4. The duration is auto-calculated (e.g. `3 months`), with an optional manual override.
5. Click **"Issue Certificate & Generate QR Verification Code"**.
6. The system compiles the PDF, embeds the unique QR code, saves the record, and presents the live QR code, Download PDF button, and verification link.

### How to Verify a Certificate:
- **Via Phone**: Open your smartphone camera and scan the QR code on the certificate PDF. It opens the verification portal.
- **Direct Link**: Visit `http://localhost:3000/verify/<verificationId>`.
- **Search Registry**: Open the public portal and enter any Certificate Number or Verification ID in the search bar.

### How to Revoke a Certificate:
1. Go to **"All Certificates"** in the Admin Dashboard.
2. Click the red **Revoke** icon next to any valid certificate.
3. Enter the official audit reason in the confirmation dialog.
4. Click **"Confirm Revocation"**.
5. The certificate status immediately changes to `REVOKED`. Anyone scanning the QR code or visiting the URL will now see the `CREDENTIAL REVOKED` notice.

---

## 🔒 Security Hardening

- **No Arbitrary File Reads**: `/api/download/:certificateNumber` sanitizes inputs strictly to alphanumeric characters and validates against directory traversal (`path.resolve`).
- **Database Parameterization**: All SQL queries use prepared statements with parameter binding to prevent SQL injection.
- **Data Minimization on Verification**: The public verification endpoint omits private student email addresses, administrator IDs, and internal notes.
- **Rate Limiting**: Failed authentication attempts trigger a temporary block to protect against brute-force attacks.

---

## 🚀 Production Deployment & HTTPS Setup

To deploy the application to a production server (AWS EC2, VPS, or Cloud Run):
1. Set `NODE_ENV="production"` in your environment variables.
2. Set `PUBLIC_BASE_URL="https://yourdomain.com"` (so QR codes encode the real HTTPS domain).
3. Build the frontend assets:
   ```powershell
   npm run build
   ```
4. Start the production server:
   ```powershell
   npm start
   ```

---

## 💾 Backup & Data Persistence

- **Database Backup**: Copy `data/certificates.sqlite` to an encrypted offline storage or cloud bucket.
- **Certificate Storage Backup**: Archive the `storage/certificates/` directory.

© 2026 Cosmogeek Software Solutions Pvt. Ltd. All rights reserved.
