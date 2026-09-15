import { NextRequest, NextResponse } from 'next/server';
import { addNotice, deleteNotice, getAllNotices } from '@/lib/institute-store';

export async function GET() {
  const notices = getAllNotices();
  return NextResponse.json({ notices });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, audience, pinned } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Notice title and content are required' },
        { status: 400 }
      );
    }

    const notice = addNotice({
      title: title.trim(),
      content: content.trim(),
      audience: audience || 'All',
      pinned: Boolean(pinned),
    });

    return NextResponse.json({ success: true, notice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create notice' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notice ID is required' }, { status: 400 });
    }

    const ok = deleteNotice(id);
    if (!ok) {
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Notice deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete notice' },
      { status: 500 }
    );
  }
}
