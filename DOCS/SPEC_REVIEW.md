# SPEC.md — Review & Open Issues

> **Reviewer:** Claude (Cowork)
> **Reviewing:** `DOCS/SPEC.md` v1.0 (May 2026)
> **Verdict:** Strong, well-structured Draft 1.0. Several decisions need resolving before Phase 1 build can land cleanly, and a few practical concerns aren't yet addressed.

The findings below are grouped by severity. **Critical** items should be answered before scaffolding goes far; **Important** items can be parked until Phase 2 but flagged today; **Minor** items are nice-to-haves.

---

## Critical (resolve before/during Phase 1)

### C1. Parent identity model is internally inconsistent
- §3.3 says parents have **no separate login** and use the student's credentials.
- Open Question #3 confirms this.
- §4.2 defines `Parents.user_id → Users`, which only makes sense if parents *do* have their own auth record.

These two cannot both be true. Pick one:

- **Option A — Shared login:** Drop `Parents.user_id`. Store parent contact details (name, whatsapp_number, preferred_language) directly on `Parents`, keyed only by `id`. Push tokens then belong to whoever installed the app on the device, which is the student/parent shared account.
- **Option B — Parents have their own account:** Keep `Parents.user_id`, give parents a `parent` role in `Users`, and let them log in. This is more code but cleaner long-term and unlocks per-parent push notifications.

**Recommended:** Option B. Shared logins create real-world support pain (lost passwords for kids, multi-device login, role confusion at the UI layer). The "parents as their own users" model also future-proofs the app if the school later wants parent-only features (billing dashboard, payment history, etc.).

### C2. Push-notification routing collides with shared-login model
§3.4 says students receive push reminders; §3.3 says parents share student credentials; §7 says reminders go to all three of teachers/students/parents via push. If a parent and student share an account, the push token is shared too — there's no way to send "the parent reminder" to the parent's device alone. Resolution depends on C1.

### C3. Pricing resolution for ad-hoc attendance is undefined
§5.3 allows adding an ad-hoc student to a lesson instance who isn't on any matching `Enrolment`. §6.1 step 3 says price is resolved from `Pricing` matched on instrument + teacher + lesson type + duration, falling back to `override_price` if set. But for an ad-hoc attendee with no enrolment, there's no guarantee a matching `Pricing` row exists or that the rate is correct for them.

**Decision needed:** Either (a) require `override_price` whenever `is_adhoc = true` (enforce via CHECK constraint or trigger), or (b) define a fallback rate per template (e.g. `Lesson_Templates.adhoc_price`).

### C4. Academic calendar is missing
The school will close for half-terms, Easter, summer, bank holidays, OFAAL exam weeks, etc. Auto-generating instances from active templates without a calendar will create lessons on closed days, which then have to be hand-cancelled. Add a small `Calendar_Days` table (`date`, `kind = closure | term_break | exam_week`, optional `note`), and skip generation on those days.

### C5. Invoice numbering scheme is missing
The `Invoices` table has no `invoice_number` field. UK businesses generally need a unique, sequential number per invoice (HMRC). Add `invoice_number text unique not null` and decide on a format (e.g. `2026-0001`). This matters even if invoices are PDF-only.

---

## Important (resolve before Phase 2/3)

### I1. Invoice due date and "overdue" trigger
`Invoices.status` includes `overdue`, but there's no `due_date` column and no rule defining when `sent` flips to `overdue`. Add `due_date` and a daily job (or computed status) to handle the transition.

### I2. Lesson-instance generation horizon
"Rolling basis" (§5.3) needs to be specified: how many weeks ahead? What happens when a template is created retroactively, or a student joins a template mid-period — do we backfill instances? Suggest: generate 8 weeks ahead, regenerate when template changes (preserving any cancellations / overrides on existing instances).

### I3. Capacity enforcement on ad-hoc adds
When `is_adhoc = true` would push a lesson over `max_capacity` (or `capacity_override`), what happens? Hard block, soft warning + audit, or admin-only override? Either spec the rule or add a CHECK trigger.

### I4. Teacher substitutions / cover lessons
The spec only allows cancelling a lesson (§5.3). Real schools sub teachers when one is sick. Either allow `Lesson_Instances.teacher_override` (FK to Teachers, nullable), or document the workaround (cancel + ad-hoc re-create).

### I5. Authentication mechanism unspecified
"Supabase Auth" doesn't say whether you want email+password, magic link, OTP, phone-based, or SSO. Pick one for Phase 1. **Recommended:** email + password for admins/teachers; magic link or OTP for parents/students (lower-friction, no password reset support burden).

### I6. `Users` ↔ `auth.users` mapping
Supabase has its own `auth.users` table. The convention is to mirror the auth UUID into your app's `Users.id` and create a `handle_new_user()` trigger that inserts into `Users` after signup. Spec should confirm this so the schema can FK against `auth.users(id)` directly.

### I7. Soft-delete / history-preservation policy
Students can be "deactivated" and templates "deactivated". Historical invoices need their FKs intact forever. Add a project-wide rule: **no hard deletes** on entities referenced by any historical billing or attendance record. Soft-delete via `is_active` or `deleted_at`.

### I8. Pricing supersession explicit logic
"Most recent wins, where `effective_from ≤ lesson date`" is fine, but should be stated as the canonical resolution rule and ideally implemented as a SQL function so the lookup is consistent across invoice generation, UI rate display, and any reports.

### I9. Audit trail beyond fee overrides
Only `override_price` is audited (`overridden_by`, `overridden_at`). For a billing system, you'll want at least: pricing changes, enrolment status changes, invoice voids, attendance amendments. Suggest a single `Audit_Log` table (`actor_user_id`, `entity_type`, `entity_id`, `action`, `before_jsonb`, `after_jsonb`, `at`).

### I10. Time-zone handling
`Lesson_Templates.start_time` is `time` (no zone). Assumed Europe/London? DST changes will shift the "12 hours before" reminder by an hour twice a year if not handled. Either store templates in `Europe/London` and compute reminders in that zone, or store start times as `timestamptz` per instance.

---

## Minor / nice-to-have

### M1. `currency` column on Pricing
Spec says GBP-only (Open Question #5). The `currency` column is dead weight. Drop it or keep it as a default with a CHECK constraint.

### M2. Multi-parent invoice copies
§3.3 supports multiple parents linked, with one primary. The other parents currently don't get the invoice. Cheap fix: also include their `whatsapp_number` in the WhatsApp send dialog or send a copy.

### M3. Grade progression flow
No mechanism for a student moving Grade 3 → Grade 4. Manual edit on the enrolment? Tied to an exam result? Worth at least an Open Question entry.

### M4. Uniqueness constraints
`Users.email` and `Users.phone` should likely be unique. `Instruments.name` similarly.

### M5. GDPR / data retention / consent (UK + minors)
The spec doesn't mention consent capture, data-retention windows, or right-to-erasure flow. With minors and UK data this should be addressed before launch — add to Open Questions.

### M6. Web vs mobile UX priorities
The app targets all three platforms but doesn't say where attendance is expected to be marked. If teachers mark attendance on phones during a lesson, the mobile attendance flow is the most important screen in the app and should drive UX priorities.

### M7. WhatsApp dispatch is admin-driven, not automated
§7 implies WhatsApp reminders happen via a background job, but `wa.me` requires a user gesture in the WhatsApp app. Clarify that "WhatsApp reminder" = the system queues a reminder that the admin (or parent themselves, in a self-service flow) actions on their device. Or reframe the channel as "push notification with a deep link to send".

### M8. Pricing granularity may be too fine
Indexing `Pricing` by `instrument + teacher + lesson_type + duration` creates a lot of rows when most teachers charge the same. Consider a single base price per `instrument + lesson_type + duration` with optional `teacher_id` override (NULL = applies to all teachers).

### M9. `Parents.preferred_language`
Captured but unused. State which languages and where it's applied (likely the WhatsApp message template).

### M10. `Reminders.recipient_id`
With C1/C2 unresolved, "who is the recipient" is ambiguous. Resolve C1 first.

### M11. README is essentially empty
The repo's `README.md` is just `# tanpura`. Worth adding a short pitch + "see DOCS/SPEC.md" pointer.

---

## What's strong about the spec

- The phased roadmap is realistic and well-scoped.
- The data model covers most of the real complexity (override pricing, ad-hoc attendees, snapshot line items, RLS-friendly structure).
- Snapshot pricing on `Invoice_Line_Items` is the right call — protects historical invoices from rate changes.
- Splitting `Lesson_Templates` from `Lesson_Instances` is the correct shape for a recurring-schedule app.
- The permissions matrix in §8 is concrete enough to translate directly into RLS.
- Open Questions are meaningfully resolved with decisions, not just left as TODOs.

---

## Suggested next moves

1. Decide C1 (parent identity model) — this changes auth, push routing, and the `Parents` table shape.
2. Decide C3 (ad-hoc pricing) — small but blocks `Attendance`.
3. Add C4 (calendar) + C5 (invoice numbering) to the data model.
4. Park I1–I10 in the Open Questions table for now; revisit before Phase 2/3.
5. Proceed with Phase 1 scaffold — none of the above blocks the Phase 1 schema if we make conservative choices and document them as defaults.

For the Phase 1 scaffold below, I've assumed:
- **C1 → Option B** (parents have their own login via Supabase Auth).
- **C5** → added `invoice_number` placeholder (Phase 3 work, but column reserved).
- **I5** → email + password Supabase Auth.
- **I6** → `Users.id` FK's `auth.users(id)`; `handle_new_user()` trigger created.
- **I7** → soft-delete via `is_active` flags; no hard deletes on historical entities.

These are easy to revisit; flag any you want changed before we go further.
