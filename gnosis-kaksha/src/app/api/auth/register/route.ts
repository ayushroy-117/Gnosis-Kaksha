import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role, fullName } = body;

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const validRoles = ['admin', 'accountant', 'teacher', 'student'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Role must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const displayName = (fullName && fullName.trim()) || cleanEmail.split('@')[0];

    // ── Supabase Admin registration ──────────────────────────────────────────
    const supabase = createAdminClient();
    if (supabase) {
      // Check if user already exists
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (!listError && listData?.users) {
        const existing = listData.users.find(
          (u) => u.email?.toLowerCase() === cleanEmail
        );

        if (existing) {
          // Update password, auto-confirm email, and refresh metadata
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existing.id,
            {
              password: password,
              email_confirm: true,
              user_metadata: {
                role: role,
                full_name: displayName,
              },
            }
          );

          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 });
          }

          return NextResponse.json({
            success: true,
            message: 'Account updated and confirmed successfully.',
            user: {
              id: existing.id,
              email: cleanEmail,
              role: role,
              fullName: displayName,
            },
          });
        }
      }

      // Create new user with confirmed email
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          role: role,
          full_name: displayName,
        },
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Account created successfully.',
        user: {
          id: created.user.id,
          email: created.user.email,
          role: role,
          fullName: displayName,
        },
      });
    }

    // ── Offline / Fallback mode ──────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: 'Account created successfully (Offline mode).',
      user: {
        id: `usr-${Date.now().toString(36)}`,
        email: cleanEmail,
        role: role,
        fullName: displayName,
      },
    });
  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create account.' },
      { status: 500 }
    );
  }
}
