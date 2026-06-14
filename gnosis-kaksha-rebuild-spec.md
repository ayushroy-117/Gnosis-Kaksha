# Gnosis Kaksha — Full Website Rebuild Specification

You are building a complete educational coaching institute website called **Gnosis Kaksha** — a coaching center for students in Classes 5–12 located in Ramkrishna Nagar, Sribhumi, Assam, India. The current site is a PHP mess; you are rebuilding it clean from scratch using a modern stack.

Work through this document section by section. Build one feature fully before moving to the next.

---

## 1. TECH STACK

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database + Auth + Storage**: Supabase
- **Payments**: Razorpay
- **Background removal API**: remove.bg (API key to be supplied in env)
- **Email**: Resend (for admission confirmation emails)
- **Deployment**: Vercel

### Bootstrap commands (run these first, then build features):
```bash
npx create-next-app@latest gnosis-kaksha --typescript --tailwind --eslint --app --src-dir
cd gnosis-kaksha
npm install @supabase/supabase-js @supabase/ssr
npm install razorpay
npm install resend
npm install react-hook-form zod @hookform/resolvers
npm install lucide-react
npm install react-hot-toast
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tabs
```

### Environment variables needed (create `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
REMOVE_BG_API_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_SITE_URL=https://gnosiskaksha.in
```

---

## 2. FOLDER STRUCTURE

```
src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                    ← Homepage
│   │   ├── gallery/page.tsx            ← Full gallery
│   │   ├── notices/page.tsx            ← Notice board
│   │   ├── admission/page.tsx          ← 6-step admission form
│   │   ├── tools/
│   │   │   └── bg-remover/page.tsx     ← Background remover tool
│   │   ├── terms/page.tsx
│   │   ├── privacy/page.tsx
│   │   └── refund/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (student)/
│   │   └── dashboard/page.tsx          ← Student portal (after login)
│   ├── (admin)/
│   │   └── dashboard/page.tsx          ← Admin panel (protected)
│   └── api/
│       ├── admission/route.ts          ← Save admission record
│       ├── payment/create-order/route.ts
│       ├── payment/verify/route.ts
│       ├── contact/route.ts
│       ├── bg-remove/route.ts          ← Proxies remove.bg
│       └── fees/route.ts               ← Returns fee structure for a class
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── GalleryPreview.tsx
│   │   ├── TeachersSection.tsx
│   │   └── ContactForm.tsx
│   ├── admission/
│   │   ├── AdmissionForm.tsx           ← Parent wrapper (manages step state)
│   │   ├── steps/
│   │   │   ├── Step1Personal.tsx
│   │   │   ├── Step2Academic.tsx
│   │   │   ├── Step3Subjects.tsx
│   │   │   ├── Step4Scholarship.tsx
│   │   │   ├── Step5Charges.tsx
│   │   │   └── Step6Payment.tsx
│   │   └── BillingSidebar.tsx          ← Real-time cost summary
│   └── ui/                             ← Reusable: Button, Input, Select, Modal, etc.
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   ← Browser client
│   │   ├── server.ts                   ← Server client (for Server Components & API routes)
│   │   └── types.ts                    ← Auto-generated from Supabase CLI or hand-written
│   ├── fees.ts                         ← Fee rules & scholarship calculator (SINGLE SOURCE OF TRUTH)
│   ├── razorpay.ts
│   └── utils.ts
└── types/
    └── index.ts
```

---

## 3. DATABASE SCHEMA (Supabase / PostgreSQL)

Run this SQL in the Supabase SQL editor to create all tables:

```sql
-- Teachers
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,               -- e.g. "Physics Teacher", "Founder & CEO"
  subjects text[] not null,         -- e.g. ["Physics"]
  qualification text not null,      -- e.g. "B.Sc in Physics Hons"
  photo_url text,
  display_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Gallery images
create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text,
  image_url text not null,
  event_tag text,                   -- e.g. "HSLC Felicitation", "Class 10 Results"
  display_order int default 0,
  is_featured boolean default false,
  created_at timestamptz default now()
);

-- Notices
create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  external_url text,                -- optional link to external notice PDF
  is_pinned boolean default false,
  published_at timestamptz default now(),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Batches / Course plans
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  class_number int not null,        -- 5 to 12
  stream text,                      -- null for classes 5-10; "Science" or "Arts" for 11-12
  batch_name text not null,         -- e.g. "Foundation Batch", "Science Rankers"
  subjects jsonb not null,          -- array of {name, monthly_fee}
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Admissions
create table public.admissions (
  id uuid primary key default gen_random_uuid(),

  -- Personal
  student_name text not null,
  mobile text not null,
  email text,
  gender text not null,             -- "Male" | "Female" | "Others"
  dob date not null,
  religion text,
  category text,                    -- "General" | "OBC" | "SC" | "ST" | etc.
  father_name text not null,
  mother_name text not null,
  guardian_mobile text not null,
  address text not null,

  -- Academic
  board text not null,              -- "SEBA" | "CBSE" | "ICSE"
  class_number int not null,
  stream text,                      -- null | "Science" | "Arts"
  previous_percentage numeric(5,2),

  -- Subjects selected
  selected_subjects jsonb,          -- [{name, monthly_fee}]

  -- Scholarship
  scholarship_percent numeric(5,2) default 0,
  scholarship_amount numeric(10,2) default 0,

  -- Charges
  tshirt_size text,                 -- "XS"|"S"|"M"|"L"|"XL"|"XXL"
  tshirt_fee numeric(10,2) default 600,
  exam_fee numeric(10,2) default 350,

  -- Computed totals (server re-validates on save)
  monthly_tuition numeric(10,2) not null,
  final_payable numeric(10,2) not null,

  -- Documents (Supabase Storage paths)
  student_photo_path text,
  student_signature_path text,
  parent_signature_path text,

  -- Payment
  payment_mode text default 'offline',  -- "online" | "offline"
  payment_status text default 'pending', -- "pending" | "paid" | "failed"
  razorpay_order_id text,
  razorpay_payment_id text,

  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Students (linked to Supabase Auth users)
create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  registration_number text unique,
  full_name text not null,
  parent_name text,
  mobile text,
  class_number int,
  profile_photo_url text,
  admission_id uuid references public.admissions(id),
  created_at timestamptz default now()
);

-- Contact messages
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);
```

After creating tables, enable Row Level Security (RLS) on all tables. Then add these policies:

```sql
-- Public can read teachers, gallery, notices, batches
alter table public.teachers enable row level security;
create policy "Public read teachers" on public.teachers for select using (true);

alter table public.gallery_images enable row level security;
create policy "Public read gallery" on public.gallery_images for select using (true);

alter table public.notices enable row level security;
create policy "Public read notices" on public.notices for select using (is_active = true);

alter table public.batches enable row level security;
create policy "Public read batches" on public.batches for select using (is_active = true);

-- Admissions: anyone can insert, only service role can read/update
alter table public.admissions enable row level security;
create policy "Anyone can insert admission" on public.admissions for insert with check (true);

-- Students: user can only read their own row
alter table public.students enable row level security;
create policy "Student reads own row" on public.students for select using (auth.uid() = user_id);

-- Contact: anyone can insert
alter table public.contact_messages enable row level security;
create policy "Anyone can send message" on public.contact_messages for insert with check (true);
```

---

## 4. FEE RULES (lib/fees.ts)

This is the single source of truth for all fee calculations. Both the client-side billing sidebar and the server-side API route must use this same file/logic.

```typescript
// lib/fees.ts

export const EXAM_FEE = 350;      // ₹ fixed, always added
export const TSHIRT_FEE = 600;    // ₹ fixed, always added (size selection is cosmetic)

// Monthly tuition per subject by class
export const SUBJECT_FEES: Record<number, Record<string, number>> = {
  5:  { "Mathematics": 500, "Science": 500, "English": 500, "Bengali": 400, "Social Science": 400 },
  6:  { "Mathematics": 500, "Science": 500, "English": 500, "Bengali": 400, "Social Science": 400 },
  7:  { "Mathematics": 550, "Science": 550, "English": 500, "Bengali": 400, "Social Science": 400 },
  8:  { "Mathematics": 600, "Science": 600, "English": 500, "Bengali": 450, "Social Science": 450 },
  9:  { "Mathematics": 650, "Science": 650, "English": 550, "Bengali": 450, "History": 450 },
  10: { "Mathematics": 700, "Science": 700, "English": 600, "Bengali": 500, "History": 500 },
  11: {
    // Science stream
    "Physics": 800, "Chemistry": 800, "Biology": 800, "Mathematics": 800, "English": 600,
    // Arts stream
    "History": 650, "Political Science": 650, "Economics": 700, "Bengali": 500,
  },
  12: {
    "Physics": 900, "Chemistry": 900, "Biology": 900, "Mathematics": 900, "English": 650,
    "History": 700, "Political Science": 700, "Economics": 750, "Bengali": 550,
  },
};

// Subjects available by class and stream
export const AVAILABLE_SUBJECTS: Record<string, string[]> = {
  "5":   ["Mathematics","Science","English","Bengali","Social Science"],
  "6":   ["Mathematics","Science","English","Bengali","Social Science"],
  "7":   ["Mathematics","Science","English","Bengali","Social Science"],
  "8":   ["Mathematics","Science","English","Bengali","Social Science"],
  "9":   ["Mathematics","Science","English","Bengali","History"],
  "10":  ["Mathematics","Science","English","Bengali","History"],
  "11-Science": ["Physics","Chemistry","Biology","Mathematics","English"],
  "11-Arts":    ["History","Political Science","Economics","English","Bengali"],
  "12-Science": ["Physics","Chemistry","Biology","Mathematics","English"],
  "12-Arts":    ["History","Political Science","Economics","English","Bengali"],
};

// Scholarship rules: auto-calculated from previous class percentage
export function calculateScholarship(prevPercentage: number): number {
  if (prevPercentage >= 90) return 30;  // 30% discount
  if (prevPercentage >= 80) return 20;  // 20% discount
  if (prevPercentage >= 70) return 10;  // 10% discount
  return 0;
}

// Calculate everything from selected subjects + scholarship %
export function calculateBill(
  selectedSubjects: { name: string; monthly_fee: number }[],
  scholarshipPercent: number
) {
  const monthlyTuition = selectedSubjects.reduce((sum, s) => sum + s.monthly_fee, 0);
  const scholarshipAmount = Math.round((monthlyTuition * scholarshipPercent) / 100);
  const tuitionAfterScholarship = monthlyTuition - scholarshipAmount;
  const mandatoryCharges = EXAM_FEE + TSHIRT_FEE;
  const finalPayable = tuitionAfterScholarship + mandatoryCharges;
  return { monthlyTuition, scholarshipAmount, tuitionAfterScholarship, mandatoryCharges, finalPayable };
}
```

---

## 5. PAGE-BY-PAGE SPECIFICATION

### 5.1 Homepage (`/`)

**Layout:** Shared `<Navbar />` at top, `<Footer />` at bottom.

**Sections in order:**

**A. Navbar**
- Logo: image `/images/official.png` + text "GNOSIS KAKSHA"
- Nav links: Home, Admission, Gallery, Notice, Tools (dropdown with "Background Remover"), Login / Register
- On mobile: hamburger menu

**B. Hero Section**
- Large heading: "GNOSIS KAKSHA — A PLACE FOR EXCELLENCE"
- Subtext: "Transform your learning journey with our innovative educational platform. Join us in creating a brighter future through quality education."
- Two CTA buttons: "Apply for Admission" → `/admission` and "View Gallery" → `/gallery`
- YouTube embed: `https://www.youtube.com/embed/IufL1CDejzg?autoplay=1&mute=1&loop=1&playlist=IufL1CDejzg`
  - Use `<iframe>` with allow="autoplay; encrypted-media" and loading="lazy"
  - Wrap in aspect-ratio container (16:9)

**C. Features Section** — 4 cards in a grid:
1. "Excellence Teaching" — Learn from experienced educators passionate about student success
2. "Quality Learning" — High-quality educational content designed for optimal learning outcomes
3. "Periodical Assessment" — Regular evaluations to track and improve academic progress
4. "Best Teachers" — Learn from industry experts and experienced educators

**D. About Students Section**
- Image: `/images/12-min.jpg` (existing asset, reuse URL)
- Quote: *"If you are always trying to be normal, you will never know how amazing you can be." — Maya Angelou*
- Heading: "About Our Students"

**E. Gallery Preview Section**
- Heading: "Moments From Gnosis Kaksha"
- Subtext: "Classroom energy, celebrations, milestones, and snapshots from everyday learning."
- Fetch latest 8 gallery images from Supabase `gallery_images` table ordered by `display_order`
- Show image + title + caption below each
- Button: "View All Gallery Images" → `/gallery`

**F. Teachers Section**
- Heading: "Our Teachers"
- Fetch all active teachers from Supabase `teachers` table, ordered by `display_order`
- Show as a responsive grid: teacher photo, name, role, qualification
- Paginate server-side: 10 per page with prev/next buttons
- "View All Teachers" link → `/teachers` (or just show all in paginated form here)

**G. Contact Form**
- Fields: Name (text), Email (email), Phone (tel), Message (textarea)
- On submit: POST to `/api/contact` which saves to `contact_messages` table and shows a toast
- Success: "Thank you! Your message has been sent."
- Error: "Unable to send your message. Please fix errors then try again."

**H. Footer**
- Logo + description: "We understand that every student has different needs and capabilities, which is why we create such a wonderful platform that is the best fit for every student."
- Quick Links: Home, Admissions, Notices, Student Portal
- Our Services: Terms & Conditions, Privacy Policy, Refund Policy, Contact
- Contact: Block Road, Ramkrishna Nagar, Sribhumi | +91 8474020124, +91 6900184347 | query@gnosiskaksha.in | Mon–Sun: 06:00am to 07:00pm
- Social icons linking to: facebook.com/gnosiskaksha.in, twitter.com/gnosiskaksha, instagram.com/gnosiskaksha/, linkedin.com/in/ankurknath/, t.me/gnosiskaksha, youtube.com/@gnosiskaksha
- Copyright: "© 2025 GNOSIS KAKSHA. All rights reserved."

---

### 5.2 Admission Page (`/admission`)

This is the most complex page. It is a **6-step multi-step form** with a persistent real-time billing sidebar.

**Layout:**
- Two-column layout on desktop: left = step form (70%), right = billing sidebar (30%)
- On mobile: billing sidebar collapses to an accordion at the top

**Progress indicator:** Numbered steps 1–6 shown at the top. Active step is highlighted. Past steps show a checkmark.

**Step 1 — Personal Details**
Fields (all required unless noted):
- Full Name (text)
- Mobile Number (tel, 10 digits)
- Email (email, optional)
- Gender (select: Male / Female / Others)
- Date of Birth (date)
- Religion (text, optional)
- Category (select: General / OBC / SC / ST)
- Father's Name (text)
- Mother's Name (text)
- Parent/Guardian Mobile (tel, 10 digits)
- Address (textarea)

Validation: name ≥ 3 chars, valid 10-digit mobile, valid email if provided, DOB must be in past.

**Step 2 — Academic Details**
Fields:
- Board (select: SEBA / CBSE / ICSE / Other)
- Current Class (select: 5 / 6 / 7 / 8 / 9 / 10 / 11 / 12)
- Stream (select: Science / Arts — only shown if class is 11 or 12)
- Previous Class Percentage (number, 0–100, step 0.01)
  - On change: auto-calculate scholarship % using `calculateScholarship()` from fees.ts
  - Show a banner: "You qualify for X% scholarship based on your previous result."

**Step 3 — Subjects**
- Fetch available subjects from `AVAILABLE_SUBJECTS` in fees.ts based on class + stream from Step 2
- Show each subject as a checkbox card that shows subject name + monthly fee
- Student selects which subjects they want to enroll in
- On change: update the billing sidebar total in real time

**Step 4 — Scholarship Review**
- Read-only display of:
  - Scholarship Percentage (auto-derived in Step 2): e.g., "20%"
  - Monthly Tuition (sum of selected subject fees): e.g., "₹3,200"
  - Discount Amount (tuition × scholarship%): e.g., "₹640"
  - Tuition After Scholarship: e.g., "₹2,560"
- Show scholarship rules table:
  - 90%+ → 30% off
  - 80–89% → 20% off
  - 70–79% → 10% off
  - Below 70% → No scholarship

**Step 5 — Mandatory Charges & Documents**
- Show non-negotiable fees:
  - Examination Fee: ₹350
  - T-Shirt Fee: ₹600
- T-Shirt Size (select: XS / S / M / L / XL / XXL) — required
- File uploads (all required):
  - Student Photo (JPG/PNG, max 2MB)
  - Student Signature (JPG/PNG, max 1MB)
  - Parent/Guardian Signature (JPG/PNG, max 1MB)
- Upload files to Supabase Storage bucket `admission-documents` using path: `admissions/{timestamp}_{filename}`
- Show preview thumbnails after upload

**Step 6 — Payment & Review**
- Show full summary of all collected data (read-only):
  - Student name, class, stream, board, subjects
  - Scholarship, tuition, discount, mandatory charges
  - **Final Payable amount** (recalculated server-side via `calculateBill()`)
- Checkbox: "I confirm the submitted details match the admission form requirements and the uploaded documents are correct." (required)
- Two buttons:
  1. **Submit & Pay Online** → calls `/api/payment/create-order` → opens Razorpay checkout modal → on success calls `/api/payment/verify` → saves admission → redirect to success page
  2. **Submit & Pay Offline** → calls `/api/admission` directly → saves admission with `payment_mode: "offline", payment_status: "pending"` → redirect to success page

**Billing Sidebar (persistent across all steps)**
Shows in real time:
- Plan: (class + stream or "Not selected")
- Subjects: (count)
- Scholarship: (%)
- Monthly Tuition: ₹X
- Scholarship Discount: –₹X
- Mandatory Charges: +₹950
- **Final Payable: ₹X** (large, bold)

**API routes needed:**

`POST /api/fees` (or just import fees.ts directly into the page as a Server Component)

`POST /api/payment/create-order`:
```
Body: { amount: number, currency: "INR", receipt: string }
Creates a Razorpay order via Razorpay Node SDK.
Returns: { orderId, amount, currency, key }
```

`POST /api/payment/verify`:
```
Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, admissionData }
Validates HMAC signature using RAZORPAY_KEY_SECRET.
On valid: saves admission to DB with payment_status "paid", sends confirmation email via Resend.
Returns: { success: true, admissionId }
```

`POST /api/admission`:
```
Body: full admission form data
Server re-validates all fee calculations using calculateBill().
Saves to admissions table.
Returns: { success: true, admissionId }
```

---

### 5.3 Gallery Page (`/gallery`)

- Heading: "Gnosis Kaksha Gallery"
- Subtext: "Explore classroom highlights, celebrations, student achievements."
- Fetch ALL gallery images from Supabase ordered by `display_order` ascending
- Display as a responsive masonry or uniform grid: image + title + caption
- Lightbox: clicking an image opens it full-screen in a modal overlay with prev/next navigation
- Filter tabs by `event_tag` if present (optional enhancement)
- Current gallery images to seed in DB:
  1. HSLC Batch Felicitation Program — "A proud occasion to honour the hard work, dedication, and success of our HSLC batch students."
  2. Class 10 Board Results 2026 — "Some victories are more than marks… they are proof of hard work, sleepless nights, and dreams fulfilled."
  3. Class 8 Batch — "Meet the Mentors of Class 8th Foundation Batch"
  4. Class 9 Batch — "Meet the Mentors of Class 9th Growth Batch"
  5. Class 10 Batch — "Meet the Mentors of Class 10th Board Achievers Batch"
  6. Class 11 Science Batch — "Meet the Mentors of Class 11 Science Pioneer Batch"
  7. Class 11 Arts Batch — "Meet the Mentors of Class 11 Arts Vision Batch"
  8. Class 12 Science Batch — "Meet the Mentors of Class 12 Science Rankers Batch"
  9. Class 12 Arts Batch — "Meet the Mentors of Class 12 Arts Success Batch"

---

### 5.4 Notice Board Page (`/notices`)

- Heading: "Notice Board"
- Breadcrumb: Notice / Home
- Fetch all active notices from Supabase `notices` table, pinned first, then by `published_at` DESC
- Each notice shows: title, date, and either body content or an external link button ("View Notice →")
- If `external_url` is present, show a button linking to it (open in new tab)
- Seed data from existing site:
  1. "Classes Timing : VI to X" → external_url: http://surl.li/sfglv
  2. "NOTICE" → external_url: https://rb.gy/dvjko6
  3. "Holiday Notice & classes time changes on (17/04/2024)" → external_url: https://rb.gy/zbqi6s

---

### 5.5 Login Page (`/login`)

- Logo + "Welcome Back" heading + "Login to your account"
- Fields: Username or Email (text), Password (password)
- Submit button: "Login"
- Link to: Home, Registration
- On submit: call Supabase `signInWithPassword({ email, password })`
- On success: redirect to `/dashboard`
- On error: show error toast

---

### 5.6 Register Page (`/register`)

- Logo + "Student Registration" heading
- Fields:
  - Full Name (text, required)
  - Registration Number (text, required) — this is given to them by the institute
  - Parent's Name (text, required)
  - Mobile Number (tel, required)
  - Email Address (email, required)
  - Class (select: 5 / 6 / 7 / 8 / 9 / 10, required)
  - Password (password, min 8 chars, required)
  - Profile Photo (file, optional)
- On submit:
  1. Call Supabase `signUp({ email, password })`
  2. If photo provided, upload to Supabase Storage `profile-photos/{userId}`
  3. Insert row into `students` table with registration_number, full_name, parent_name, mobile, class_number, profile_photo_url
  4. Redirect to `/dashboard`
- Links: Login, Home Page

---

### 5.7 Student Dashboard (`/dashboard`)

Protected route — redirect to `/login` if not authenticated.

- Show: "Welcome, [student name]"
- Cards:
  - Class: [class_number]
  - Registration Number: [reg_number]
  - Parent's Name: [parent_name]
  - Mobile: [mobile]
- Profile photo display with option to update
- "Logout" button → calls Supabase `signOut()` → redirect to `/login`
- (Future: study materials, results, fee history)

---

### 5.8 Background Remover Tool (`/tools/bg-remover`)

- Heading: "Free Image Background Remover"
- Subtext: "Upload a JPG or PNG, remove the background in seconds."
- Feature badges: "Drag and drop support", "5 MB secure upload limit", "Transparent PNG and white background export"
- "Best for" section: "Student ID photos, profile pictures, admission form assets"
- Spec: Formats: JPG, PNG | Output: PNG | Limit: 5 MB

**Upload area:**
- Large dashed box with "Drop your image here or click to browse"
- Accepts: image/jpeg, image/png only
- Validates file size ≤ 5MB before upload, shows error if exceeded

**Output style toggle (radio buttons):**
- "Transparent PNG"
- "White background version"

**"Remove Background" button:**
- On click: POST file to `/api/bg-remove`
- Show loading spinner: "Processing your image, please wait..."

**Preview area (two columns):**
- Left: "Original Preview" — shows the uploaded image
- Right: "Processed Result" — shows the result after API call
- "Download Result" button (downloads the processed PNG)

**`/api/bg-remove` route:**
```typescript
// Receives multipart form with: image file + output_type ("rgba" | "white")
// Forwards to remove.bg API:
//   POST https://api.remove.bg/v1.0/removebg
//   Headers: { "X-Api-Key": process.env.REMOVE_BG_API_KEY }
//   Body: FormData with image_file, size: "auto", bg_color (if white: "ffffff")
// Returns the binary PNG response directly to the browser
```

---

### 5.9 Legal Pages

**Terms & Conditions (`/terms`)** — static page with these sections:
- Acceptance of Terms
- User Registration (accurate info required, user responsible for credentials)
- Course Enrollment (subject to availability, institute reserves right to modify)
- Intellectual Property (all materials are institute property, no sharing)
- Code of Conduct (respectful behavior, institute can terminate access)
- Disclaimer of Warranties
- Termination of Services
- Modification of Terms
- Governing Law: Karimganj Court, Assam

**Privacy Policy (`/privacy`)** — static page:
- Gnosis Kaksha respects user privacy
- Data collected is used for educational services
- Limitation of Liability: not liable for indirect/consequential damages

**Refund Policy (`/refund`)** — static page:
- Payments are non-refundable except in major cases
- Cancellation takes effect at end of billing period
- No mid-period refunds

---

## 6. TEACHERS SEED DATA

Insert these into the `teachers` table:

| display_order | name | role | subjects | qualification |
|---|---|---|---|---|
| 1 | Ankur Kumar Nath | Founder & CEO, Physics Teacher | ["Physics"] | B.Sc in Physics Hons |
| 2 | Jumki Roy | English Teacher & Accountant | ["English"] | B.A, M.A |
| 3 | Susmita Nath | Bengali Teacher | ["Bengali"] | B.A, M.A, B.Ed |
| 4 | Barnali Paul | Biology Teacher | ["Biology"] | M.Sc.(Gold), B.Sc.(Silver), B.Ed., CTET |
| 5 | Riya Nath | History Teacher | ["History"] | B.A |
| 6 | Joydeep Dey | Mathematics Teacher | ["Mathematics"] | B.Sc in Maths Hons, B.Ed |
| 7 | Anal Choudhary | English Teacher | ["English"] | B.A, D.EL.ED, ATET |
| 8 | Abu Sahid | Economics Teacher | ["Economics"] | B.A, M.A in Economics, B.Ed |
| 9 | Md. Ali Hasan | History & Political Science Teacher | ["History","Political Science"] | B.A, M.A in History |
| 10 | Sanjib Paul | Mathematics Teacher | ["Mathematics"] | B.Sc |

Photo URLs follow the pattern: `https://gnosiskaksha.in/php/uploaded_profile/[filename]`
You can re-upload these to Supabase Storage or reference them by URL.

---

## 7. BATCHES SEED DATA

Insert these into the `batches` table:

| class | stream | batch_name | subjects (names only — look up fees from fees.ts) |
|---|---|---|---|
| 8 | null | Foundation Batch | Mathematics, Science, English, Bengali, Social Science |
| 9 | null | Growth Batch | Mathematics, Science, English, Bengali, History |
| 10 | null | Board Achievers | Mathematics, Science, English, Bengali, History |
| 11 | Science | Science Pioneers | Physics, Chemistry, Biology, Mathematics, English |
| 11 | Arts | Arts Vision | History, Political Science, Economics, English, Bengali |
| 12 | Science | Science Rankers | Physics, Chemistry, Biology, Mathematics, English |
| 12 | Arts | Arts Success | History, Political Science, Economics, English, Bengali |

---

## 8. CONTACT INFORMATION (hardcode in Footer and Contact section)

```
Institute Name: GNOSIS KAKSHA
Address: Block Road, Ramkrishna Nagar, Sribhumi, Assam
Phone 1: +91 8474020124
Phone 2: +91 6900184347
Email: query@gnosiskaksha.in
Hours: Monday to Sunday, 06:00 AM to 07:00 PM
YouTube video ID: IufL1CDejzg
```

Social links:
- Facebook: https://facebook.com/gnosiskaksha.in
- Twitter: https://twitter.com/gnosiskaksha
- Instagram: https://www.instagram.com/gnosiskaksha/
- LinkedIn: https://www.linkedin.com/in/ankurknath/
- Telegram: https://t.me/gnosiskaksha
- YouTube: https://www.youtube.com/@gnosiskaksha

---

## 9. BUILD ORDER (follow this sequence)

1. Bootstrap the Next.js project + install all packages
2. Create `.env.local` template
3. Write `lib/fees.ts` (fee rules — no dependencies)
4. Write `lib/supabase/client.ts` and `lib/supabase/server.ts`
5. Run the full SQL schema in Supabase
6. Insert seed data (teachers, batches, gallery, notices)
7. Build `components/layout/Navbar.tsx` and `Footer.tsx`
8. Build the Homepage sections one by one (Hero → Features → Gallery Preview → Teachers → Contact)
9. Build `/gallery` page
10. Build `/notices` page
11. Build `/admission` multi-step form:
    a. State management (useReducer or useState for form data across steps)
    b. BillingSidebar component (reads from shared form state)
    c. Step components 1–6 in order
    d. API routes: /api/payment/create-order, /api/payment/verify, /api/admission
12. Build `/login` and `/register` pages
13. Build `/dashboard` (student portal)
14. Build `/tools/bg-remover` and `/api/bg-remove`
15. Build static legal pages (terms, privacy, refund)
16. Final: SEO metadata (next/metadata), favicon, og:image

---

## 10. IMPORTANT IMPLEMENTATION NOTES

- **Never recalculate fees only on the client.** The API routes `/api/payment/create-order` and `/api/admission` must re-run `calculateBill()` from `lib/fees.ts` on the server using the submitted subject data, ignoring the client-submitted `finalPayable`. This prevents fee manipulation.
- **Razorpay signature verification is mandatory.** Before marking any admission as paid, verify the HMAC SHA256 signature: `razorpay_order_id + "|" + razorpay_payment_id` signed with `RAZORPAY_KEY_SECRET`. Reject any payment that fails verification.
- **Supabase Storage buckets to create**: `admission-documents` (private), `profile-photos` (private), `gallery-images` (public), `teacher-photos` (public).
- **Image optimization**: Use `next/image` for all teacher and gallery photos with appropriate width/height.
- **Admission form state**: Keep all 6 steps' data in a single React state object at the top-level `AdmissionForm` component. Pass down as props + setter. Do not use a separate context unless the component tree gets complex.
- **Mobile responsiveness**: The admission form's billing sidebar stacks below the form on mobile screens (< 768px). All grids collapse to single column on mobile.
- **Loading states**: Show skeleton loaders for any server-fetched data (teachers, gallery, notices) using Tailwind `animate-pulse` placeholder divs.
- **Error boundaries**: Wrap each section in a try/catch; if Supabase data fails to load, show a graceful "Content unavailable" message rather than crashing the page.

---

## 11. SUPABASE STORAGE SETUP

Create these storage buckets in Supabase Dashboard → Storage:

| Bucket name | Public | Allowed MIME types | Max file size |
|---|---|---|---|
| `gallery-images` | Yes | image/* | 10 MB |
| `teacher-photos` | Yes | image/* | 5 MB |
| `admission-documents` | No | image/jpeg, image/png, application/pdf | 5 MB |
| `profile-photos` | No | image/* | 3 MB |

---

*End of specification. Build feature by feature, test each before proceeding to the next.*
