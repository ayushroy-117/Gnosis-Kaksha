import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasPermission } from '@/lib/permissions';
import { studentInScope } from '@/lib/server/institute';
import { DOCUMENT_KINDS, parseImageDataUrl, saveStudentDocument, type DocumentKind } from '@/lib/server/student-documents';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseParams(p: { id: string; kind: string }) {
  if (!UUID.test(p.id) || !DOCUMENT_KINDS.includes(p.kind as DocumentKind)) return null;
  return { studentId: p.id, kind: p.kind as DocumentKind };
}

// GET /api/students/<id>/documents/photo|signature — the image itself.
// The student themself, or staff who can see that student (branch-scoped).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const p = parseParams(await params);
  if (!p) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });

  try {
    const db = createAdminClient();
    const own = user.role === 'student' && user.studentId === p.studentId;
    const staff = user.role !== 'student' && hasPermission(user.role, 'view_student_roster') && (await studentInScope(db, user, p.studentId));
    if (!own && !staff) return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });

    const { data, error } = await db
      .from('student_documents')
      .select('mime_type, data')
      .eq('student_id', p.studentId)
      .eq('kind', p.kind)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not uploaded yet.' }, { status: 404 });

    const hex = String(data.data);
    const bytes = Buffer.from(hex.startsWith('\\x') ? hex.slice(2) : hex, 'hex');
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': data.mime_type,
        'Content-Length': String(bytes.length),
        // URLs carry ?v=<updated_at>, so a private cache is safe
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
      },
    });
  } catch (err) {
    return serverError('student document GET', err, 'Could not load the image.');
  }
}

// PUT /api/students/<id>/documents/photo|signature  { dataUrl }
// Admin: any time. The student: only while their admission is still pending
// (after approval the ID card is issued, so only the office changes it).
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const p = parseParams(await params);
  if (!p) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const image = parseImageDataUrl(p.kind, body?.dataUrl);
  if ('error' in image) return NextResponse.json({ error: image.error }, { status: 400 });

  try {
    const db = createAdminClient();
    const { data: student } = await db.from('students').select('id, status').eq('id', p.studentId).maybeSingle();
    if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });

    const isAdmin = hasPermission(user.role, 'manage_admissions');
    const isOwner = user.role === 'student' && user.studentId === p.studentId;
    if (!isAdmin) {
      if (!isOwner) return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
      if (student.status !== 'pending') {
        return NextResponse.json(
          { error: 'Your admission is approved, so your ID card is issued. Ask the office to change your photo or signature.' },
          { status: 403 }
        );
      }
    }

    await saveStudentDocument(db, p.studentId, p.kind, image, `${user.fullName} (${user.role})`);
    return NextResponse.json({ success: true, url: `/api/students/${p.studentId}/documents/${p.kind}?v=${Date.now()}` });
  } catch (err) {
    return serverError('student document PUT', err, 'Could not save the image.');
  }
}
