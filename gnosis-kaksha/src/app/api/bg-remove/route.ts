import { NextRequest, NextResponse } from 'next/server';
import { clientIp, rateLimit } from '@/lib/rate-limit';

// POST /api/bg-remove — proxies to remove.bg API
// Body: multipart/form-data with:
//   - image: File (JPG or PNG, max 5MB)
//   - output_type: 'rgba' | 'white' (default: 'rgba')
export async function POST(request: NextRequest) {
  // remove.bg bills per call — keep the public tool from being abused.
  if (!rateLimit(`bg-remove:${clientIp(request.headers)}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: 'Hourly limit reached. Please try again later.' }, { status: 429 });
  }
  try {
    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Background removal service is not configured.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const outputType = (formData.get('output_type') as string) || 'rgba';

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Only JPG and PNG files are supported' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (imageFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be 5MB or less' },
        { status: 400 }
      );
    }

    // Build remove.bg request
    const removeBgForm = new FormData();
    removeBgForm.append('image_file', imageFile);
    removeBgForm.append('size', 'auto');

    // If white background requested, set bg_color
    if (outputType === 'white') {
      removeBgForm.append('bg_color', 'ffffff');
    }

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: removeBgForm,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('remove.bg API error:', errText);
      return NextResponse.json(
        { error: 'Background removal failed. Please try again.' },
        { status: response.status }
      );
    }

    // Stream the PNG result directly back to the browser
    const imageBuffer = await response.arrayBuffer();
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="removed-bg.png"',
      },
    });
  } catch (error) {
    console.error('bg-remove API error:', error);
    return NextResponse.json(
      { error: 'Background removal failed. Please try again.' },
      { status: 500 }
    );
  }
}
