import { NextRequest, NextResponse } from 'next/server';
import {
  getAllStudyMaterials,
  addStudyMaterial,
  deleteStudyMaterial,
  incrementDownloadCount,
  StudyMaterial,
  MaterialCategory,
} from '@/lib/study-materials';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classNum = searchParams.get('classNumber');
    const subject = searchParams.get('subject');
    const category = searchParams.get('category');
    const q = searchParams.get('q');
    const downloadId = searchParams.get('download');

    if (downloadId) {
      const count = incrementDownloadCount(downloadId);
      return NextResponse.json({ success: true, downloads: count });
    }

    let materials: StudyMaterial[] = getAllStudyMaterials();

    if (classNum && classNum !== 'all') {
      const num = parseInt(classNum, 10);
      if (!isNaN(num)) {
        materials = materials.filter((m) => m.classNumber === num);
      }
    }

    if (subject && subject !== 'all') {
      materials = materials.filter(
        (m) => m.subject.toLowerCase() === subject.toLowerCase()
      );
    }

    if (category && category !== 'all') {
      materials = materials.filter(
        (m) => m.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (q) {
      const lower = q.toLowerCase();
      materials = materials.filter(
        (m) =>
          m.title.toLowerCase().includes(lower) ||
          m.description.toLowerCase().includes(lower) ||
          m.subject.toLowerCase().includes(lower) ||
          m.uploadedBy.toLowerCase().includes(lower)
      );
    }

    return NextResponse.json({
      success: true,
      count: materials.length,
      materials,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch study materials';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      classNumber,
      subject,
      category,
      fileUrl,
      fileSize,
      fileType,
      uploadedBy,
    } = body;

    if (!title || !classNumber || !subject || !category) {
      return NextResponse.json(
        { success: false, error: 'Title, Class, Subject, and Category are required.' },
        { status: 400 }
      );
    }

    const newMaterial = addStudyMaterial({
      title: title.trim(),
      description: description ? description.trim() : '',
      classNumber: Number(classNumber),
      subject: subject.trim(),
      category: category as MaterialCategory,
      fileUrl: fileUrl || '/materials/sample-document.pdf',
      fileSize: fileSize || '2.5 MB',
      fileType: fileType || 'PDF',
      uploadedBy: uploadedBy || 'Gnosis Faculty',
    });

    return NextResponse.json({
      success: true,
      message: 'Study material uploaded successfully!',
      material: newMaterial,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to save study material';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    const ok = deleteStudyMaterial(id);
    return NextResponse.json({ success: ok });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete study material';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
