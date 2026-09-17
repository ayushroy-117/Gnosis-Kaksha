import {
  calculateBill,
  calculateScholarship,
  SUBJECT_FEES,
} from '@/lib/fees';


export type EnrollmentStatus = 'active' | 'pending' | 'rejected';
export type StudentFeeState = 'paid' | 'due';

export interface RosterStudent {
  id: string;
  registrationNumber: string;
  fullName: string;
  classNumber: number;
  stream: string | null;
  board: string;
  subjects: string[];
  parentName: string;
  mobile: string;
  email: string;
  previousPercentage: number;
  scholarshipPercent: number;
  monthlyTuition: number;
  tuitionAfterScholarship: number;
  mandatoryCharges: number;
  feeState: StudentFeeState;
  amountDue: number;
  admissionDate: string;
  status: EnrollmentStatus;
  // Additional admission info
  upiUtr?: string;
  tshirtSize?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  schoolName?: string;
  documentType?: string;
}

export interface Transaction {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  description: string;
  amount: number;
  method: 'UPI' | 'Cash' | 'Card' | 'Bank Transfer';
  utr?: string;
  status?: 'verified' | 'pending';
}

export interface InstituteNotice {
  id: string;
  title: string;
  content: string;
  date: string;
  audience: 'All' | 'Students' | 'Parents' | 'Staff';
  pinned: boolean;
}

export type AllocationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SubjectAllocationRequest {
  id: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  subject: string;
  classNumber: number;
  requestedBy: string; // teacher name/email
  status: AllocationStatus;
  rejectionNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

interface StoreData {
  students: RosterStudent[];
  transactions: Transaction[];
  notices: InstituteNotice[];
  allocationRequests: SubjectAllocationRequest[];
}

const INITIAL_ROSTER: RosterStudent[] = [
  {
    id: 'stu-0142',
    registrationNumber: 'GK-2026-0142',
    fullName: 'Ananya Das',
    classNumber: 10,
    stream: null,
    board: 'SEBA',
    subjects: ['Mathematics', 'Science', 'English', 'Bengali'],
    parentName: 'Rajib Das',
    mobile: '9876543210',
    email: 'ananya.das@example.com',
    previousPercentage: 84,
    scholarshipPercent: 20,
    monthlyTuition: 2500,
    tuitionAfterScholarship: 2000,
    mandatoryCharges: 950,
    feeState: 'due',
    amountDue: 2000,
    admissionDate: '2026-07-01',
    status: 'active',
  },
  {
    id: 'stu-0138',
    registrationNumber: 'GK-2026-0138',
    fullName: 'Rohan Deb',
    classNumber: 12,
    stream: 'Science',
    board: 'CBSE',
    subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'],
    parentName: 'Sanjib Deb',
    mobile: '9954012233',
    email: 'rohan.deb@example.com',
    previousPercentage: 91,
    scholarshipPercent: 30,
    monthlyTuition: 4150,
    tuitionAfterScholarship: 2905,
    mandatoryCharges: 950,
    feeState: 'paid',
    amountDue: 0,
    admissionDate: '2026-06-18',
    status: 'active',
  },
  {
    id: 'stu-0151',
    registrationNumber: 'GK-2026-0151',
    fullName: 'Priya Nath',
    classNumber: 9,
    stream: null,
    board: 'SEBA',
    subjects: ['Mathematics', 'Science', 'English', 'History'],
    parentName: 'Dipankar Nath',
    mobile: '8811223344',
    email: 'priya.nath@example.com',
    previousPercentage: 78,
    scholarshipPercent: 10,
    monthlyTuition: 2300,
    tuitionAfterScholarship: 2070,
    mandatoryCharges: 950,
    feeState: 'paid',
    amountDue: 0,
    admissionDate: '2026-07-05',
    status: 'active',
  },
  {
    id: 'stu-0129',
    registrationNumber: 'GK-2026-0129',
    fullName: 'Imran Hussain',
    classNumber: 11,
    stream: 'Science',
    board: 'CBSE',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'English'],
    parentName: 'Anwar Hussain',
    mobile: '9706551020',
    email: 'imran.hussain@example.com',
    previousPercentage: 88,
    scholarshipPercent: 20,
    monthlyTuition: 3000,
    tuitionAfterScholarship: 2400,
    mandatoryCharges: 950,
    feeState: 'due',
    amountDue: 2400,
    admissionDate: '2026-06-22',
    status: 'active',
  },
  {
    id: 'stu-0160',
    registrationNumber: 'GK-2026-0160',
    fullName: 'Sneha Roy',
    classNumber: 7,
    stream: null,
    board: 'SEBA',
    subjects: ['Mathematics', 'Science', 'English'],
    parentName: 'Bikash Roy',
    mobile: '9435667788',
    email: 'sneha.roy@example.com',
    previousPercentage: 72,
    scholarshipPercent: 10,
    monthlyTuition: 1600,
    tuitionAfterScholarship: 1440,
    mandatoryCharges: 950,
    feeState: 'paid',
    amountDue: 0,
    admissionDate: '2026-07-10',
    status: 'active',
  },
  {
    id: 'stu-0122',
    registrationNumber: 'GK-2026-0122',
    fullName: 'Arjun Sinha',
    classNumber: 12,
    stream: 'Arts',
    board: 'SEBA',
    subjects: ['History', 'Political Science', 'Economics', 'Bengali'],
    parentName: 'Prakash Sinha',
    mobile: '9101223344',
    email: 'arjun.sinha@example.com',
    previousPercentage: 65,
    scholarshipPercent: 0,
    monthlyTuition: 2700,
    tuitionAfterScholarship: 2700,
    mandatoryCharges: 950,
    feeState: 'due',
    amountDue: 2700,
    admissionDate: '2026-06-15',
    status: 'active',
  },
  {
    id: 'stu-0175',
    registrationNumber: 'GK-2026-0175',
    fullName: 'Kabir Ahmed',
    classNumber: 5,
    stream: null,
    board: 'SEBA',
    subjects: ['Mathematics', 'Science', 'English', 'Bengali', 'Social Science'],
    parentName: 'Sahil Ahmed',
    mobile: '9864551122',
    email: 'kabir.ahmed@example.com',
    previousPercentage: 95,
    scholarshipPercent: 30,
    monthlyTuition: 2300,
    tuitionAfterScholarship: 1610,
    mandatoryCharges: 950,
    feeState: 'due',
    amountDue: 1610,
    admissionDate: '2026-08-29',
    status: 'pending',
    upiUtr: '982736481920',
  },
  {
    id: 'stu-0176',
    registrationNumber: 'GK-2026-0176',
    fullName: 'Meghna Choudhury',
    classNumber: 8,
    stream: null,
    board: 'CBSE',
    subjects: ['Mathematics', 'Science', 'English'],
    parentName: 'Nabin Choudhury',
    mobile: '9577001234',
    email: 'meghna.choudhury@example.com',
    previousPercentage: 81,
    scholarshipPercent: 20,
    monthlyTuition: 1700,
    tuitionAfterScholarship: 1360,
    mandatoryCharges: 950,
    feeState: 'due',
    amountDue: 1360,
    admissionDate: '2026-08-31',
    status: 'pending',
    upiUtr: '581920491823',
  },
  {
    id: 'stu-0148',
    registrationNumber: 'GK-2026-0148',
    fullName: 'Farhan Ali',
    classNumber: 10,
    stream: null,
    board: 'SEBA',
    subjects: ['Mathematics', 'Science', 'English'],
    parentName: 'Kamal Ali',
    mobile: '9127884455',
    email: 'farhan.ali@example.com',
    previousPercentage: 69,
    scholarshipPercent: 0,
    monthlyTuition: 2000,
    tuitionAfterScholarship: 2000,
    mandatoryCharges: 950,
    feeState: 'paid',
    amountDue: 0,
    admissionDate: '2026-07-02',
    status: 'active',
  },
  {
    id: 'stu-0163',
    registrationNumber: 'GK-2026-0163',
    fullName: 'Diya Sarma',
    classNumber: 6,
    stream: null,
    board: 'SEBA',
    subjects: ['Mathematics', 'Science', 'English', 'Bengali'],
    parentName: 'Hiren Sarma',
    mobile: '9508112299',
    email: 'diya.sarma@example.com',
    previousPercentage: 88,
    scholarshipPercent: 20,
    monthlyTuition: 1900,
    tuitionAfterScholarship: 1520,
    mandatoryCharges: 950,
    feeState: 'paid',
    amountDue: 0,
    admissionDate: '2026-07-08',
    status: 'active',
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'RCPT-2026-0925',
    date: '2026-09-06',
    studentId: 'stu-0163',
    studentName: 'Diya Sarma',
    description: 'September 2026 — Monthly tuition',
    amount: 1520,
    method: 'UPI',
    utr: '694829104829',
    status: 'verified',
  },
  {
    id: 'RCPT-2026-0924',
    date: '2026-09-05',
    studentId: 'stu-0148',
    studentName: 'Farhan Ali',
    description: 'September 2026 — Monthly tuition',
    amount: 2000,
    method: 'Cash',
    status: 'verified',
  },
  {
    id: 'RCPT-2026-0923',
    date: '2026-09-04',
    studentId: 'stu-0160',
    studentName: 'Sneha Roy',
    description: 'September 2026 — Monthly tuition',
    amount: 1440,
    method: 'UPI',
    utr: '918239019283',
    status: 'verified',
  },
  {
    id: 'RCPT-2026-0922',
    date: '2026-09-03',
    studentId: 'stu-0151',
    studentName: 'Priya Nath',
    description: 'September 2026 — Monthly tuition',
    amount: 2070,
    method: 'UPI',
    utr: '492810481928',
    status: 'verified',
  },
  {
    id: 'RCPT-2026-0921',
    date: '2026-09-02',
    studentId: 'stu-0138',
    studentName: 'Rohan Deb',
    description: 'September 2026 — Monthly tuition',
    amount: 2905,
    method: 'UPI',
    utr: '294819385019',
    status: 'verified',
  },
  {
    id: 'RCPT-2026-0902',
    date: '2026-08-31',
    studentId: 'stu-0176',
    studentName: 'Meghna Choudhury',
    description: 'Admission — Exam, T-Shirt & First Month Fees',
    amount: 2310,
    method: 'UPI',
    utr: '581920491823',
    status: 'pending',
  },
  {
    id: 'RCPT-2026-0901',
    date: '2026-08-29',
    studentId: 'stu-0175',
    studentName: 'Kabir Ahmed',
    description: 'Admission — Exam, T-Shirt & First Month Fees',
    amount: 2560,
    method: 'UPI',
    utr: '982736481920',
    status: 'pending',
  },
];

const INITIAL_NOTICES: InstituteNotice[] = [
  {
    id: 'in1',
    title: 'Half-Yearly Examination Schedule',
    content:
      'Half-yearly exams for Classes VI–X begin on 22 September 2026. Datesheets are on the notice board and the student portal.',
    date: '2026-08-28',
    audience: 'All',
    pinned: true,
  },
  {
    id: 'in2',
    title: 'September Fee Collection Window',
    content:
      'Monthly tuition for September 2026 is due by the 10th. Please remind guardians with pending dues.',
    date: '2026-08-25',
    audience: 'Staff',
    pinned: true,
  },
  {
    id: 'in3',
    title: 'Parent–Teacher Meeting',
    content:
      'A PTM for all classes is scheduled for 20 September 2026, 10:00 AM at the main campus.',
    date: '2026-08-18',
    audience: 'Parents',
    pinned: false,
  },
  {
    id: 'in4',
    title: 'New Study Material Uploaded',
    content:
      'Chapter-wise practice sheets for Mathematics and Science have been added to the materials library.',
    date: '2026-08-06',
    audience: 'Students',
    pinned: false,
  },
];

const INITIAL_ALLOCATION_REQUESTS: SubjectAllocationRequest[] = [
  {
    id: 'alloc-demo1',
    studentId: 'stu-0142',
    studentName: 'Ananya Das',
    registrationNumber: 'GK-2026-0142',
    subject: 'History',
    classNumber: 10,
    requestedBy: 'Ankur Kumar Nath',
    status: 'PENDING',
    createdAt: '2026-09-12',
  },
  {
    id: 'alloc-demo2',
    studentId: 'stu-0129',
    studentName: 'Imran Hussain',
    registrationNumber: 'GK-2026-0129',
    subject: 'Biology',
    classNumber: 11,
    requestedBy: 'Ankur Kumar Nath',
    status: 'PENDING',
    createdAt: '2026-09-13',
  },
];

// Singleton in-memory store
let memoryStore: StoreData = {
  students: [...INITIAL_ROSTER],
  transactions: [...INITIAL_TRANSACTIONS],
  notices: [...INITIAL_NOTICES],
  allocationRequests: [...INITIAL_ALLOCATION_REQUESTS],
};

const BROWSER_KEY = 'gk_institute_store';

function loadStore(): StoreData {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(BROWSER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.students && parsed.transactions && parsed.notices) {
          // Backwards compat: old stores won't have allocationRequests
          if (!parsed.allocationRequests) {
            parsed.allocationRequests = [];
          }
          memoryStore = parsed;
          return memoryStore;
        }
      }
    } catch {
      // ignore
    }
  }
  return memoryStore;
}

function saveStore(data: StoreData) {
  memoryStore = data;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(BROWSER_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// Student & Admission Store Actions
// ---------------------------------------------------------------------------

export function getAllStudents(): RosterStudent[] {
  const store = loadStore();
  return store.students;
}

export function getStudentById(id: string): RosterStudent | undefined {
  const students = getAllStudents();
  return students.find((s) => s.id === id);
}

export function getStudentByRegNo(regNo: string): RosterStudent | undefined {
  const students = getAllStudents();
  const clean = regNo.trim().toUpperCase();
  return students.find((s) => s.registrationNumber.toUpperCase() === clean);
}

export function getStudentByEmail(email: string): RosterStudent | undefined {
  const students = getAllStudents();
  const clean = email.trim().toLowerCase();
  return students.find((s) => s.email.toLowerCase() === clean);
}

export interface NewAdmissionInput {
  fullName: string;
  email: string;
  phone: string;
  dob?: string;
  currentClass: string;
  schoolName?: string;
  previousPercentage: string;
  subjects: string[];
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  parentName?: string;
  parentPhone?: string;
  documentType?: string;
  tshirtSize?: string;
  upiUtr: string;
}

export function addAdmission(input: NewAdmissionInput): { student: RosterStudent; receipt: Transaction } {
  const store = loadStore();

  const classNum = parseInt(input.currentClass);
  const subjectFees = SUBJECT_FEES[classNum] || {};
  const prevPercent = parseFloat(input.previousPercentage) || 0;
  const scholarshipPercent = calculateScholarship(prevPercent);

  const selectedSubjects = input.subjects.map((sub) => ({
    name: sub,
    monthly_fee: subjectFees[sub] || 0,
  }));

  const billing = calculateBill(selectedSubjects, scholarshipPercent);

  // Generate unique IDs
  const count = store.students.length + 1;
  const regSeq = String(180 + count).padStart(4, '0');
  const regNumber = `GK-2026-${regSeq}`;
  const studentId = `stu-0${regSeq}`;
  const receiptId = `RCPT-2026-09${String(30 + count).padStart(2, '0')}`;
  const today = new Date().toISOString().split('T')[0];

  const stream = classNum >= 11 ? (input.subjects.includes('Physics') ? 'Science' : 'Arts') : null;

  const newStudent: RosterStudent = {
    id: studentId,
    registrationNumber: regNumber,
    fullName: input.fullName.trim(),
    classNumber: classNum,
    stream,
    board: 'SEBA',
    subjects: input.subjects,
    parentName: input.parentName || 'Guardian',
    mobile: input.phone,
    email: input.email.trim().toLowerCase(),
    previousPercentage: prevPercent,
    scholarshipPercent,
    monthlyTuition: billing.monthlyTuition,
    tuitionAfterScholarship: billing.tuitionAfterScholarship,
    mandatoryCharges: billing.mandatoryCharges,
    feeState: 'due', // first month tuition is billed
    amountDue: billing.tuitionAfterScholarship,
    admissionDate: today,
    status: 'pending',
    upiUtr: input.upiUtr,
    tshirtSize: input.tshirtSize,
    address: input.address,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    schoolName: input.schoolName,
    documentType: input.documentType,
  };

  const newReceipt: Transaction = {
    id: receiptId,
    date: today,
    studentId,
    studentName: newStudent.fullName,
    description: `Admission — Exam Fee, T-shirt & First Month (UTR: ${input.upiUtr})`,
    amount: billing.finalPayable,
    method: 'UPI',
    utr: input.upiUtr,
    status: 'pending',
  };

  store.students.unshift(newStudent);
  store.transactions.unshift(newReceipt);
  saveStore(store);

  return { student: newStudent, receipt: newReceipt };
}

export function approveStudent(id: string): boolean {
  const store = loadStore();
  const student = store.students.find((s) => s.id === id);
  if (!student) return false;

  student.status = 'active';

  // Mark associated admission transaction as verified
  const txn = store.transactions.find((t) => t.studentId === id && t.description.includes('Admission'));
  if (txn) {
    txn.status = 'verified';
  }

  saveStore(store);
  return true;
}

export function rejectStudent(id: string): boolean {
  const store = loadStore();
  const student = store.students.find((s) => s.id === id);
  if (!student) return false;

  student.status = 'rejected';
  saveStore(store);
  return true;
}

export function recordPayment(
  studentId: string,
  amount: number,
  method: 'UPI' | 'Cash' | 'Card' | 'Bank Transfer',
  description?: string,
  utr?: string
): Transaction | null {
  const store = loadStore();
  const student = store.students.find((s) => s.id === studentId);
  if (!student) return null;

  student.feeState = 'paid';
  student.amountDue = 0;

  const today = new Date().toISOString().split('T')[0];
  const count = store.transactions.length + 1;
  const receiptId = `RCPT-2026-09${String(40 + count).padStart(2, '0')}`;

  const receipt: Transaction = {
    id: receiptId,
    date: today,
    studentId: student.id,
    studentName: student.fullName,
    description: description || `September 2026 — Monthly tuition${utr ? ` (UTR: ${utr})` : ''}`,
    amount,
    method,
    utr,
    status: 'verified',
  };

  store.transactions.unshift(receipt);
  saveStore(store);
  return receipt;
}

// ---------------------------------------------------------------------------
// Transactions & Notices Store Actions
// ---------------------------------------------------------------------------

export function getAllTransactions(): Transaction[] {
  const store = loadStore();
  return store.transactions;
}

export function getAllNotices(): InstituteNotice[] {
  const store = loadStore();
  return store.notices;
}

export function addNotice(notice: Omit<InstituteNotice, 'id' | 'date'>): InstituteNotice {
  const store = loadStore();
  const newNotice: InstituteNotice = {
    id: `not-${Date.now().toString(36)}`,
    date: new Date().toISOString().split('T')[0],
    ...notice,
  };
  store.notices.unshift(newNotice);
  saveStore(store);
  return newNotice;
}

export function deleteNotice(id: string): boolean {
  const store = loadStore();
  const idx = store.notices.findIndex((n) => n.id === id);
  if (idx === -1) return false;
  store.notices.splice(idx, 1);
  saveStore(store);
  return true;
}

// ---------------------------------------------------------------------------
// Subject Allocation Requests
// ---------------------------------------------------------------------------

export function getAllocationRequests(): SubjectAllocationRequest[] {
  const store = loadStore();
  return store.allocationRequests;
}

export function createAllocationRequest(
  input: Omit<SubjectAllocationRequest, 'id' | 'status' | 'createdAt'>
): SubjectAllocationRequest {
  const store = loadStore();
  const request: SubjectAllocationRequest = {
    ...input,
    id: `alloc-${Date.now().toString(36)}`,
    status: 'PENDING',
    createdAt: new Date().toISOString().split('T')[0],
  };
  store.allocationRequests = [request, ...(store.allocationRequests || [])];
  saveStore(store);
  return request;
}

export function resolveAllocationRequest(
  id: string,
  resolution: 'APPROVED' | 'REJECTED',
  rejectionNote?: string
): boolean {
  const store = loadStore();
  const req = store.allocationRequests?.find((r) => r.id === id);
  if (!req) return false;

  req.status = resolution;
  req.resolvedAt = new Date().toISOString().split('T')[0];
  if (resolution === 'REJECTED' && rejectionNote) {
    req.rejectionNote = rejectionNote;
  }

  if (resolution === 'APPROVED') {
    // Add subject to the student's enrollment if not already there
    const student = store.students.find((s) => s.id === req.studentId);
    if (student && !student.subjects.includes(req.subject)) {
      student.subjects = [...student.subjects, req.subject];
    }
  }

  saveStore(store);
  return true;
}
