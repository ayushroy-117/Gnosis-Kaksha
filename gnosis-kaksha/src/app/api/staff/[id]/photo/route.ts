import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/staff/<userId>/photo — a staff photo; the person themself or the admin.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  if (user.id !== id && user.role !== 'admin') {
    return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
  }
  try {
    const { data, error } = await createAdminClient().from('staff_photos').select('mime_type, data').eq('user_id', id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not uploaded yet.' }, { status: 404 });
    const hex = String(data.data);
    const bytes = Buffer.from(hex.startsWith('\\x') ? hex.slice(2) : hex, 'hex');
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': data.mime_type,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
      },
    });
  } catch (err) {
    return serverError('staff photo GET', err, 'Could not load the image.');
  }
}
