# Gnosis Kaksha — UI Redesign Spec

Goal: Move from a generic AI-generated purple/blue gradient template to a clean, professional EdTech look (think Physics Wallah / Byju's style). Fix all contrast/visibility bugs and standardize spacing, color, and typography.

## 1. Color Palette (from ColorHunt swatch)

Use these as CSS variables / Tailwind theme extension:

```
--color-primary-dark:   #2E5EAA   /* navy blue - headings, navbar text, footer bg */
--color-primary:        #1295D8   /* medium blue - primary buttons, links, active states */
--color-primary-light:  #50B4F2   /* light blue - secondary accents, icons, hover */
--color-primary-pale:   #CDE6F7   /* pale blue - section backgrounds, cards, badges */

--color-text-heading:   #1A2B4A   /* near-navy, almost black - for all headings */
--color-text-body:      #4A5568   /* dark gray - body copy */
--color-text-muted:     #718096   /* muted gray - captions/dates */
--color-bg-page:        #FFFFFF
--color-bg-section-alt: #F7FAFC   /* very light gray-blue for alternating sections */
```

Remove all existing purple (#7C3AED-ish) and the harsh purple→blue hero gradient. Replace gradients with:
```
--gradient-hero: linear-gradient(135deg, #2E5EAA 0%, #1295D8 100%);
--gradient-cta:  linear-gradient(135deg, #1295D8 0%, #50B4F2 100%);
```

## 2. Global Typography Fixes

- Base font-size: increase from 16px → **17px** (or 18px on desktop ≥1024px).
- Heading scale:
  - H1 (hero): 48px → **56px**, font-weight 800
  - H2 (section titles e.g. "Why Choose Gnosis Kaksha?", "Gallery", "Our Expert Teachers"): 32px → **40px**, font-weight 700
  - H3 (card titles): 18px → **20px**, font-weight 600
  - Body text: 14-15px → **16-17px**, line-height 1.6
- Set ALL heading colors to `--color-text-heading` (#1A2B4A). Never use light gray/white text on white/light backgrounds.

## 3. CRITICAL BUG — Invisible Text (fix first, highest priority)

The following elements are currently invisible or near-invisible (white/very light text on white/light backgrounds). Change their `color` to `--color-text-heading` (#1A2B4A):

- [ ] "Expert Teachers" card title (Why Choose section)
- [ ] "Comprehensive Curriculum" card title
- [ ] "Quality Certifications" card title
- [ ] "Global Community" card title
- [ ] "Building Global Learners" caption (About section image box)
- [ ] Teacher name labels: "Ankur Kumar Nath", "Jumki Roy", "Priya Sharma", "Rajesh Kumar"
- [ ] Step indicator labels under numbers 2-6 in Admission Form ("Step 2" ... "Step 6")
- [ ] "Fee Breakdown" heading in Admission Form sidebar

Audit the whole codebase for any `text-white`, `text-gray-100/200/300`, or `opacity-30/40/50` classes applied to text sitting on white or light-gray backgrounds — these are the source of the bug.

## 4. Navbar

- Background: white, with a subtle bottom border (`1px solid #E2E8F0`) or soft shadow on scroll.
- Logo "GK" badge: change from purple square to `--color-primary` (#1295D8) background, white text.
- "Gnosis Kaksha" wordmark: `--color-text-heading`, font-weight 700.
- Nav links (Home, Gallery, Notices): `--color-text-body`, hover → `--color-primary`.
- "Admission" button: solid `--color-primary` background, white text, rounded-lg (8px), padding `10px 24px`. Remove the purple/gradient version.

## 5. Hero Section

- Background: `--gradient-hero` (navy → medium blue), much less saturated/garish than current purple.
- Heading "Learn From The Best": white text at full opacity (currently the "The Best" portion uses a low-contrast yellow gradient — replace with `--color-primary-light` or just white for consistency).
- Body paragraph: white text at 90% opacity (not 60-70%) — increase font-size to 17-18px.
- "Start Admission" button: white background, `--color-primary-dark` text, bold. On hover: `--color-primary-pale` background.
- "Watch Demo" button: transparent with white border (1.5px), white text. On hover: white bg, navy text.
- **Replace the empty "Learning Dashboard" placeholder box**: either
  - (a) Add a real illustration/screenshot of the dashboard, or
  - (b) If no asset available, redesign the placeholder: use `--color-primary-pale` background (not translucent purple), a properly-sized icon in `--color-primary`, and bold `--color-text-heading` label text — make it look intentional, not like a missing-image fallback.

## 6. "Why Choose Gnosis Kaksha?" Section

- Section background: white.
- "Why Choose Gnosis Kaksha?" heading: `--color-text-heading`, 40px, centered.
- Subtitle "Comprehensive education solutions...": `--color-text-body`, 18px, centered.
- Each card:
  - Background: white
  - Border: `1px solid #E2E8F0` or subtle shadow (`box-shadow: 0 2px 8px rgba(0,0,0,0.06)`)
  - Border-radius: 12px
  - Padding: 24px
  - Icon: change from outline purple icons to filled icons in `--color-primary`, inside a circular `--color-primary-pale` badge (48-56px diameter)
  - Title: `--color-text-heading`, 20px, font-weight 600 (FIX — currently invisible)
  - Description: `--color-text-body`, 16px

## 7. About Section

- "About Gnosis Kaksha" heading: `--color-text-heading`, 40px.
- Body paragraphs: `--color-text-body`, 17px, line-height 1.7.
- Quote block ("Education is the most powerful tool..."): 
  - Left border: 4px solid `--color-primary`
  - Background: `--color-primary-pale` at low opacity, or `--color-bg-section-alt`
  - Text: italic, `--color-text-heading`, 18px
  - Padding: 16px 24px
- Right-side "Building Global Learners" box:
  - Replace flat translucent-purple gradient box with `--color-primary-pale` background
  - Globe icon: `--color-primary`, larger (64px)
  - "Building Global Learners" text: `--color-text-heading`, 18px, font-weight 600 (FIX — currently invisible)
  - Consider adding a subtle illustration instead of empty box

## 8. Gallery Section

- "Gallery" heading: `--color-text-heading`, 40px, centered.
- Subtitle: `--color-text-body`, 18px, centered.
- Gallery cards (Classroom Learning, Digital Learning, Collaborative Learning, Expert Training):
  - **Fix the broken/missing images** — "Classroom Learning", "Expert Training" currently show plain gray boxes with no image. Either source real photos or use consistent illustrations/icons for all 4 cards (don't mix real photo + gray placeholder).
  - Card overlay label: dark gradient overlay (`linear-gradient(to top, rgba(26,43,74,0.8), transparent)`) at bottom, white text, font-weight 600 — ensure label is readable on every card including the gray placeholders.
  - Border-radius: 12px on all 4 cards.
- "View All Gallery" button: outline style — `1px solid --color-primary`, text `--color-primary`, hover fills with `--color-primary-pale`.

## 9. "Our Expert Teachers" Section

- Heading + subtitle: same treatment as Gallery section heading.
- Teacher cards:
  - White background, border `1px solid #E2E8F0`, border-radius 12px, padding 20px, centered content.
  - Avatar illustrations: keep, but increase size slightly to 96px, center.
  - Teacher name (FIX — currently invisible): `--color-text-heading`, 18px, font-weight 600.
  - Subject label ("Mathematics", "English" etc.): `--color-primary`, 14px, font-weight 500, in a small pill badge with `--color-primary-pale` background.
- "View All Teachers" button: same outline style as "View All Gallery".

## 10. CTA Banner ("Ready to Start Your Learning Journey?")

- Background: `--gradient-cta` (medium → light blue) — replace current purple/blue gradient.
- Heading: white, 36px, font-weight 700.
- Subtitle: white at 90% opacity, 18px.
- "Apply Now" button: white background, `--color-primary-dark` text, bold, padding `12px 32px`, border-radius 8px, hover → `--color-primary-pale` background.

## 11. Notices Page

- Page heading "Notices": `--color-text-heading`, 40px.
- Subtitle: `--color-text-body`, 18px.
- "Important Notices" section label: `--color-primary-dark`, 20px, font-weight 700, with pin icon in `--color-primary`.
- Notice cards (pinned):
  - White background, left border 4px `--color-primary` (replace current red — red implies urgent/error, not appropriate for general announcements)
  - Title: `--color-text-heading`, 18px, font-weight 600
  - Body: `--color-text-body`, 15px
  - Date: `--color-text-muted`, 13px
  - border-radius: 8px, shadow `0 1px 4px rgba(0,0,0,0.05)`
- "Latest Updates" cards: same styling but no colored left border, just border `1px solid #E2E8F0`.

## 12. Admission Form

- Page heading "Admission Form": `--color-text-heading`, 40px.
- Subtitle: `--color-text-body`, 18px.
- Step indicator (1-6 circles):
  - Active step: `--color-primary` background, white number, white label text below
  - Inactive steps: `--color-primary-pale` background, `--color-primary-dark` number
  - **FIX**: Step labels ("Step 2"..."Step 6") currently invisible — set to `--color-text-muted`, 13px, all steps (not just active)
  - Connect circles with a line: `--color-primary-pale` for incomplete, `--color-primary` for completed
- Form container: white background, border-radius 12px, shadow `0 4px 12px rgba(0,0,0,0.06)`, padding 32px.
- "Personal Information" section heading: `--color-text-heading`, 22px, font-weight 700, margin-bottom 16px.
- Input fields:
  - Label: `--color-text-body`, 14px, font-weight 500, margin-bottom 6px
  - Input border: `1px solid #CBD5E0`, border-radius 8px, padding `12px 14px`, font-size 16px
  - Focus state: border `--color-primary`, subtle box-shadow `0 0 0 3px rgba(18,149,216,0.15)`
  - Placeholder text: `--color-text-muted` (ensure visible — currently looks too faint)
- "Next" button: `--gradient-cta` or solid `--color-primary`, white text, full-width, padding 14px, border-radius 8px, font-weight 600.
- "Fee Breakdown" sidebar card (FIX — currently invisible):
  - Background: `--color-bg-section-alt`
  - Border: `1px solid #E2E8F0`, border-radius 12px, padding 20px
  - "Fee Breakdown" heading: `--color-text-heading`, 18px, font-weight 700 (currently invisible — fix color)
  - "Complete the form to see billing details": `--color-text-muted`, 14px

## 13. Spacing/Layout General Rules

- Section vertical padding: standardize to `80px` top/bottom on desktop, `48px` on mobile.
- Max content width: 1200px, centered.
- Consistent border-radius across all cards/buttons/inputs: use **8px** for buttons/inputs, **12px** for cards.
- Consistent shadow for elevated elements: `0 2px 8px rgba(0,0,0,0.06)`.

## Implementation Order (priority)

1. Section 3 — fix all invisible text (quick wins, biggest visual impact)
2. Section 1 + 2 — swap color palette + typography scale globally
3. Section 4, 5, 10 — navbar, hero, CTA banner (gradient/color swap)
4. Section 6, 7, 9 — card redesigns (Why Choose, About, Teachers)
5. Section 8 — gallery image fixes
6. Section 11, 12 — Notices and Admission Form polish
