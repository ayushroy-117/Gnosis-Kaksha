import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import type { MaterialCategory, StudyMaterial } from '@/lib/study-materials';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED: Record<string, StudyMaterial['fileType']> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/zip': 'ZIP',
  'application/x-zip-compressed': 'ZIP',
};
const COLUMNS = 'id, title, description, class_number, subject, category, file_name, file_type, file_size, uploaded_by, downloads, is_featured, created_at';

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapMaterial(r: any): StudyMaterial {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    classNumber: r.class_number,
    subject: r.subject,
    category: r.category,
    fileUrl: `/api/study-material/${r.id}/download`,
    fileName: r.file_name ?? undefined,
    fileSize: r.file_size ?? '',
    fileType: r.file_type ?? 'PDF',
    uploadedBy: r.uploaded_by,
    createdAt: (r.created_at ?? '').slice(0, 10),
    downloads: r.downloads ?? 0,
    isFeatured: r.is_featured ?? false,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function humanSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// GET /api/study-material?classNumber=&subject=&category=&q= — public catalogue
// (metadata only). Downloading a file requires signing in.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    let q = createAdminClient().from('study_materials').select(COLUMNS).order('created_at', { ascending: false });
    const classNum = Number(sp.get('classNumber'));
    if (classNum) q = q.eq('class_number', classNum);
    const subject = sp.get('subject');
    if (subject && subject !== 'all') q = q.ilike('subject', subject);
    const category = sp.get('category');
    if (category && category !== 'all') q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw error;

    let materials = (data ?? []).map(mapMaterial);
    const term = sp.get('q')?.trim().toLowerCase();
    if (term) {
      materials = materials.filter((m) =>
        [m.title, m.description, m.subject, m.uploadedBy].some((v) => v.toLowerCase().includes(term))
      );
    }
    return NextResponse.json({ success: true, count: materials.length, materials });
  } catch (err) {
    return serverError('study-material GET', err, 'Could not load study materials.');
  }
}

const metaSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().max(2000).default(''),
  classNumber: z.coerce.number().int().min(5).max(12),
  subject: z.string().trim().min(1).max(60),
  category: z.enum(['Notes', 'PYQ', 'Worksheet', 'Formula Sheet', 'Syllabus']),
});

// POST /api/study-material (multipart/form-data) — teacher/admin uploads a file.
export async function POST(req: NextRequest) {
  const auth = await requirePermission('manage_study_material');
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: 'Upload the file using the form.' }, { status: 400 });
  }
  const parsed = metaSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid details' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: 'Choose a file to upload.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: 'File is larger than 10 MB.' }, { status: 413 });
  }
  // Browsers sometimes report DOCX/ZIP with an empty or generic MIME type; fall back to the extension.
  const ext = file.name.split('.').pop()?.toLowerCase();
  const byExt: Record<string, StudyMaterial['fileType']> = { pdf: 'PDF', docx: 'DOCX', zip: 'ZIP' };
  const fileType = ALLOWED[file.type] ?? (ext && (!file.type || file.type === 'application/octet-stream') ? byExt[ext] : undefined);
  if (!fileType) {
    return NextResponse.json({ success: false, error: 'Only PDF, DOCX or ZIP files can be uploaded.' }, { status: 415 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const m = parsed.data;
    const { data, error } = await createAdminClient()
      .from('study_materials')
      .insert({
        title: m.title,
        description: m.description,
        class_number: m.classNumber,
        subject: m.subject,
        category: m.category as MaterialCategory,
        file_name: file.name.slice(0, 200),
        file_type: fileType,
        file_size: humanSize(file.size),
        file_data: `\\x${bytes.toString('hex')}`,
        uploaded_by: auth.user.fullName,
        uploader_id: auth.user.id,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Study material published.', material: mapMaterial(data) }, { status: 201 });
  } catch (err) {
    return serverError('study-material POST', err, 'Could not save the file.');
  }
}

// DELETE /api/study-material?id=<uuid> — teacher/admin.
export async function DELETE(req: NextRequest) {
  const auth = await requirePermission('manage_study_material');
  if (!auth.ok) return auth.response;
  const id = req.nextUrl.searchParams.get('id');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ success: false, error: 'A valid id is required.' }, { status: 400 });
  }
  try {
    const { data, error } = await createAdminClient().from('study_materials').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('study-material DELETE', err, 'Could not delete the material.');
  }
}
