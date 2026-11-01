# ID cards, barcodes and QR verification

## What is on a card

| | Student card | Faculty card |
|---|---|---|
| Identifier | Registration number | Staff ID `GK-FAC-XXXXXX` (accountant `GK-ACC-…`, admin `GK-ADM-…`) |
| Barcode | Code 128 of the identifier | Code 128 of the staff ID |
| QR code | `{SITE_URL}/verify/<reg>` | `{SITE_URL}/verify/staff/<staff id>` |
| Signature on front | Director ("Authorized Signatory") | Director ("Authorized Signatory") |
| Signature on back | Student's own | Cardholder's, generated from their name |

Fee receipts carry the **accountant's** signature, and only receipts do. Their QR goes to `/verify/receipt/<receipt no>`.

Files the institute supplies, dropped into `public/` (see `public/signatures/README.txt`):
`signatures/director.png`, `signatures/accountant.png`, optional `logo-white.png`.

## How the barcode is "activated"

There is nothing to switch on per card. The barcode only carries the identifier; validity is looked up live every time it is scanned:

- **Student**: valid once the admission is approved (`status = active`). Pending or rejected students show NOT VALID.
- **Staff**: valid while `employment_status = active`. Admin sets Resigned or Terminated in *Accounts & Permissions → Staff details & ID*; the card then shows NOT VALID and the person can no longer sign in.

## Scanning

- **Barcode scanner (USB / Bluetooth)**: it types the code and presses Enter. Staff open **Scan ID** (`/scan`), keep the box focused, and scan. The matching verify page opens by itself.
- **Phone camera**: scanning the QR opens the same verify page directly.
- **Who sees what on the verify page**: anyone sees name, class/designation, branch and VALID / NOT VALID. Signed-in staff also see contact details; fee status is shown to accountant and admin only. Teachers are limited to their own branch.

## Staff details

Teachers and accountants get a `staff_details` row (department, phone, father's name, address, date of joining, employment status) plus a photo in `staff_photos`. The admin sets them when creating the account or later via *Staff details & ID*. Migration: `supabase/migrations/20261001000001_staff_profiles.sql`.

## Mobile OTP (admission form)

`/api/otp/send` and `/api/otp/verify` issue a stateless HMAC code and a signed proof that `/api/admission` checks. Delivery is `deliverOtp()` in `src/lib/server/otp.ts`. It is a mock until a provider is wired: outside production the code is shown on screen. In production OTP is enforced only once `OTP_PROVIDER` is set, so a missing SMS gateway never blocks admissions.
