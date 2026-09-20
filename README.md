# Tanpura

Cross-platform (iOS / Android / Web) management app for an Oriental Fine Arts Academy music school. Built with **Expo (React Native)** and **Supabase**.

See [`DOCS/SPEC.md`](DOCS/SPEC.md) for the full product specification and [`DOCS/SPEC_REVIEW.md`](DOCS/SPEC_REVIEW.md) for outstanding decisions and known gaps.

---

## Repository layout

```
tanpura/
├── DOCS/
│   ├── SPEC.md                      Product specification
│   └── SPEC_REVIEW.md               Review with open issues
├── supabase/
│   ├── config.toml                  Local Supabase CLI config
│   ├── migrations/
│   │   ├── 0001_phase1_schema.sql   Tables, enums, helpers, signup trigger
│   │   └── 0002_phase1_rls.sql      Row-level security policies (Phase 1)
│   └── seed.sql                     Sample instruments + grades
├── src/
│   ├── lib/
│   │   ├── supabase.ts              Supabase client (RN-aware storage)
│   │   ├── auth.tsx                 AuthProvider + useAuth hook
│   │   └── types.ts                 Hand-written DB types (Phase 1)
│   ├── navigation/
│   │   ├── RootNavigator.tsx        Auth vs App switch
│   │   ├── AuthStack.tsx            SignIn / SignUp
│   │   └── AppStack.tsx             Role-routed home
│   └── screens/
│       ├── LoadingScreen.tsx
│       ├── SignInScreen.tsx
│       ├── SignUpScreen.tsx
│       └── home/
│           ├── AdminHomeScreen.tsx
│           ├── TeacherHomeScreen.tsx
│           ├── ParentHomeScreen.tsx
│           └── StudentHomeScreen.tsx
├── App.tsx
├── app.json
├── babel.config.js
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

---

## Phase 1 status

What's scaffolded:

- **Database** — schema for Users, Parents, Teachers, Students, Student_Parents, Instruments, Grades, Enrolments, Lesson_Templates, Template_Enrolments, Pricing.
- **Auth** — Supabase email + password; new `auth.users` rows are auto-mirrored into `public.users` via trigger.
- **RLS** — full permissions matrix from `SPEC.md` §8 enforced via per-table policies.
- **App shell** — Expo + React Navigation, auth-aware root navigator, role-routed home screens.

What's intentionally **not** in Phase 1 (deferred to Phase 2/3):

- `Lesson_Instances`, `Attendance` — Phase 2
- `Invoices`, `Invoice_Line_Items`, `Reminders` — Phase 3
- Background jobs (instance generation, reminder dispatch)
- WhatsApp delivery flow
- PDF generation

A `resolve_price()` SQL function ships now so the rate-resolution rule lives in one place ahead of Phase 3 invoice work.

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

> Versions in `package.json` target Expo SDK 52 / React Native 0.76. If a newer SDK is available, run `npx expo install --fix` to align.

### 2. Set up Supabase

**Local development (recommended):**

```bash
# Install the Supabase CLI if you haven't:
npm install -g supabase

# From the repo root:
supabase start
supabase db reset   # applies migrations + seed
```

`supabase start` prints local URLs and the anon key. Copy them into `.env` (see step 3).

**Hosted project:** create one at [supabase.com](https://supabase.com), then push migrations:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
psql "$DATABASE_URL" < supabase/seed.sql
```

### 3. Configure environment

```bash
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### 4. Run the app

```bash
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run web        # Browser
```

### 5. Promote the first admin

The signup trigger sets every new user's role to `student` and `is_approved = false`. Promote yourself to `admin` from the Supabase SQL editor:

```sql
update public.users
set role = 'admin',
    is_approved = true
where email = 'you@example.com';
```

After signing out and back in you'll land on the Admin home screen. All subsequent student sign-ups will appear in the **Pending approvals** admin section for you to approve or reject.

After signing out and back in, you'll land on the Admin home screen.

---

## Decisions baked into this scaffold

A handful of spec gaps were resolved with conservative defaults so Phase 1 could ship. They're easy to revisit — see `DOCS/SPEC_REVIEW.md` for the full list.

- **Parent identity:** Parents have their own Supabase Auth account (Option B from C1).
- **Auth method:** Email + password.
- **`Users` ↔ `auth.users`:** shared UUID, mirrored via the `handle_new_user()` trigger.
- **Soft delete:** `is_active` flags on user-facing tables; no hard deletes on entities referenced by historical records.

---

## Next steps

In rough order:

1. Resolve the `Critical` items in `DOCS/SPEC_REVIEW.md` (especially C3 ad-hoc pricing, C4 academic calendar, C5 invoice numbering).
2. Build out Phase 1 admin CRUD screens (currently stubs).
3. Generate `Database` types: `supabase gen types typescript --local > src/lib/database.types.ts` and replace `src/lib/types.ts`.
4. Add unit tests (Jest + React Native Testing Library) for the auth provider and role routing.
5. Wire CI: `tsc --noEmit`, `eslint`, and `supabase db lint` on every PR.
