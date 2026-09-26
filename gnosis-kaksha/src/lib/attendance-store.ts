/**
 * Attendance shapes, as returned by GET/POST /api/attendance.
 * Records are stored in the database (attendance_records table).
 */

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceEntry {
  studentId: string;
  studentName: string;
  registrationNumber: string;
  status: AttendanceStatus;
  remark?: string;
}

export interface AttendanceRecord {
  id: string;
  branchId: string;
  date: string;
  classNumber: number;
  subject: string;
  teacherName: string;
  mode: 'manual' | 'biometric';
  entries: AttendanceEntry[];
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  savedAt: string;
}
