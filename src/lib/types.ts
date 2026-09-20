// Hand-written subset of database types for Phase 1 + 2.
// Once you wire up `supabase gen types typescript`, replace these with
// generated types from supabase/types/database.types.ts.
//
// Note: 'parent' is retained in UserRole because the enum value still exists
// in Postgres (it cannot be dropped without a full table rebuild). It should
// never be assigned to a real user — parents share the student's login.
// See DOCS/ADR/ADR-001-parent-identity-model.md

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';
export type EnrolmentStatus = 'active' | 'paused' | 'dropped';
export type LessonType = '1-1' | 'group';
export type LessonInstanceStatus = 'scheduled' | 'cancelled' | 'done';
export type AttendanceStatus = 'present' | 'absent' | 'late';
export type CalendarDayKind = 'closure' | 'term_break' | 'exam_week';

export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  full_name: string | null;
  push_token: string | null;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

// Parents are contact records only — no user_id, no auth account.
// Linked to students via the student_parents junction table.
export interface Parent {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp_number: string | null;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface StudentParent {
  student_id: string;
  parent_id: string;
  relationship: 'mother' | 'father' | 'guardian';
  is_primary: boolean;
  created_at: string;
}

export interface LessonInstance {
  id: string;
  template_id: string | null;
  teacher_id: string | null;
  instrument_id: string | null;
  type: LessonType | null;
  date: string;
  start_time: string | null;
  duration_mins: number | null;
  room: string | null;
  status: LessonInstanceStatus;
  cancelled_reason: string | null;
  capacity_override: number | null;
  is_one_off: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  instance_id: string;
  student_id: string;
  status: AttendanceStatus;
  is_adhoc: boolean;
  override_price: number | null;
  override_reason: string | null;
  overridden_by: string | null;
  overridden_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarDay {
  id: string;
  date: string;
  kind: CalendarDayKind;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
