'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Copy,
  ExternalLink,
  Printer,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  QrCode,
} from 'lucide-react';
import { BillingSidebar } from './BillingSidebar';
import { calculateBill, calculateScholarship, SUBJECT_FEES } from '@/lib/fees';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { upiPayUrl } from '@/lib/upi';
import { usePaymentPayee } from '@/hooks/usePaymentPayee';
import { QRCodeSVG } from 'qrcode.react';
import { ReceiptSheet } from '@/components/dashboard/OfficialFeeReceiptModal';
import toast from 'react-hot-toast';

// Validation schemas for each step
const step1Schema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name is required'),
    email: z.string().trim().email('Valid email is required'),
    phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
    dob: z.string().min(1, 'Date of birth is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

const step2Schema = z.object({
  currentClass: z.string().min(1, 'Current class is required'),
  schoolName: z.string().min(2, 'School name is required'),
  previousPercentage: z.string().min(1, 'Previous percentage is required'),
});

const step3Schema = z.object({
  subjects: z.array(z.string()).min(1, 'Select at least one subject'),
});

const step4Schema = z.object({
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  parentName: z.string().min(2, 'Parent name is required'),
  parentPhone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
});

const step5Schema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
});

const step6Schema = z.object({
  tshirtSize: z.string().min(1, 'T-shirt size is required'),
  upiUtr: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^[A-Za-z0-9]{10,35}$/, 'Enter the UPI transaction ID from your payment app (usually 12 digits)')),
  paymentConfirmed: z.boolean().refine(val => val === true, 'Please confirm payment completion'),
  agreeTerms: z.boolean().refine(val => val === true, 'You must agree to terms'),
});

const CLASSES = Array.from({ length: 8 }, (_, i) => ({
  value: (i + 5).toString(),
  label: `Class ${i + 5}`,
}));

const SUBJECTS_BY_CLASS: Record<number, string[]> = {
  5: ['Mathematics', 'Science', 'English', 'Bengali', 'Social Science'],
  6: ['Mathematics', 'Science', 'English', 'Bengali', 'Social Science'],
  7: ['Mathematics', 'Science', 'English', 'Bengali', 'Social Science'],
  8: ['Mathematics', 'Science', 'English', 'Bengali', 'Social Science'],
  9: ['Mathematics', 'Science', 'English', 'Bengali', 'History'],
  10: ['Mathematics', 'Science', 'English', 'Bengali', 'History'],
  11: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'History', 'Political Science', 'Economics', 'Bengali'],
  12: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'History', 'Political Science', 'Economics', 'Bengali'],
};


interface SubmissionSuccessData {
  student: {
    id: string;
    registrationNumber: string;
    fullName: string;
    classNumber: number;
    email: string;
    totalPaid: number;
    admissionDate: string;
  };
  receipt: {
    id: string;
    amount: number;
    utr: string;
    date: string;
    method: string;
  };
  credentials: {
    identifier: string;
    email: string;
    defaultPassword: string;
  };
}

export function AdmissionForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the form spans six step schemas
  const [formData, setFormData] = useState<Record<string, any>>({
    tshirtSize: 'm',
    subjects: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<SubmissionSuccessData | null>(null);

  /* eslint-disable @typescript-eslint/no-explicit-any -- resolver switches schema per step */
  const form = useForm<any>({
    resolver: zodResolver([step1Schema, step2Schema, step3Schema, step4Schema, step5Schema, step6Schema][currentStep - 1] as any) as any,
    mode: 'onChange',
    defaultValues: formData,
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const errors = form.formState.errors as Record<string, { message?: string } | undefined>;

  // Real-time bill computation for Step 6 UPI QR Code
  const billDetails = useMemo(() => {
    if (!formData.currentClass || !formData.subjects?.length) {
      return null;
    }
    const classNum = parseInt(formData.currentClass);
    const subjectFees = SUBJECT_FEES[classNum] || {};
    const prevPercentage = parseInt(formData.previousPercentage || '0');
    const scholarship = calculateScholarship(prevPercentage);

    const selectedSubjectsData = formData.subjects.map((sub: string) => ({
      name: sub,
      monthly_fee: subjectFees[sub] || 0,
    }));

    return calculateBill(selectedSubjectsData, scholarship);
  }, [formData.currentClass, formData.subjects, formData.previousPercentage]);

  const payableAmount = billDetails?.finalPayable || 950;

  const { payee, ready: payeeReady, error: payeeError, reload: reloadPayee } = usePaymentPayee();
  const UPI_ID = payee.upiId;
  const upiIntentUrl = useMemo(
    () => upiPayUrl({ payee, amount: payableAmount, note: `Admission fee ${formData.fullName || ''}`.trim() }),
    [payee, payableAmount, formData.fullName]
  );

  const handleNext = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      const data = form.getValues();
      const updated = { ...formData, ...data };
      setFormData(updated);
      if (currentStep < 6) {
        setCurrentStep(currentStep + 1);
        form.reset(updated);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      const data = form.getValues();
      const updated = { ...formData, ...data };
      setFormData(updated);
      setCurrentStep(currentStep - 1);
      form.reset(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await form.trigger();
    if (!isValid) return;

    const data = form.getValues();
    const finalData = { ...formData, ...data };

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        toast.success('Application submitted! Your payment is awaiting verification.');
        setSuccessData(resData);
        refresh();
      } else {
        const message = resData.error || 'Failed to submit form. Please verify your details.';
        // Send the applicant back to the step that holds the offending field.
        const stepFor: Record<string, number> = { email: 1, password: 1, phone: 1, dob: 1, fullName: 1, schoolName: 2, previousPercentage: 2, currentClass: 2, subjects: 3, pincode: 4, parentPhone: 4, address: 4 };
        const step = resData.field ? stepFor[resData.field as string] : undefined;
        if (step && step !== currentStep) {
          setFormData(finalData);
          setCurrentStep(step);
          form.reset(finalData);
        }
        toast.error(message, { duration: 6000 });
      }
    } catch {
      toast.error('An error occurred while submitting admission. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    toast.success('UPI ID copied to clipboard!');
  };

  const handleEnterStudentPortal = async () => {
    if (successData) {
      await refresh();
      router.push('/student/dashboard');
    }
  };

  const getSubjectsForClass = () => {
    const classValue = parseInt(formData.currentClass || '5');
    return (SUBJECTS_BY_CLASS[classValue] || []).map((s) => ({ value: s, label: s }));
  };

  // SUCCESS CONFIRMATION & OFFICIAL 1-PAGE FEE RECEIPT
  if (successData) {
    const paidAmount = Number(
      successData.receipt?.amount ??
      successData.student?.totalPaid ??
      2750
    );

    const classNum = parseInt(formData.currentClass || String(successData.student.classNumber || 10));
    const stream =
      classNum >= 11
        ? formData.subjects?.includes('Physics')
          ? 'Science'
          : 'Arts'
        : null;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* On-Screen Action & Celebration Bar (Hidden on Print) */}
        <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full mb-1">
                  <ShieldCheck size={12} /> Application Submitted
                </span>
                <h2 className="text-xl font-black text-[#1A2B4A]">
                  Welcome, {successData.student.fullName}!
                </h2>
                <p className="text-xs text-[#718096]">
                  Registration: <span className="font-mono font-bold text-[#1295D8]">{successData.student.registrationNumber}</span> · Payment
                  awaiting verification — your official receipt is issued once the office confirms it
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(successData.student.registrationNumber);
                  toast.success('Registration number copied!');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <Copy size={13} /> Copy Reg. No
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1A2B4A] hover:bg-[#2E5EAA] px-4 py-2 text-xs font-bold text-white shadow-sm transition"
              >
                <Printer size={15} /> Print / Save PDF Receipt
              </button>

              <button
                type="button"
                onClick={handleEnterStudentPortal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] px-4 py-2 text-xs font-bold text-white hover:opacity-95 shadow-sm transition"
              >
                Enter Student Portal <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Official Printable Fee Receipt (Exact 1-Page A4) ── */}
        <ReceiptSheet
          receipt={{
            id: successData.receipt?.id || `RCPT-2026-${successData.student.registrationNumber.slice(-4)}`,
            date: successData.receipt?.date || successData.student.admissionDate || new Date().toISOString().split('T')[0],
            description: `Admission — Exam Fee, Uniform Kit & First Month Advance Tuition`,
            amount: paidAmount,
            method: 'UPI',
            utr: successData.receipt?.utr || formData.upiUtr || '—',
            status: 'pending',
          }}
          student={{
            fullName: successData.student.fullName || formData.fullName,
            registrationNumber: successData.student.registrationNumber,
            classNumber: classNum,
            stream,
            board: formData.board || 'SEBA',
            parentName: formData.parentName,
            mobile: formData.phone,
            address: [formData.address, formData.city].filter(Boolean).join(', ') || 'Ramkrishna Nagar',
          }}
          copyType="STUDENT COPY"
          credentials={{
            username: successData.student.registrationNumber,
          }}
        />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Form Section */}
      <div className="lg:col-span-2">
        <Card className="p-8 shadow-sm border border-gray-200">
          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex justify-between mb-4">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <div
                  key={step}
                  className={`flex flex-col items-center ${step !== 6 ? 'flex-1' : ''}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition ${
                      currentStep >= step
                        ? 'bg-[#1295D8] text-white shadow-sm'
                        : 'bg-[#CDE6F7] text-[#1295D8]'
                    }`}
                  >
                    {currentStep > step ? <CheckCircle className="h-5 w-5" /> : step}
                  </div>
                  <p className="text-xs mt-2 text-center font-medium text-[#718096]">
                    {step === 6 ? 'Payment' : `Step ${step}`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit}>
            {/* Step 1: Personal Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#1A2B4A]">Personal Information</h2>
                  <p className="text-sm text-[#718096] mt-1">Tell us about the applicant</p>
                </div>
                <Input
                  label="Full Name"
                  placeholder="e.g. Rahul Sen"
                  {...form.register('fullName')}
                  error={errors.fullName?.message}
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="rahul.sen@example.com"
                  {...form.register('email')}
                  error={errors.email?.message}
                />
                <Input
                  label="Phone / WhatsApp Number"
                  placeholder="9876543210"
                  {...form.register('phone')}
                  error={errors.phone?.message}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  {...form.register('dob')}
                  error={errors.dob?.message}
                />
                <div className="rounded-lg border border-[#CDE6F7] bg-[#F0F7FD] p-4 space-y-4">
                  <p className="text-sm text-[#2E5EAA]">
                    Choose a password for the student portal. You&apos;ll sign in with your registration number (given
                    after you submit) or this email.
                  </p>
                  <Input
                    label="Portal Password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    {...form.register('password')}
                    error={errors.password?.message}
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    autoComplete="new-password"
                    {...form.register('confirmPassword')}
                    error={errors.confirmPassword?.message}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Academic Info */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#1A2B4A]">Academic Background</h2>
                  <p className="text-sm text-[#718096] mt-1">Class and previous performance</p>
                </div>
                <Select
                  label="Admission for Class"
                  options={CLASSES}
                  {...form.register('currentClass')}
                  error={errors.currentClass?.message}
                />
                <Input
                  label="Current / Previous School Name"
                  placeholder="e.g. Ramkrishna Vidyapith"
                  {...form.register('schoolName')}
                  error={errors.schoolName?.message}
                />
                <Input
                  label="Previous Year Score / Percentage (%)"
                  type="number"
                  placeholder="85"
                  {...form.register('previousPercentage')}
                  error={errors.previousPercentage?.message}
                />
                <p className="text-xs text-green-700 bg-green-50 p-2.5 rounded-lg border border-green-200">
                  💡 <strong>Scholarship Tiers:</strong> 70%+ scores get 10% discount, 80%+ get 20% discount, and 90%+ receive 30% discount on monthly tuition!
                </p>
              </div>
            )}

            {/* Step 3: Select Subjects */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#1A2B4A]">Select Enrolled Subjects</h2>
                  <p className="text-sm text-[#718096] mt-1">Pick the subjects you wish to study at Gnosis Kaksha</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {getSubjectsForClass().map((subject) => {
                    const classNum = parseInt(formData.currentClass || '5');
                    const fee = SUBJECT_FEES[classNum]?.[subject.value] || 0;
                    return (
                      <label
                        key={subject.value}
                        className="flex items-center justify-between p-3.5 border-2 border-gray-200 rounded-xl hover:border-[#1295D8] hover:bg-[#F0F7FD] cursor-pointer transition"
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            value={subject.value}
                            {...form.register('subjects')}
                            className="w-4 h-4 text-[#1295D8] rounded border-gray-300 focus:ring-[#1295D8]"
                          />
                          <span className="ml-3 font-semibold text-sm text-[#1A2B4A]">{subject.label}</span>
                        </div>
                        <span className="text-xs font-bold text-[#1295D8] bg-[#CDE6F7] px-2 py-0.5 rounded">
                          ₹{fee}/mo
                        </span>
                      </label>
                    );
                  })}
                </div>
                {errors.subjects && (
                  <p className="text-sm text-red-600">{errors.subjects.message}</p>
                )}
              </div>
            )}

            {/* Step 4: Address Info */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#1A2B4A]">Address & Guardian Information</h2>
                  <p className="text-sm text-[#718096] mt-1">For student records and communication</p>
                </div>
                <Input
                  label="Residential Address"
                  placeholder="Village / Ward / Road"
                  {...form.register('address')}
                  error={errors.address?.message}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Town / City"
                    placeholder="Ramkrishna Nagar"
                    {...form.register('city')}
                    error={errors.city?.message}
                  />
                  <Input
                    label="State"
                    placeholder="Assam"
                    {...form.register('state')}
                    error={errors.state?.message}
                  />
                </div>
                <Input
                  label="PIN Code"
                  placeholder="788166"
                  {...form.register('pincode')}
                  error={errors.pincode?.message}
                />
                <Input
                  label="Parent / Guardian Name"
                  placeholder="Father's or Mother's Name"
                  {...form.register('parentName')}
                  error={errors.parentName?.message}
                />
                <Input
                  label="Parent / Guardian Mobile"
                  placeholder="9876543210"
                  {...form.register('parentPhone')}
                  error={errors.parentPhone?.message}
                />
              </div>
            )}

            {/* Step 5: Upload Documents */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#1A2B4A]">Document Verification</h2>
                  <p className="text-sm text-[#718096] mt-1">Tell us which document you will show at the office</p>
                </div>
                <Select
                  label="Document Type"
                  options={[
                    { value: 'marksheet', label: 'Previous Year Marksheet / Report Card' },
                    { value: 'certificate', label: 'Transfer / School Certificate' },
                    { value: 'idproof', label: 'Aadhaar / Government ID Proof' },
                  ]}
                  {...form.register('documentType')}
                  error={errors.documentType?.message}
                />
                <p className="rounded-lg border border-[#CDE6F7] bg-[#F0F7FD] p-3 text-sm text-[#2E5EAA]">
                  Bring the original of this document (and a photocopy) to the institute office. It is checked there
                  before your admission is finalised — no upload needed.
                </p>
              </div>
            )}

            {/* Step 6: Payment & Instant Confirmation (PhysicsWallah style) */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#1A2B4A]">Admission Fee & UPI Payment</h2>
                  <p className="text-sm text-[#718096] mt-1">
                    Scan the QR code with any UPI app (PhonePe, Google Pay, Paytm, BHIM) and enter the 12-digit UTR
                  </p>
                </div>

                {/* Amount to Pay Banner */}
                <div className="rounded-xl bg-gradient-to-r from-[#2E5EAA] to-[#1295D8] text-white p-5 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#CDE6F7]">Total Admission Payable</p>
                      <p className="text-3xl font-black mt-1">₹{payableAmount}</p>
                      <p className="text-xs text-[#CDE6F7] mt-1">
                        Includes: Tuition (₹{billDetails?.tuitionAfterScholarship || 0}) + Exam Fee (₹350) + T-Shirt (₹600)
                      </p>
                    </div>
                    <div className="hidden sm:block text-right text-xs bg-white/10 p-2.5 rounded-lg">
                      <p className="font-semibold">{formData.fullName || 'Student'}</p>
                      <p className="opacity-90">Class {formData.currentClass || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* UPI QR & Intent Box */}
                <div className="rounded-xl border-2 border-[#1295D8] bg-[#F0F7FD] p-6">
                  <div className="grid sm:grid-cols-2 gap-6 items-center">
                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-[#CDE6F7] shadow-xs">
                      <div className="p-2 bg-white rounded-lg">
                        {payeeReady ? (
                          <QRCodeSVG value={upiIntentUrl} size={180} level="M" includeMargin={true} />
                        ) : payeeError ? (
                          <button type="button" onClick={reloadPayee} className="flex h-[180px] w-[180px] items-center justify-center text-center text-xs font-semibold text-red-600">
                            Couldn&apos;t load payment details. Tap to retry.
                          </button>
                        ) : (
                          <div className="flex h-[180px] w-[180px] items-center justify-center">
                            <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#1295D8] border-t-transparent" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium mt-2 text-center flex items-center gap-1">
                        <QrCode size={13} /> Scan with Any UPI App
                      </p>
                    </div>

                    {/* Payment Info & Deep Links */}
                    <div className="space-y-4">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase">Official Institute UPI ID:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono font-bold text-base text-[#1A2B4A] bg-white px-3 py-1.5 rounded-lg border border-gray-300">
                            {UPI_ID}
                          </span>
                          <button
                            type="button"
                            onClick={copyUpiId}
                            className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-[#1295D8] transition"
                            title="Copy UPI ID"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Mobile Deep Link */}
                      <div>
                        <a
                          href={payeeReady ? upiIntentUrl : undefined}
                          aria-disabled={!payeeReady}
                          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-[#1295D8] text-white font-semibold text-xs hover:bg-[#2E5EAA] transition shadow-xs"
                        >
                          <ExternalLink size={14} /> Pay via Installed UPI App
                        </a>
                      </div>

                      <div className="text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-200 space-y-1">
                        <p className="font-semibold text-[#1A2B4A]">Payment Instructions:</p>
                        <p>1. Open Google Pay, PhonePe, Paytm, or BHIM.</p>
                        <p>2. Scan QR or transfer ₹{payableAmount} to <span className="font-mono font-bold">{UPI_ID}</span>.</p>
                        <p>3. Copy the 12-digit UTR / UPI Ref ID and paste below.</p>
                      </div>
                    </div>
                  </div>

                  {/* UTR Input */}
                  <div className="mt-6 pt-6 border-t border-[#CDE6F7] space-y-4">
                    <Input
                      label="12-Digit UPI Transaction ID / UTR Number"
                      placeholder="e.g. 428192839102"
                      {...form.register('upiUtr')}
                      error={errors.upiUtr?.message}
                    />

                    <Select
                      label="Institute T-Shirt Size"
                      options={[
                        { value: 'xs', label: 'Extra Small (XS)' },
                        { value: 's', label: 'Small (S)' },
                        { value: 'm', label: 'Medium (M)' },
                        { value: 'l', label: 'Large (L)' },
                        { value: 'xl', label: 'Extra Large (XL)' },
                      ]}
                      {...form.register('tshirtSize')}
                      error={errors.tshirtSize?.message}
                    />

                    {/* Checkboxes */}
                    <div className="space-y-3 pt-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          {...form.register('paymentConfirmed')}
                          className="mt-1 w-4 h-4 text-[#1295D8] rounded border-gray-300 focus:ring-[#1295D8]"
                        />
                        <span className="text-xs text-gray-700">
                          I have made the payment of <strong>₹{payableAmount}</strong> via UPI and entered the genuine 12-digit UTR number above.
                        </span>
                      </label>
                      {errors.paymentConfirmed && (
                        <p className="text-xs text-red-600">{errors.paymentConfirmed.message}</p>
                      )}

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          {...form.register('agreeTerms')}
                          className="mt-1 w-4 h-4 text-[#1295D8] rounded border-gray-300 focus:ring-[#1295D8]"
                        />
                        <span className="text-xs text-gray-700">
                          I agree to the code of conduct, class schedule, and terms of Gnosis Kaksha.
                        </span>
                      </label>
                      {errors.agreeTerms && (
                        <p className="text-xs text-red-600">{errors.agreeTerms.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8 pt-4 border-t border-gray-200">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="h-5 w-5" /> Previous
                </Button>
              )}
              {currentStep < 6 ? (
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleNext}
                >
                  Next Step <ChevronRight className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857]"
                  isLoading={isSubmitting}
                >
                  <CreditCard size={18} className="mr-2" /> Complete Admission & Submit
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>

      {/* Sidebar */}
      <div>
        <BillingSidebar
          currentClass={formData.currentClass}
          selectedSubjects={formData.subjects}
          previousPercentage={formData.previousPercentage}
        />
      </div>
    </div>
  );
}
