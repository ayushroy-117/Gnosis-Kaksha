import { NextRequest, NextResponse } from 'next/server';
import {
  generateFeeReminderMessage,
  sendWhatsAppMessage,
  getWhatsAppDirectUrl,
  formatWhatsAppPhone,
} from '@/lib/whatsapp';
import { requirePermission } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRoster, staffBranchScope } from '@/lib/server/institute';
import { getPaymentSettings } from '@/lib/server/settings';
import type { RosterStudent } from '@/lib/institute-data';

const noPhone = (s: RosterStudent) =>
  NextResponse.json({ success: false, error: `No mobile number on file for ${s.fullName}.` }, { status: 422 });

export const dynamic = 'force-dynamic';

/**
 * GET /api/whatsapp/fee-reminder
 * - If ?studentId=... or ?regNo=... returns preview for that student
 * - Otherwise returns list of all students with pending fees
 */
export async function GET(req: NextRequest) {
  const auth = await requirePermission('send_fee_reminders');
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const regNo = searchParams.get('regNo');

    const db = createAdminClient();
    const [roster, { upiId }] = await Promise.all([getRoster(db), getPaymentSettings(db)]);
    const scopeBranch = staffBranchScope(auth.user);
    const allStudents = scopeBranch ? roster.filter((s) => s.branchId === scopeBranch) : roster;
    const pendingStudents = allStudents.filter(
      (s) => s.status === 'active' && s.feeState === 'due' && s.amountDue > 0
    );

    if (studentId || regNo) {
      const student = allStudents.find(
        (s) => s.id === studentId || s.registrationNumber === regNo
      );

      if (!student) {
        return NextResponse.json(
          { success: false, error: 'Student not found' },
          { status: 404 }
        );
      }

      const message = generateFeeReminderMessage({
        studentName: student.fullName,
        registrationNumber: student.registrationNumber,
        classNumber: student.classNumber,
        amountDue: student.amountDue,
        parentName: student.parentName,
        upiId,
      });

      const phone = student.mobile;
      if (!phone) return noPhone(student);
      const directUrl = getWhatsAppDirectUrl(phone, message);

      return NextResponse.json({
        success: true,
        student: {
          id: student.id,
          name: student.fullName,
          registrationNumber: student.registrationNumber,
          classNumber: student.classNumber,
          amountDue: student.amountDue,
          phone,
          parentName: student.parentName,
        },
        message,
        directUrl,
      });
    }

    // List all pending students with reminder summaries
    const list = pendingStudents.filter((s) => s.mobile).map((s) => {
      const phone = s.mobile;
      const message = generateFeeReminderMessage({
        studentName: s.fullName,
        registrationNumber: s.registrationNumber,
        classNumber: s.classNumber,
        amountDue: s.amountDue,
        parentName: s.parentName,
        upiId,
      });

      return {
        id: s.id,
        name: s.fullName,
        registrationNumber: s.registrationNumber,
        classNumber: s.classNumber,
        amountDue: s.amountDue,
        phone,
        parentName: s.parentName,
        directUrl: getWhatsAppDirectUrl(phone, message),
      };
    });

    return NextResponse.json({
      success: true,
      count: list.length,
      pendingStudents: list,
    });
  } catch (error: unknown) {
    console.error('[whatsapp/fee-reminder]', error);
    return NextResponse.json({ success: false, error: 'Could not prepare the reminder. Please try again.' }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/fee-reminder
 * Sends fee reminder via WhatsApp Cloud API / Twilio or returns direct wa.me link
 * Body options:
 * 1. Single student:
 *    { studentId: string, phone?: string, customMessage?: string }
 * 2. Batch:
 *    { batch: true, studentIds?: string[] }
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission('send_fee_reminders');
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const db = createAdminClient();
    const [roster, { upiId }] = await Promise.all([getRoster(db), getPaymentSettings(db)]);
    const scopeBranch = staffBranchScope(auth.user);
    const allStudents = scopeBranch ? roster.filter((s) => s.branchId === scopeBranch) : roster;

    // ── Single Student Reminder ──────────────────────────────────────────────
    if (!body.batch) {
      const { studentId, regNo, phone: customPhone, customMessage } = body;

      const student = allStudents.find(
        (s) => s.id === studentId || s.registrationNumber === regNo
      );

      if (!student) {
        return NextResponse.json(
          { success: false, error: 'Student not found' },
          { status: 404 }
        );
      }

      const phone = customPhone || student.mobile;
      if (!phone) return noPhone(student);
      const message =
        customMessage ||
        generateFeeReminderMessage({
          studentName: student.fullName,
          registrationNumber: student.registrationNumber,
          classNumber: student.classNumber,
          amountDue: student.amountDue,
          parentName: student.parentName,
          upiId,
        });

      const result = await sendWhatsAppMessage({ phone, message });

      return NextResponse.json({
        success: result.success,
        provider: result.provider,
        messageId: result.messageId,
        directUrl: result.directUrl,
        message: result.message,
        recipient: {
          id: student.id,
          name: student.fullName,
          regNo: student.registrationNumber,
          phone: result.recipientPhone,
          amountDue: student.amountDue,
        },
        error: result.error,
      });
    }

    // ── Batch Reminders to all pending students ─────────────────────────────
    let targets: RosterStudent[] = [];

    if (Array.isArray(body.studentIds) && body.studentIds.length > 0) {
      targets = allStudents.filter(
        (s) =>
          body.studentIds.includes(s.id) &&
          s.status === 'active' &&
          s.feeState === 'due'
      );
    } else {
      // All pending students
      targets = allStudents.filter(
        (s) => s.status === 'active' && s.feeState === 'due' && s.amountDue > 0
      );
    }

    if (targets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending students found to notify.',
        sentCount: 0,
        results: [],
      });
    }

    const results = [];
    for (const student of targets) {
      if (!student.mobile) continue;
      const phone = student.mobile;
      const message = generateFeeReminderMessage({
        studentName: student.fullName,
        registrationNumber: student.registrationNumber,
        classNumber: student.classNumber,
        amountDue: student.amountDue,
        parentName: student.parentName,
        upiId,
      });

      const res = await sendWhatsAppMessage({ phone, message });
      results.push({
        studentId: student.id,
        name: student.fullName,
        registrationNumber: student.registrationNumber,
        phone: res.recipientPhone,
        amountDue: student.amountDue,
        success: res.success,
        provider: res.provider,
        directUrl: res.directUrl,
        messageId: res.messageId,
      });
    }

    return NextResponse.json({
      success: true,
      message: `WhatsApp fee reminders prepared for ${results.length} student(s).`,
      sentCount: results.length,
      results,
    });
  } catch (error: unknown) {
    console.error('[whatsapp/fee-reminder]', error);
    return NextResponse.json({ success: false, error: 'Could not prepare the reminder. Please try again.' }, { status: 500 });
  }
}
