# ADR-001: Parent identity model

**Status:** Accepted
**Date:** 2026-05-04
**Accepted:** May 2026
**Deciders:** Tanpura product owner; OFAAL school administrator
**Related:** `DOCS/SPEC.md` §3.3, §4.2, Open Question #3 · `DOCS/SPEC_REVIEW.md` C1, C2

---

## Context

The spec is internally inconsistent about how parents authenticate to the Tanpura app. Three signals disagree:

- **§3.3 ("Parent")** — *"Parents do not have a separate login — they are linked to a student profile and use the student's login credentials."*
- **§4.2 (`Parents` table)** — defines `Parents.user_id → Users`, which only makes sense if parents have their own auth record.
- **§7 (Notifications)** — *"Reminders are sent to teachers, students, and parents"* via push, with WhatsApp as a second channel for parents. Push tokens are per-device-per-account, so reminder routing is undefined when a parent and student share an account.

The school has 100+ active students, the majority of whom are minors with one or more guardians. Each student can have multiple linked parents, one of whom is flagged as the primary invoice recipient (§4.3 `Student_Parents`). Phase 1 cannot ship until this is resolved because the choice determines:

- The shape of the `Users` and `Parents` tables and FKs.
- Every Supabase RLS policy that currently checks `auth.uid()`.
- The push-notification dispatch model (one device-stream per account vs per role).
- The signup and account-recovery UX (one credential to lose vs one per parent).

### Forces at play

- **Operational simplicity** — fewer accounts means fewer support tickets for forgotten passwords and "my parent locked me out".
- **Audit and accountability** — billing systems benefit from knowing *which human* triggered an action; shared accounts blur that line.
- **Notification routing** — push tokens are bound to the installed app instance, not the role; one account == one stream of reminders.
- **Future feature flexibility** — parent-only features (e.g. payment portal, invoice history, GDPR data-subject requests) become awkward if there is no parent identity.
- **GDPR / minors** — UK GDPR + DPA 2018 requires that consent for processing a minor's data be given by the parent. A separate parent identity makes consent capture and right-to-erasure cleaner.

---

## Decision

**Adopt Option A: parents have no separate login. The student's Supabase Auth account is the single credential for the family.**

Parent contact details (name, WhatsApp number, preferred language) are stored on the `Parents` record and linked to the student via `Student_Parents`. The `Parents` table does **not** carry a `user_id` FK — parents are not auth users.

> **Note — schema correction required:** The Phase 1 schema (`0001_phase1_schema.sql`) was scaffolded with `Parents.user_id → Users` (Option B assumption) and a `parent` enum value in `user_role`. Both must be removed or left unused. A corrective migration is needed before Phase 2 screens are built. See Consequences below.

---

## Options Considered

### Option A — Shared login
Parents do not have their own auth record. The student's Supabase Auth account is the single login used by both the student (typically a child) and the parent(s). The `Parents` table stores contact details only, with no FK to `Users`.

| Dimension              | Assessment                                                                 |
| ---------------------- | -------------------------------------------------------------------------- |
| Complexity             | Low — fewer rows, simpler signup, one auth flow                            |
| Cost                   | Low — fewer monthly active auth users (Supabase pricing)                   |
| Scalability            | Acceptable for 100s of students; same as Option B                          |
| Team familiarity       | High — easy to reason about, fewer moving parts                            |
| Notification routing   | **Poor** — one stream per account, can't differentiate parent vs student   |
| Audit & accountability | **Poor** — every fee-override or attendance edit attributed to the family  |
| Account recovery       | High blast radius — losing the password locks everyone out at once         |
| GDPR consent capture   | Awkward — no clean way to record parental consent separately               |
| Future parent features | Painful — no parent identity to attach a payment portal, DSAR, etc.        |

**Pros**
- Fewest accounts to manage; lowest operational overhead.
- Aligns with the literal wording of spec §3.3.
- One credential per family is conceptually simple for non-technical users.

**Cons**
- Cannot route push notifications differently to parent vs student — §7 cannot be implemented as written.
- All audit trails (`overridden_by`, future enrolment edits, payment marks) point to a shared identity.
- A teenage student logging in from school sees the same account that paid their last invoice.
- Cannot evolve into per-parent features without a future migration.
- Hard to honour GDPR right-to-erasure for one parent without disturbing the others.

---

### Option B — Each parent has their own auth account *(recommended)*
Each parent signs up with their own email + password. `Parents.user_id` FKs to `Users.id`, which mirrors `auth.users.id`. The `Student_Parents` junction continues to link parents to students, with `is_primary` for invoice routing.

| Dimension              | Assessment                                                                  |
| ---------------------- | --------------------------------------------------------------------------- |
| Complexity             | Medium — extra signup flow, additional RLS predicates                       |
| Cost                   | Slightly higher MAUs in Supabase Auth, but well within free/Pro tier        |
| Scalability            | Same as Option A; minor join cost on RLS lookups                            |
| Team familiarity       | High — standard pattern in family/school SaaS                               |
| Notification routing   | **Strong** — separate push tokens per role, addressable independently       |
| Audit & accountability | **Strong** — every action attributable to a specific human                  |
| Account recovery       | Bounded — losing one parent's password doesn't lock the student or sibling  |
| GDPR consent capture   | Clean — consent is a property of the parent record, not the student         |
| Future parent features | Cheap — payment portal, DSARs, statement export trivially scoped per parent |

**Pros**
- Push notifications can be addressed per role exactly as §7 requires.
- Audit trail names a real person, which matters for billing disputes.
- Account recovery is per-individual; no single point of credential failure.
- GDPR right-to-erasure for one parent is a delete on one row, not a family teardown.
- Future Phase 2/3 work (payment portal, parent-only dashboards, statement download) is additive rather than a migration.
- Allows multi-parent invoice copies (M2 in the review) without re-architecting.

**Cons**
- Two extra accounts per family (typical: one student + one or two parents).
- Parents must be onboarded separately — slightly more friction at school sign-up time.
- Three roles' RLS predicates must be tested independently; small additional surface area.

---

### Option C — Parent-as-magic-link-only *(variant of B, considered and rejected)*
Same as Option B, but parents authenticate via email magic link only (no password). Reduces credential management for non-technical parents.

**Pros**
- Lower friction for parents who rarely log in.
- Eliminates "forgot password" support volume.

**Cons**
- Adds a second auth flow to maintain alongside email/password (admins, teachers).
- Requires every parent action to pass through an email round-trip; awkward for time-sensitive invoice review.
- Magic-link UX in React Native + WhatsApp deep-link confusion is a known support pain point.

**Recommendation:** keep Option C as a Phase 2 enhancement (offer magic link as an *additional* sign-in path for the `parent` role), not a Phase 1 substitute.

---

## Trade-off Analysis

The school's operational reality is that parents rarely interact with the app directly — they receive WhatsApp messages and the occasional push notification via the family's shared device. The overhead of a separate parent login (invite flow, credential management, support tickets) outweighs the benefit for this scale (100+ students).

Push notification routing is simplified: all notifications go to the student's push token (the shared family device). WhatsApp messages go to the parent's stored `whatsapp_number` independently of app auth. There is no need for per-parent push tokens.

Billing accountability is maintained via admin and teacher audit fields (`overridden_by`, `overridden_at`) — these reference staff users, not parents, so the shared family login has no impact on the audit trail.

---

## Consequences

**What becomes easier**
- Onboarding is simpler: one signup per family, not one per person.
- No invite-email flow needed for parents — admin just captures their contact details (name, WhatsApp, relationship) at enrolment.
- Fewer Supabase Auth users; lower operational surface area.
- `Parents` table is purely a contact-details record; no auth plumbing needed.

**What becomes harder / watch-outs**
- Push notifications cannot be addressed per-parent — all go to whoever has the app installed (the student's device). This is acceptable given the school's use case.
- If a family ever needs two separate logins (e.g. divorced parents on different devices), the model cannot support it without a schema change. Document this as a known limitation.
- `Parents.user_id` and the `parent` role in the `user_role` enum were baked into the Phase 1 schema under the Option B assumption. **A corrective migration is needed** to drop `Parents.user_id`, remove or leave unused the `parent` enum value, and remove the parent-user RLS policies. See Action Items.
- `0004_phase2_rls.sql` contains `is_student_or_parent_for_instance()` which relies on `parents.user_id = auth.uid()`. This function must be rewritten or removed as part of the corrective migration.

---

## Action Items

- [x] Update `SPEC.md` §3.3 to describe the shared-login model accurately.
- [x] Update `SPEC.md` Open Question #3 with the resolved decision.
- [x] Write corrective migration `0005_fix_parent_identity.sql`:
  - Dropped `parents.user_id` column (FK and unique index dropped automatically).
  - `parent` enum value left in place — Postgres cannot drop enum values without a full table rebuild; it is simply never assigned.
  - Dropped `parents_select_self_or_admin` and `parents_update_self` RLS policies; replaced with `parents_select_admin_teacher_or_student`.
  - Dropped `is_parent_of_student()` and `is_student_or_parent_for_instance()`; rebuilt all dependent policies using `is_self_student()`.
- [x] Update `src/lib/types.ts` — `Parent` interface has no `user_id`; Phase 2 types (`LessonInstance`, `Attendance`, `CalendarDay`, etc.) added.
- [x] Update `AppStack.tsx` — `parent` case removed; `ParentHomeScreen` import removed; comment added explaining why.
- [x] Update `PHASE2_BRIEF.md` to reflect Option A and replace the "parent invite flow" blocker with the corrective migration item.
- [ ] When Phase 3 (`Reminders`) is scoped, verify the dispatch worker sends push to the student's token and WhatsApp to the parent's `whatsapp_number` — do not assume a separate parent push token exists.
