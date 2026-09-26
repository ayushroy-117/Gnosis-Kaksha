import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { serverError } from '@/lib/authz';
import { clientIp, rateLimit } from '@/lib/rate-limit';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('Enter a valid email').max(200).optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  message: z.string().trim().min(5, 'Message must be at least 5 characters').max(3000),
});

// POST /api/contact — public contact form; saved to contact_messages.
export async function POST(request: NextRequest) {
  if (!rateLimit(`contact:${clientIp(request.headers)}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many messages. Please try again later or call us.' }, { status: 429 });
  }
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Please check the form.' }, { status: 400 });
  }
  const { name, email, phone, message } = parsed.data;
  try {
    const { error } = await createAdminClient()
      .from('contact_messages')
      .insert({ name, email: email || null, phone: phone || null, message });
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Thank you! Your message has been sent.' }, { status: 201 });
  } catch (err) {
    return serverError('contact', err, 'Failed to send your message. Please try again.');
  }
}
