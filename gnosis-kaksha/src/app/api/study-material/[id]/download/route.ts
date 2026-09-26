import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ZIP: 'application/zip',
};

// GET /api/study-material/<id>/download — signed-in students and staff.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('download_study_material');
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('study_materials')
      .select('file_data, file_name, file_type')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data?.file_data) return NextResponse.json({ error: 'File not found.' }, { status: 404 });

    await db.rpc('increment_material_downloads', { p_id: id });

    const hex = String(data.file_data);
    const bytes = Buffer.from(hex.startsWith('\\x') ? hex.slice(2) : hex, 'hex');
    const name = (data.file_name || `material.${String(data.file_type).toLowerCase()}`).replace(/["\r\n]/g, '');
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': MIME[data.file_type] ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return serverError('study-material download', err, 'Could not download the file.');
  }
}
