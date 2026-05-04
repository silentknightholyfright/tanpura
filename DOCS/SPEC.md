# Music School Management App — Product Specification

> **Status:** Draft v1.0  
> **Last updated:** May 2026  
> **Author:** TBD

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [User Roles](#3-user-roles)
4. [Data Model](#4-data-model)
5. [Core Features & Functions](#5-core-features--functions)
6. [Invoicing & Payments](#6-invoicing--payments)
7. [Notifications & Reminders](#7-notifications--reminders)
8. [Permissions & Access Control](#8-permissions--access-control)
9. [Build Roadmap](#9-build-roadmap)
10. [Open Questions](#10-open-questions)

---

## 1. Overview

A cross-platform app to manage the day-to-day operations of an Oriental Fine Arts Academy music school. The primary goal is to streamline student and parent management, lesson scheduling, attendance tracking, and invoice generation.

**Key facts:**
- 100+ active students
- Lessons are primarily group-based, with some 1-1 sessions
- Students can be enrolled in multiple instruments simultaneously
- Grading follows the **OFAAL (Oriental Fine Arts Academy of London)** board — Grades 1 through 8
- Payments are received via bank transfer; the app handles invoice generation only
- Invoices are delivered to parents via WhatsApp using `wa.me` deep links

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React Native + Expo | Single codebase for iOS, Android, and Web |
| Backend / DB | Supabase | PostgreSQL database, authentication, file storage, row-level security |
| Notifications | Expo Notifications + Firebase | Push notifications to all user types |
| PDF Generation | react-native-html-to-pdf | Invoice PDF generation |
| WhatsApp Delivery | `wa.me` deep links | One-tap invoice sending to parents |

---

## 3. User Roles

There are four roles in the system. All users share a single `Users` table with a `role` field.

### 3.1 Admin
- Full access to all data and functions
- Manages lesson templates, student enrolments, pricing, and invoices
- Can override fees for any student on any lesson
- Only role that can create and manage lesson templates

### 3.2 Teacher
- Access limited to their own students and lesson instances
- Can mark attendance for their own lessons
- Can waive or amend fees for their own students (no admin approval required)
- Can view their own schedule

### 3.3 Parent
- Parents do not have a separate login — they are linked to a student profile and use the student's login credentials
- Can view lesson schedule, attendance history, and invoices for their linked child
- Receives push notifications and WhatsApp invoice messages
- A student can have multiple parents/guardians linked to their profile; one is flagged as the primary invoice recipient

### 3.4 Student
- Can view their own schedule and attendance
- Receives push notification reminders for upcoming lessons

---

## 4. Data Model

### 4.1 Entity Overview

15 tables across 5 logical groups:

| Group | Tables |
|---|---|
| Identity & Access | Users, Parents |
| People | Teachers, Students, Student_Parents |
| Catalogue | Instruments, Grades |
| Enrolment & Scheduling | Enrolments, Lesson_Templates, Template_Enrolments, Lesson_Instances, Attendance |
| Pricing & Billing | Pricing, Invoices, Invoice_Line_Items, Reminders |

### 4.2 Identity & Access

#### `Users`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| email | string | |
| phone | string | |
| role | enum | `admin` \| `teacher` \| `student` \| `parent` |
| full_name | string | |
| push_token | string | For push notifications |
| created_at | timestamp | |

#### `Parents`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | → Users |
| whatsapp_number | string | Used for wa.me invoice links |
| preferred_language | string | |

### 4.3 People

#### `Teachers`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | → Users |
| bio | text | |

#### `Students`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | → Users |
| date_of_birth | date | |
| emergency_contact | string | |

#### `Student_Parents`
Junction table linking students to their parents/guardians.

| Field | Type | Notes |
|---|---|---|
| student_id | uuid FK | → Students |
| parent_id | uuid FK | → Parents |
| relationship | string | `mother` \| `father` \| `guardian` |
| is_primary | boolean | Flags primary invoice recipient |

### 4.4 Catalogue

#### `Instruments`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | string | e.g. Oud, Piano, Violin |
| is_active | boolean | |

#### `Grades`
Grades are per instrument, following OFAAL levels 1–8.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| level | int | 1 – 8 |
| label | string | e.g. "Grade 3" |
| instrument_id | uuid FK | → Instruments |

### 4.5 Enrolment & Scheduling

#### `Enrolments`
The core relationship. Each record represents one student learning one instrument with one teacher.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid FK | → Students |
| teacher_id | uuid FK | → Teachers |
| instrument_id | uuid FK | → Instruments |
| grade_id | uuid FK | → Grades |
| status | enum | `active` \| `paused` \| `dropped` |
| start_date | date | |
| end_date | date | Nullable |

#### `Lesson_Templates`
Defines the recurring schedule for a lesson. Managed by admin only.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| teacher_id | uuid FK | → Teachers |
| instrument_id | uuid FK | → Instruments |
| type | enum | `1-1` \| `group` |
| day_of_week | int | 0 = Monday … 6 = Sunday |
| start_time | time | |
| duration_mins | int | |
| room | string | |
| is_active | boolean | |
| max_capacity | int | Default 10 for group lessons; overridable per instance by teacher or admin |

#### `Template_Enrolments`
Links which enrolments (students) are assigned to which recurring lesson template.

| Field | Type | Notes |
|---|---|---|
| template_id | uuid FK | → Lesson_Templates |
| enrolment_id | uuid FK | → Enrolments |
| joined_at | date | |

#### `Lesson_Instances`
Each actual occurrence of a lesson, generated from its template.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| template_id | uuid FK | → Lesson_Templates |
| date | date | |
| status | enum | `scheduled` \| `cancelled` \| `done` |
| cancelled_reason | text | Nullable |
| capacity_override | int | Nullable — overrides template max_capacity for this instance |

#### `Attendance`
Tracks each student's presence at each lesson instance. Also handles ad-hoc students and fee overrides.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| instance_id | uuid FK | → Lesson_Instances |
| student_id | uuid FK | → Students |
| status | enum | `present` \| `absent` \| `late` |
| is_adhoc | boolean | True if student not on the template |
| override_price | decimal | Nullable — overrides standard pricing if set |
| override_reason | string | Nullable — e.g. "late cancellation", "goodwill" |
| overridden_by | uuid FK | → Users (nullable) |
| overridden_at | timestamp | Nullable |

### 4.6 Pricing & Billing

#### `Pricing`
Rates vary by instrument, teacher, lesson type, and duration. The `effective_from` date allows future rate changes without affecting historical invoices.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| instrument_id | uuid FK | → Instruments |
| teacher_id | uuid FK | → Teachers |
| lesson_type | enum | `1-1` \| `group` |
| duration_mins | int | |
| amount | decimal | |
| currency | string | GBP |
| effective_from | date | |

#### `Invoices`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid FK | → Students |
| parent_id | uuid FK | → Parents (primary recipient) |
| period_start | date | |
| period_end | date | |
| total_amount | decimal | |
| status | enum | `draft` \| `sent` \| `paid` \| `overdue` |
| sent_at | timestamp | Nullable |
| paid_at | timestamp | Nullable — marked manually |
| pdf_url | string | Supabase storage URL |

#### `Invoice_Line_Items`
One row per lesson attended within the billing period. `unit_price` is a snapshot of the rate at billing time.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| invoice_id | uuid FK | → Invoices |
| instance_id | uuid FK | → Lesson_Instances |
| description | string | e.g. "Oud · Group · 45min · 12 May" |
| unit_price | decimal | Snapshot — never changes after creation |
| quantity | int | Always 1 per attendance record |
| line_total | decimal | |

#### `Reminders`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| instance_id | uuid FK | → Lesson_Instances |
| recipient_id | uuid FK | → Users |
| channel | enum | `push` \| `whatsapp` |
| scheduled_at | timestamp | |
| sent_at | timestamp | Nullable |
| status | enum | `pending` \| `sent` \| `failed` |

---

## 5. Core Features & Functions

### 5.1 Student & Parent Management *(Phase 1)*
- Create, edit, and deactivate student profiles
- Link one or more parents/guardians to a student; flag primary invoice recipient
- Enrol a student into an instrument with a teacher and OFAAL grade
- A student can hold multiple active enrolments (different instruments)
- View all enrolments per student

### 5.2 Lesson Template Management *(Phase 1 — admin only)*
- Create recurring lesson templates (day, time, duration, room, teacher, instrument, type)
- Assign enrolled students to templates
- Deactivate a template without deleting historical instances

### 5.3 Lesson Instance & Attendance *(Phase 2)*
- Auto-generate lesson instances from active templates on a rolling basis
- Mark each student as present, absent, or late
- Add an ad-hoc student to a specific instance (flagged with `is_adhoc = true`)
- Cancel an entire lesson session with an optional reason
- Teacher or admin can waive or amend the fee for a student on a specific lesson, with a free-text reason

### 5.4 Custom Scheduling *(Phase 2)*
- Create a one-off lesson instance not tied to a template (e.g. makeup lesson, holiday workshop)

### 5.5 Pricing Management *(Phase 1 — admin only)*
- Define rates by instrument + teacher + lesson type + duration
- Set an `effective_from` date to schedule future price changes
- Historical invoices are unaffected by price updates

---

## 6. Invoicing & Payments

### 6.1 Invoice Generation Flow
1. Admin selects a student and billing period (start date → end date)
2. App queries all `Attendance` records where `status = present` within the period
3. For each attendance record, price is resolved as:
   - `override_price` if set on the attendance record
   - Otherwise, the applicable `Pricing` record (matched by instrument + teacher + lesson type + duration, where `effective_from` ≤ lesson date — most recent wins)
4. Line items are created and `total_amount` is calculated
5. A PDF invoice is generated using `react-native-html-to-pdf`
6. PDF is stored in Supabase storage; URL saved to `Invoices.pdf_url`

### 6.2 WhatsApp Delivery
- Admin taps "Send via WhatsApp"
- App opens a pre-filled `wa.me` link using the parent's `whatsapp_number`:
  ```
  https://wa.me/[number]?text=Hi [Parent name], please find attached [Student name]'s invoice for [period]. Total due: £[amount].
  ```
- Admin attaches the PDF and sends manually
- Admin marks invoice as `sent` in the app

### 6.3 Payment Tracking
- Payments are received via bank transfer outside the app
- Admin manually marks an invoice as `paid` (sets `paid_at` timestamp)
- Invoice statuses: `draft` → `sent` → `paid` (or `overdue` if past due date unpaid)

### 6.4 Fee Overrides
- Teachers and admins can set `override_price` on any attendance record they have access to
- A `override_price` of `£0.00` represents a full waiver — the lesson still appears as a line item at £0
- `override_reason` and `overridden_by` are logged for audit purposes
- Teachers can only override attendance records for their own lesson instances

---

## 7. Notifications & Reminders

- Reminders are sent to **teachers, students, and parents** ahead of each lesson
- Delivery channel: **push notification** (all users) and **WhatsApp** (parents)
- Reminders are scheduled as `Reminders` records and dispatched by a background job
- Reminder timing: **12 hours before** each lesson
- Overdue invoices trigger an automatic WhatsApp reminder to the linked parent
- Failed reminders are logged with `status = failed` for retry

---

## 8. Permissions & Access Control

Implemented using Supabase Row Level Security (RLS).

| Action | Admin | Teacher | Parent | Student |
|---|---|---|---|---|
| Manage lesson templates | ✅ | ❌ | ❌ | ❌ |
| Manage pricing | ✅ | ❌ | ❌ | ❌ |
| View all students | ✅ | ❌ | ❌ | ❌ |
| View own students | ✅ | ✅ | ❌ | ❌ |
| Mark attendance | ✅ | ✅ (own lessons) | ❌ | ❌ |
| Override fees | ✅ | ✅ (own lessons) | ❌ | ❌ |
| Generate invoices | ✅ | ❌ | ❌ | ❌ |
| View own invoice | ✅ | ❌ | ✅ | ❌ |
| View own schedule | ✅ | ✅ | ✅ | ✅ |
| View child's data | — | — | ✅ | — |

---

## 9. Build Roadmap

### Phase 1 — Foundation (4–6 weeks)
- Supabase project setup, schema creation, RLS policies
- Expo project scaffolding (navigation, auth flow)
- User authentication (Supabase Auth)
- Student profiles and enrolment management
- Parent linking
- Lesson template creation (admin)
- Pricing configuration (admin)
- Instrument and grade catalogue setup

### Phase 2 — Scheduling & Operations (4–6 weeks)
- Lesson instance generation from templates
- Attendance marking (present / absent / late)
- Ad-hoc student addition to lesson instances
- Fee override per attendance record
- Lesson cancellation
- Custom (one-off) lesson creation
- Push notification reminders

### Phase 3 — Billing & Polish (3–4 weeks)
- Invoice generation from attendance records
- PDF creation and Supabase storage
- WhatsApp deep link delivery
- Manual payment tracking (mark as paid)
- Invoice status management
- Basic revenue reporting for admin
- UI polish and edge case handling

---

## 10. Open Questions

| # | Question | Status | Decision |
|---|---|---|---|
| 1 | What is the default reminder timing before a lesson? | ✅ Decided | 12 hours before |
| 2 | Should overdue invoices trigger an automatic WhatsApp reminder? | ✅ Decided | Yes |
| 3 | Do students need their own login, or is access parent-only for younger students? | ✅ Decided | Students log in; parents are linked on the student profile and use the student login |
| 4 | Is there a maximum class size per group lesson template? | ✅ Decided | 10 by default; can be amended per lesson instance by teacher or admin |
| 5 | Should the app support multiple currencies, or GBP only? | ✅ Decided | GBP only |
| 6 | Are makeup lessons billed at the same rate as regular lessons? | ✅ Decided | Yes |

---

*This document was produced through a collaborative ideation session and represents the agreed spec as of v1.0. It should be updated as decisions are made and the build progresses.*
