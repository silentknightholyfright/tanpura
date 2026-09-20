// ============================================================================
// Tanpura — Supabase query layer
//
// Typed helpers for every admin CRUD operation. All functions return either
// { data, error: null } or { data: null, error: string } so callers can
// handle errors without try/catch at the call site.
// ============================================================================

import { supabase } from './supabase';
import {
  AttendanceStatus,
  CalendarDayKind,
  EnrolmentStatus,
  LessonType,
  Parent,
  UserProfile,
} from './types';

// ── Shared result shape ───────────────────────────────────────────────────────

type Ok<T> = { data: T; error: null };
type Err = { data: null; error: string };
type Result<T> = Ok<T> | Err;

function ok<T>(data: T): Ok<T> { return { data, error: null }; }
function err(msg: string): Err  { return { data: null, error: msg }; }

// ── Embedded row shapes ───────────────────────────────────────────────────────

export interface StudentRow {
  id: string;
  date_of_birth: string | null;
  emergency_contact: string | null;
  is_active: boolean;
  /** True for parent-submitted children awaiting admin confirmation. */
  pending_review: boolean;
  /** Set when the student was created directly by an admin (no auth account yet). */
  full_name: string | null;
  email: string | null;
  /** Null for admin-created students who haven't registered via auth yet. */
  user: Pick<UserProfile, 'id' | 'full_name' | 'email' | 'phone'> | null;
}

/** Resolves the best available display name for a student regardless of whether
 *  they have an auth account. */
export function studentDisplayName(s: Pick<StudentRow, 'full_name' | 'user'>): string {
  return s.user?.full_name ?? s.full_name ?? '(unnamed)';
}

/** Resolves the best available email for a student. */
export function studentDisplayEmail(s: Pick<StudentRow, 'email' | 'user'>): string | null {
  return s.user?.email ?? s.email ?? null;
}

export interface ParentLinkRow {
  is_primary: boolean;
  relationship: string;
  parent: Parent;
}

export interface EnrolmentRow {
  id: string;
  status: EnrolmentStatus;
  start_date: string;
  end_date: string | null;
  teacher: { id: string; user: Pick<UserProfile, 'full_name'> };
  instrument: { id: string; name: string };
  grade: { id: string; level: number; label: string };
}

export interface StudentDetail extends StudentRow {
  parent_links: ParentLinkRow[];
  enrolments: EnrolmentRow[];
}

export interface TeacherRow {
  id: string;
  is_active: boolean;
  user: Pick<UserProfile, 'id' | 'full_name' | 'email'>;
}

export interface InstrumentRow {
  id: string;
  name: string;
  is_active: boolean;
}

export interface GradeRow {
  id: string;
  level: number;
  label: string;
  instrument_id: string;
}

export interface LessonTemplateRow {
  id: string;
  type: LessonType;
  day_of_week: number;
  start_time: string;
  duration_mins: number;
  room: string | null;
  is_active: boolean;
  max_capacity: number;
  teacher: { id: string; user: Pick<UserProfile, 'full_name'> };
  instrument: { id: string; name: string };
}

export interface TemplateEnrolmentRow {
  enrolment_id: string;
  joined_at: string;
  enrolment: {
    id: string;
    student: { id: string; user: Pick<UserProfile, 'full_name'> };
    instrument: { name: string };
    grade: { label: string };
  };
}

// ── Approval ──────────────────────────────────────────────────────────────────

export interface PendingUserRow {
  id: string;
  full_name: string | null;
  email: string;
  role: 'student' | 'parent';
  created_at: string;
}

export async function getPendingUsers(): Promise<Result<PendingUserRow[]>> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, created_at')
    .eq('is_approved', false)
    .in('role', ['student', 'parent'])
    .order('created_at');
  if (error) return err(error.message);
  return ok(data as PendingUserRow[]);
}

export async function approveUser(userId: string): Promise<Result<void>> {
  // 1. Approve the user
  const { error } = await supabase
    .from('users')
    .update({ is_approved: true })
    .eq('id', userId);
  if (error) return err(error.message);

  // 2. Create role-specific profile row
  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name, email')
    .eq('id', userId)
    .single();

  if (profile?.role === 'parent') {
    await supabase
      .from('parents')
      .upsert(
        {
          user_id: userId,
          full_name: profile.full_name ?? null,
          email: profile.email ?? null,
          preferred_language: 'en',
        },
        { onConflict: 'user_id', ignoreDuplicates: true },
      );
  } else {
    // student (default for any unrecognised role)
    await supabase
      .from('students')
      .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  }

  return ok(undefined);
}

export async function rejectUser(userId: string): Promise<Result<void>> {
  const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
  if (error) return err(error.message);
  return ok(undefined);
}

// ── Catalogue ─────────────────────────────────────────────────────────────────

export async function getInstruments(): Promise<Result<InstrumentRow[]>> {
  const { data, error } = await supabase
    .from('instruments')
    .select('id, name, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) return err(error.message);
  return ok(data as InstrumentRow[]);
}

export async function getGrades(instrumentId: string): Promise<Result<GradeRow[]>> {
  const { data, error } = await supabase
    .from('grades')
    .select('id, level, label, instrument_id')
    .eq('instrument_id', instrumentId)
    .order('level');
  if (error) return err(error.message);
  return ok(data as GradeRow[]);
}

// ── Teachers ──────────────────────────────────────────────────────────────────

export async function getTeachers(): Promise<Result<TeacherRow[]>> {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, is_active, user:users(id, full_name, email)')
    .eq('is_active', true)
    .order('full_name', { foreignTable: 'users' });
  if (error) return err(error.message);
  return ok(data as unknown as TeacherRow[]);
}

// ── Teachers (extended) ───────────────────────────────────────────────────────

export interface TeacherDetail extends TeacherRow {
  templates: Array<{
    id: string;
    type: LessonType;
    day_of_week: number;
    start_time: string;
    duration_mins: number;
    room: string | null;
    is_active: boolean;
    instrument: { name: string };
  }>;
}

export async function getTeacherDetail(teacherId: string): Promise<Result<TeacherDetail>> {
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      id, is_active,
      bio,
      user:users(id, full_name, email, phone),
      templates:lesson_templates(
        id, type, day_of_week, start_time, duration_mins, room, is_active,
        instrument:instruments(name)
      )
    `)
    .eq('id', teacherId)
    .single();
  if (error) return err(error.message);
  return ok(data as unknown as TeacherDetail);
}

/** All approved users who don't yet have a teachers row — candidates for promotion. */
export async function getPromotableUsers(): Promise<Result<UserProfile[]>> {
  // Fetch existing teacher user_ids first
  const { data: existing, error: eErr } = await supabase
    .from('teachers')
    .select('user_id');
  if (eErr) return err(eErr.message);

  const teacherUserIds = (existing ?? []).map((r: { user_id: string }) => r.user_id);

  let query = supabase
    .from('users')
    .select('id, full_name, email, phone, role, is_active, is_approved, push_token, created_at, updated_at')
    .neq('role', 'admin')
    .eq('is_active', true)
    .order('full_name');

  if (teacherUserIds.length > 0) {
    query = query.not('id', 'in', `(${teacherUserIds.join(',')})`);
  }

  const { data, error } = await query;
  if (error) return err(error.message);
  return ok(data as UserProfile[]);
}

export async function promoteToTeacher(
  userId: string,
  bio: string | null,
): Promise<Result<{ teacherId: string }>> {
  // 1. Update role and ensure approved
  const { error: uErr } = await supabase
    .from('users')
    .update({ role: 'teacher', is_approved: true })
    .eq('id', userId);
  if (uErr) return err(uErr.message);

  // 2. Create teachers row
  const { data, error: tErr } = await supabase
    .from('teachers')
    .insert({ user_id: userId, bio: bio || null })
    .select('id')
    .single();
  if (tErr) return err(tErr.message);

  return ok({ teacherId: (data as { id: string }).id });
}

export async function updateTeacher(
  teacherId: string,
  updates: { bio?: string | null; is_active?: boolean },
): Promise<Result<void>> {
  const { error } = await supabase
    .from('teachers')
    .update(updates)
    .eq('id', teacherId);
  if (error) return err(error.message);
  return ok(undefined);
}

// ── Students ──────────────────────────────────────────────────────────────────

export async function getStudents(): Promise<Result<StudentRow[]>> {
  const { data, error } = await supabase
    .from('students')
    .select('id, date_of_birth, is_active, pending_review, full_name, email, user:users(id, full_name, email, phone)')
    .eq('is_active', true);
  if (error) return err(error.message);

  const sorted = (data as unknown as StudentRow[]).sort((a, b) =>
    (a.user?.full_name ?? '').localeCompare(b.user?.full_name ?? ''),
  );
  return ok(sorted);
}

export async function getStudent(studentId: string): Promise<Result<StudentDetail>> {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id, date_of_birth, emergency_contact, is_active, pending_review, full_name, email,
      user:users(id, full_name, email, phone),
      parent_links:student_parents(
        is_primary, relationship,
        parent:parents(id, full_name, email, whatsapp_number, preferred_language)
      ),
      enrolments(
        id, status, start_date, end_date,
        teacher:teachers(id, user:users(full_name)),
        instrument:instruments(id, name),
        grade:grades(id, level, label)
      )
    `)
    .eq('id', studentId)
    .single();
  if (error) return err(error.message);
  return ok(data as unknown as StudentDetail);
}

export async function createStudent(data: {
  full_name: string;
  email: string | null;
  date_of_birth: string | null;
  emergency_contact: string | null;
}): Promise<Result<{ id: string }>> {
  const { data: row, error } = await supabase
    .from('students')
    .insert(data)
    .select('id')
    .single();
  if (error) return err(error.message);
  return ok(row as { id: string });
}

export async function updateStudent(
  studentId: string,
  updates: { date_of_birth?: string | null; emergency_contact?: string | null; full_name?: string | null; email?: string | null },
): Promise<Result<void>> {
  const { error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', studentId);
  if (error) return err(error.message);
  return ok(undefined);
}

export async function updateUserProfile(
  userId: string,
  updates: { full_name?: string; phone?: string | null },
): Promise<Result<void>> {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);
  if (error) return err(error.message);
  return ok(undefined);
}

export async function deactivateStudent(studentId: string): Promise<Result<void>> {
  const { error } = await supabase
    .from('students')
    .update({ is_active: false })
    .eq('id', studentId);
  if (error) return err(error.message);
  return ok(undefined);
}

// ── Parents ───────────────────────────────────────────────────────────────────

export async function createParent(
  studentId: string,
  parentData: {
    full_name: string;
    email: string | null;
    whatsapp_number: string | null;
    preferred_language: string;
    relationship: 'mother' | 'father' | 'guardian';
    is_primary: boolean;
  },
): Promise<Result<void>> {
  // 1. Create the parent record
  const { data: parent, error: parentErr } = await supabase
    .from('parents')
    .insert({
      full_name: parentData.full_name,
      email: parentData.email,
      whatsapp_number: parentData.whatsapp_number,
      preferred_language: parentData.preferred_language,
    })
    .select('id')
    .single();
  if (parentErr) return err(parentErr.message);

  // 2. If is_primary, clear any existing primary flag first
  if (parentData.is_primary) {
    await supabase
      .from('student_parents')
      .update({ is_primary: false })
      .eq('student_id', studentId);
  }

  // 3. Link parent to student
  const { error: linkErr } = await supabase
    .from('student_parents')
    .insert({
      student_id: studentId,
      parent_id: parent.id,
      relationship: parentData.relationship,
      is_primary: parentData.is_primary,
    });
  if (linkErr) return err(linkErr.message);

  return ok(undefined);
}

export async function updateParent(
  parentId: string,
  updates: Partial<Pick<Parent, 'full_name' | 'email' | 'whatsapp_number' | 'preferred_language'>>,
): Promise<Result<void>> {
  const { error } = await supabase
    .from('parents')
    .update(updates)
    .eq('id', parentId);
  if (error) return err(error.message);
  return ok(undefined);
}

export async function updateParentLink(
  studentId: string,
  parentId: string,
  updates: { relationship?: string; is_primary?: boolean },
): Promise<Result<void>> {
  if (updates.is_primary) {
    await supabase
      .from('student_parents')
      .update({ is_primary: false })
      .eq('student_id', studentId);
  }
  const { error } = await supabase
    .from('student_parents')
    .update(updates)
    .match({ student_id: studentId, parent_id: parentId });
  if (error) return err(error.message);
  return ok(undefined);
}

export async function removeParentLink(
  studentId: string,
  parentId: string,
): Promise<Result<void>> {
  const { error } = await supabase
    .from('student_parents')
    .delete()
    .match({ student_id: studentId, parent_id: parentId });
  if (error) return err(error.message);
  return ok(undefined);
}

// ── Enrolments ────────────────────────────────────────────────────────────────

export async function createEnrolment(data: {
  student_id: string;
  teacher_id: string;
  instrument_id: string;
  grade_id: string;
  start_date: string;
}): Promise<Result<{ id: string }>> {
  const { data: row, error } = await supabase
    .from('enrolments')
    .insert({ ...data, status: 'active' })
    .select('id')
    .single();
  if (error) return err(error.message);
  return ok(row as { id: string });
}

export async function updateEnrolmentStatus(
  enrolmentId: string,
  status: EnrolmentStatus,
): Promise<Result<void>> {
  const { error } = await supabase
    .from('enrolments')
    .update({ status, end_date: status === 'dropped' ? new Date().toISOString().slice(0, 10) : null })
    .eq('id', enrolmentId);
  if (error) return err(error.message);
  return ok(undefined);
}

// ── Lesson Templates ──────────────────────────────────────────────────────────

export async function getLessonTemplates(): Promise<Result<LessonTemplateRow[]>> {
  const { data, error } = await supabase
    .from('lesson_templates')
    .select(`
      id, type, day_of_week, start_time, duration_mins, room, is_active, max_capacity,
      teacher:teachers(id, user:users(full_name)),
      instrument:instruments(id, name)
    `)
    .order('day_of_week')
    .order('start_time');
  if (error) return err(error.message);
  return ok(data as unknown as LessonTemplateRow[]);
}

export async function createLessonTemplate(data: {
  teacher_id: string;
  instrument_id: string;
  type: LessonType;
  day_of_week: number;
  start_time: string;
  duration_mins: number;
  room: string | null;
  max_capacity: number;
}): Promise<Result<{ id: string }>> {
  const { data: row, error } = await supabase
    .from('lesson_templates')
    .insert(data)
    .select('id')
    .single();
  if (error) return err(error.message);
  return ok(row as { id: string });
}

export async function updateLessonTemplate(
  templateId: string,
  updates: Partial<{
    teacher_id: string;
    instrument_id: string;
    type: LessonType;
    day_of_week: number;
    start_time: string;
    duration_mins: number;
    room: string | null;
    max_capacity: number;
    is_active: boolean;
  }>,
): Promise<Result<void>> {
  const { error } = await supabase
    .from('lesson_templates')
    .update(updates)
    .eq('id', templateId);
  if (error) return err(error.message);
  return ok(undefined);
}

// ── Template Enrolments ───────────────────────────────────────────────────────

export async function getTemplateEnrolments(
  templateId: string,
): Promise<Result<TemplateEnrolmentRow[]>> {
  const { data, error } = await supabase
    .from('template_enrolments')
    .select(`
      enrolment_id, joined_at,
      enrolment:enrolments(
        id,
        student:students(id, user:users(full_name)),
        instrument:instruments(name),
        grade:grades(label)
      )
    `)
    .eq('template_id', templateId);
  if (error) return err(error.message);
  return ok(data as unknown as TemplateEnrolmentRow[]);
}

/** Active enrolments NOT yet assigned to this template */
export async function getEligibleEnrolments(
  templateId: string,
  instrumentId: string,
): Promise<Result<EnrolmentRow[]>> {
  // Fetch enrolment IDs already on this template
  const { data: existing, error: exErr } = await supabase
    .from('template_enrolments')
    .select('enrolment_id')
    .eq('template_id', templateId);
  if (exErr) return err(exErr.message);

  const excludeIds = (existing ?? []).map((r: { enrolment_id: string }) => r.enrolment_id);

  let query = supabase
    .from('enrolments')
    .select(`
      id, status, start_date, end_date,
      teacher:teachers(id, user:users(full_name)),
      instrument:instruments(id, name),
      grade:grades(id, level, label)
    `)
    .eq('instrument_id', instrumentId)
    .eq('status', 'active');

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data, error } = await query;
  if (error) return err(error.message);
  return ok(data as unknown as EnrolmentRow[]);
}

export async function addStudentToTemplate(
  templateId: string,
  enrolmentId: string,
): Promise<Result<void>> {
  const { error } = await supabase
    .from('template_enrolments')
    .insert({ template_id: templateId, enrolment_id: enrolmentId });
  if (error) return err(error.message);
  return ok(undefined);
}

export async function removeStudentFromTemplate(
  templateId: string,
  enrolmentId: string,
): Promise<Result<void>> {
  const { error } = await supabase
    .from('template_enrolments')
    .delete()
    .match({ template_id: templateId, enrolment_id: enrolmentId });
  if (error) return err(error.message);
  return ok(undefined);
}

// ── Pricing ───────────────────────────────────────────────────────────────────

export interface PricingRow {
  id: string;
  instrument_id: string;
  teacher_id: string;
  lesson_type: LessonType;
  duration_mins: number;
  amount: number;
  effective_from: string;
  instrument: { id: string; name: string };
  teacher: { id: string; user: Pick<UserProfile, 'full_name'> };
}

export async function getPricing(): Promise<Result<PricingRow[]>> {
  const { data, error } = await supabase
    .from('pricing')
    .select(`
      id, instrument_id, teacher_id, lesson_type, duration_mins, amount, effective_from,
      instrument:instruments(id, name),
      teacher:teachers(id, user:users(full_name))
    `)
    .order('effective_from', { ascending: false });
  if (error) return err(error.message);
  return ok(data as unknown as PricingRow[]);
}

export async function createPricing(data: {
  instrument_id: string;
  teacher_id: string;
  lesson_type: LessonType;
  duration_mins: number;
  amount: number;
  effective_from: string;
}): Promise<Result<void>> {
  const { error } = await supabase.from('pricing').insert(data);
  if (error) return err(error.message);
  return ok(undefined);
}

export async function updatePricing(
  pricingId: string,
  updates: Partial<{
    lesson_type: LessonType;
    duration_mins: number;
    amount: number;
    effective_from: string;
  }>,
): Promise<Result<void>> {
  const { error } = await supabase.from('pricing').update(updates).eq('id', pricingId);
  if (error) return err(error.message);
  return ok(undefined);
}

export async function deletePricing(pricingId: string): Promise<Result<void>> {
  const { error } = await supabase.from('pricing').delete().eq('id', pricingId);
  if (error) return err(error.message);
  return ok(undefined);
}

// ── Calendar Days ─────────────────────────────────────────────────────────────

export async function getCalendarDays(from: string, to: string) {
  const { data, error } = await supabase
    .from('calendar_days')
    .select('id, date, kind, note')
    .gte('date', from)
    .lte('date', to)
    .order('date');
  if (error) return err(error.message);
  return ok(data);
}

export async function createCalendarDay(data: {
  date: string;
  kind: CalendarDayKind;
  note?: string;
}): Promise<Result<void>> {
  const { error } = await supabase.from('calendar_days').insert(data);
  if (error) return err(error.message);
  return ok(undefined);
}

// ── Teacher: My Schedule ──────────────────────────────────────────────────────

export interface MyLessonRow {
  id: string;
  date: string;
  start_time: string | null;
  duration_mins: number | null;
  type: LessonType | null;
  room: string | null;
  status: 'scheduled' | 'cancelled' | 'done';
  is_one_off: boolean;
  template_id: string | null;
  instrument: { name: string } | null;
  template: { max_capacity: number } | null;
}

/** Resolve users.id → teachers.id (the PK stored in lesson_instances.teacher_id). */
export async function getMyTeacherId(userId: string): Promise<Result<string>> {
  const { data, error } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (error) return err(error.message);
  return ok((data as { id: string }).id);
}

/** Upcoming + today's lessons for the signed-in teacher, 14-day window. */
export async function getMyLessons(userId: string): Promise<Result<MyLessonRow[]>> {
  const teacherResult = await getMyTeacherId(userId);
  if (teacherResult.error) return err(teacherResult.error);

  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('lesson_instances')
    .select(`
      id, date, start_time, duration_mins, type, room, status, is_one_off, template_id,
      instrument:instruments(name),
      template:lesson_templates(max_capacity)
    `)
    .eq('teacher_id', teacherResult.data)
    .gte('date', today)
    .lte('date', horizon)
    .in('status', ['scheduled', 'done'])
    .order('date')
    .order('start_time');
  if (error) return err(error.message);
  return ok(data as unknown as MyLessonRow[]);
}

/** A student slot in an attendance sheet — pre-populated from existing records. */
export interface AttendanceStudent {
  studentId: string;
  enrolmentId: string;
  fullName: string;
  attendanceId: string | null;
  status: AttendanceStatus | null;
}

/**
 * Returns enrolled students for a lesson instance, merged with any
 * existing attendance rows so the UI can show current status.
 */
export async function getInstanceStudents(
  instanceId: string,
  templateId: string,
): Promise<Result<AttendanceStudent[]>> {
  // 1. Students enrolled on this template
  const { data: teRows, error: teErr } = await supabase
    .from('template_enrolments')
    .select(`
      enrolment_id,
      enrolment:enrolments(
        id,
        student:students(
          id,
          user:users(full_name)
        )
      )
    `)
    .eq('template_id', templateId);
  if (teErr) return err(teErr.message);

  // 2. Existing attendance for this instance
  const { data: attRows, error: attErr } = await supabase
    .from('attendance')
    .select('id, student_id, status')
    .eq('instance_id', instanceId);
  if (attErr) return err(attErr.message);

  type AttRow = { id: string; student_id: string; status: AttendanceStatus };
  const attMap = new Map((attRows as AttRow[]).map(a => [a.student_id, a]));

  const students: AttendanceStudent[] = (teRows as any[]).map(te => {
    const student = te.enrolment.student;
    const att = attMap.get(student.id);
    return {
      studentId: student.id,
      enrolmentId: te.enrolment_id,
      fullName: (student.user?.full_name as string | null) ?? '(unnamed)',
      attendanceId: att?.id ?? null,
      status: (att?.status ?? null) as AttendanceStatus | null,
    };
  });

  students.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return ok(students);
}

export async function markInstanceDone(instanceId: string): Promise<Result<void>> {
  const { error } = await supabase
    .from('lesson_instances')
    .update({ status: 'done' })
    .eq('id', instanceId);
  if (error) return err(error.message);
  return ok(undefined);
}

// ── Parent: My Children ───────────────────────────────────────────────────────

export interface ChildRow {
  student_id: string;
  full_name: string;
  date_of_birth: string | null;
  relationship: string;
  is_primary: boolean;
  pending_review: boolean;
}

/** Returns the signed-in parent's linked children via the get_my_children() RPC. */
export async function getMyChildren(): Promise<Result<ChildRow[]>> {
  const { data, error } = await supabase.rpc('get_my_children');
  if (error) return err(error.message);
  return ok((data ?? []) as ChildRow[]);
}

/** Parent submits a child for admin review (no auth account needed). */
export async function addMyChild(
  fullName: string,
  dob: string | null,
  relationship: 'mother' | 'father' | 'guardian',
): Promise<Result<string>> {
  const { data, error } = await supabase.rpc('add_my_child', {
    p_full_name:    fullName,
    p_dob:          dob ?? null,
    p_relationship: relationship,
  });
  if (error) return err(error.message);
  return ok(data as string);
}

/** Admin approves a parent-submitted child (clears pending_review flag). */
export async function approveChildRequest(studentId: string): Promise<Result<void>> {
  const { error } = await supabase
    .from('students')
    .update({ pending_review: false })
    .eq('id', studentId);
  if (error) return err(error.message);
  return ok(undefined);
}

// ── Lesson Instances ──────────────────────────────────────────────────────────

export async function getAttendanceForInstance(instanceId: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      id, status, is_adhoc, override_price, override_reason,
      student:students(id, user:users(full_name))
    `)
    .eq('instance_id', instanceId);
  if (error) return err(error.message);
  return ok(data);
}

export async function upsertAttendance(data: {
  instance_id: string;
  student_id: string;
  status: AttendanceStatus;
  is_adhoc?: boolean;
  override_price?: number | null;
  override_reason?: string | null;
  overridden_by?: string | null;
  overridden_at?: string | null;
}): Promise<Result<void>> {
  const { error } = await supabase
    .from('attendance')
    .upsert(data, { onConflict: 'instance_id,student_id' });
  if (error) return err(error.message);
  return ok(undefined);
}
