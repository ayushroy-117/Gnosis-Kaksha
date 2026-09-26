# Roles & permissions

Source of truth: `src/lib/permissions.ts`. Every API route and server action checks it
server-side (`requirePermission` in `src/lib/authz.ts`), and `src/proxy.ts` gates the
dashboard areas. Roles live in the `profiles` table, which only the server writes.
Signup metadata is ignored.

| Permission | Student | Teacher | Accountant | Admin |
|---|:-:|:-:|:-:|:-:|
| View own portal (profile, fees, notices) | ✓ | | | ✓ (any student, `?as=`) |
| Submit UPI transaction ID for own dues | ✓ | | | |
| Download study material | ✓ | ✓ | ✓ | ✓ |
| Student roster (name, class, subjects, guardian contact) | | ✓ | ✓ | ✓ |
| Full student records incl. fees & scholarship | | | ✓ | ✓ |
| Approve / reject admissions | | | | ✓ |
| Financials: ledger, transactions, reports | | | ✓ | ✓ |
| Approve / reject pending UPI payments | | | ✓ | ✓ |
| Record counter (cash) payments | | | ✓ | ✓ |
| Send WhatsApp fee reminders | | | ✓ | ✓ |
| View subject-allocation requests | | ✓ | ✓ | ✓ |
| Request a subject allocation | | ✓ | | ✓ |
| Approve / reject allocation requests | | | ✓ | ✓ |
| Mark attendance | | ✓ | | ✓ |
| Upload / delete study material | | ✓ | | ✓ |
| Publish / delete notices | | | | ✓ |
| Manage accounts (create staff, change roles, deactivate, reset passwords) | | | | ✓ |

Rules the database enforces on top of this:
- Exactly one `admin` profile (unique index); nobody can be promoted to admin.
- New auth users always start as `student`. Staff roles are set by the admin.
- Public sign-up exists only through the admission form (student role).
- Notices marked *Staff* are never returned to students or the public.
