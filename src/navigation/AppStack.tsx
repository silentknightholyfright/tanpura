import React from 'react';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '@/lib/auth';
import { AdminHomeScreen } from '@/screens/home/AdminHomeScreen';
import { TeacherHomeScreen } from '@/screens/home/TeacherHomeScreen';
import { StudentHomeScreen } from '@/screens/home/StudentHomeScreen';
import { ParentHomeScreen } from '@/screens/home/ParentHomeScreen';
import { ParentAddChildScreen } from '@/screens/parent/ParentAddChildScreen';
import { LoadingScreen } from '@/screens/LoadingScreen';

// Admin screens
import { PendingApprovalsScreen } from '@/screens/admin/PendingApprovalsScreen';
import { TeachersScreen } from '@/screens/admin/TeachersScreen';
import { TeacherDetailScreen } from '@/screens/admin/TeacherDetailScreen';
import { PromoteTeacherScreen } from '@/screens/admin/PromoteTeacherScreen';
import { StudentsScreen } from '@/screens/admin/StudentsScreen';
import { StudentDetailScreen } from '@/screens/admin/StudentDetailScreen';
import { AdminAddStudentScreen } from '@/screens/admin/AdminAddStudentScreen';
import { ParentFormScreen } from '@/screens/admin/ParentFormScreen';
import { EnrolmentFormScreen } from '@/screens/admin/EnrolmentFormScreen';
import { LessonTemplatesScreen } from '@/screens/admin/LessonTemplatesScreen';
import { LessonTemplateFormScreen } from '@/screens/admin/LessonTemplateFormScreen';
import { TemplateStudentsScreen } from '@/screens/admin/TemplateStudentsScreen';
import { PricingScreen } from '@/screens/admin/PricingScreen';
import { PricingFormScreen } from '@/screens/admin/PricingFormScreen';

// Teacher screens
import { TeacherScheduleScreen } from '@/screens/teacher/TeacherScheduleScreen';
import { AttendanceScreen } from '@/screens/teacher/AttendanceScreen';

// ParentHomeScreen intentionally omitted — parents share the student login.
// See DOCS/ADR/ADR-001-parent-identity-model.md

export type AppStackParamList = {
  Home: undefined;
  // Admin — approvals
  AdminPendingApprovals: undefined;
  // Admin — teachers
  AdminTeachers: undefined;
  AdminTeacherDetail: { teacherId: string };
  AdminPromoteTeacher: undefined;
  // Admin — students
  AdminStudents: undefined;
  AdminAddStudent: undefined;
  AdminStudentDetail: { studentId: string };
  AdminParentForm: { studentId: string; parentId?: string };
  AdminEnrolmentForm: { studentId: string };
  // Admin — pricing
  AdminPricing: undefined;
  AdminPricingForm: { pricingId?: string };
  // Admin — lesson templates
  AdminLessonTemplates: undefined;
  AdminLessonTemplateForm: { templateId?: string };
  AdminTemplateStudents: { templateId: string; instrumentId: string };
  // Parent
  ParentAddChild: undefined;
  // Teacher
  TeacherSchedule: undefined;
  TeacherAttendance: {
    instanceId: string;
    templateId: string;
    date: string;
    startTime: string | null;
    instrumentName: string;
    lessonType: string | null;
    room: string | null;
    isDone: boolean;
  };
};

const Stack = createNativeStackNavigator<AppStackParamList>();

function HomeForRole(props: NativeStackScreenProps<AppStackParamList, 'Home'>) {
  const { profile } = useAuth();

  if (!profile) return <LoadingScreen message="Loading your profile…" />;

  switch (profile.role) {
    case 'admin':
      return <AdminHomeScreen {...props} />;
    case 'teacher':
      return <TeacherHomeScreen {...props} />;
    case 'parent':
      return <ParentHomeScreen {...props} />;
    case 'student':
    default:
      return <StudentHomeScreen {...props} />;
  }
}

export function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeForRole} options={{ title: 'Tanpura' }} />

      {/* Admin — approvals */}
      <Stack.Screen name="AdminPendingApprovals" component={PendingApprovalsScreen} options={{ title: 'Pending Approvals' }} />

      {/* Admin — teachers */}
      <Stack.Screen name="AdminTeachers" component={TeachersScreen} options={{ title: 'Teachers' }} />
      <Stack.Screen name="AdminTeacherDetail" component={TeacherDetailScreen} options={{ title: 'Teacher' }} />
      <Stack.Screen name="AdminPromoteTeacher" component={PromoteTeacherScreen} options={{ title: 'Promote to Teacher' }} />

      {/* Admin — students */}
      <Stack.Screen name="AdminStudents" component={StudentsScreen} options={{ title: 'Students' }} />
      <Stack.Screen name="AdminAddStudent" component={AdminAddStudentScreen} options={{ title: 'Add Student' }} />
      <Stack.Screen name="AdminStudentDetail" component={StudentDetailScreen} options={{ title: 'Student' }} />
      <Stack.Screen name="AdminParentForm" component={ParentFormScreen} options={{ title: 'Parent / Guardian' }} />
      <Stack.Screen name="AdminEnrolmentForm" component={EnrolmentFormScreen} options={{ title: 'New Enrolment' }} />

      {/* Admin — pricing */}
      <Stack.Screen name="AdminPricing" component={PricingScreen} options={{ title: 'Pricing' }} />
      <Stack.Screen name="AdminPricingForm" component={PricingFormScreen} options={{ title: 'Rate' }} />

      {/* Admin — lesson templates */}
      <Stack.Screen name="AdminLessonTemplates" component={LessonTemplatesScreen} options={{ title: 'Lesson Templates' }} />
      <Stack.Screen name="AdminLessonTemplateForm" component={LessonTemplateFormScreen} options={{ title: 'Lesson Template' }} />
      <Stack.Screen name="AdminTemplateStudents" component={TemplateStudentsScreen} options={{ title: 'Assign Students' }} />

      {/* Parent */}
      <Stack.Screen name="ParentAddChild" component={ParentAddChildScreen} options={{ title: 'Add a child' }} />

      {/* Teacher */}
      <Stack.Screen name="TeacherSchedule" component={TeacherScheduleScreen} options={{ title: 'My Schedule' }} />
      <Stack.Screen name="TeacherAttendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
    </Stack.Navigator>
  );
}
