# Post-cutover smoke test

Run against https://gnosiskaksha.cloud right after step 9 of `deploy/README.md`.
Use a throwaway email for the test applicant. Delete it afterwards (Admin → Accounts → Deactivate).

Automated version (from a laptop, pointed at production):

```bash
E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... \
E2E_ACCOUNTANT_EMAIL=... E2E_ACCOUNTANT_PASSWORD=... \
E2E_TEACHER_EMAIL=... E2E_TEACHER_PASSWORD=... \
npx playwright test --config playwright.config.ts   # set use.baseURL to the site first
```

Manual checklist:

- [ ] Home, Notices, Gallery, Study Material load; teacher photos show
- [ ] `/admin/dashboard` while signed out → redirected to `/auth`
- [ ] `curl https://gnosiskaksha.cloud/api/admin/students` → 401 (not data)
- [ ] `curl -m5 http://<vps-ip>:3000`, `:8000` and `:5432` from outside → all time out
- [ ] Admin signs in → Accounts & Permissions lists every account; exactly one Master Admin
- [ ] Admin creates an accountant and a teacher account
- [ ] Admission form: pay the test amount by UPI (or use a fake ID for the test and reject it) → submit
      → the "Application Submitted" acknowledgement says *not a receipt*
- [ ] Applicant's dashboard shows "Admission under review"; Fees shows "Pending verification"
- [ ] Accountant → Collections: the submission is in the queue with the right amount and ID
- [ ] Reject with a reason → the student sees the reason and can resubmit
- [ ] Approve → receipt RCPT-YYYY-NNNN; the student's dashboard unlocks; Fees shows the receipt
- [ ] Submitting the same transaction ID again is refused
- [ ] Teacher: Students list has no fee data; saving attendance survives a page reload
- [ ] Teacher uploads a PDF study material; a signed-in student downloads it
- [ ] Nightly backup ran: `ls -lh /var/backups/gnosis` the next morning
