/**
 * Attendance store and record management for Teachers & Administration
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

const STORAGE_KEY = 'gk_attendance_records_v1';

export function getAllAttendanceRecords(): AttendanceRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getAttendanceRecord(date: string, classNumber: number, subject: string): AttendanceRecord | null {
  const records = getAllAttendanceRecords();
  return records.find((r) => r.date === date && r.classNumber === classNumber && r.subject.toLowerCase() === subject.toLowerCase()) || null;
}

export function saveAttendanceRecord(record: AttendanceRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const records = getAllAttendanceRecords();
    const existingIdx = records.findIndex((r) => r.date === record.date && r.classNumber === record.classNumber && r.subject.toLowerCase() === record.subject.toLowerCase());
    if (existingIdx >= 0) {
      records[existingIdx] = record;
    } else {
      records.unshift(record);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save attendance record to localStorage', e);
  }
}
