/**
 * Creates (or resets) the admin / accountant / teacher accounts the Playwright
 * specs sign in with, on a TEST Supabase project. Never run against production.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node e2e/seed-e2e-accounts.mjs
 *
 * Prints the E2E_* variables to export before `npm run test:e2e`.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const password = process.env.E2E_PASSWORD || 'E2e!Passw0rd-2026';
const accounts = [
  { role: 'admin', email: 'e2e.admin@example.com', name: 'E2E Admin' },
  { role: 'accountant', email: 'e2e.accountant@example.com', name: 'E2E Accountant' },
  { role: 'teacher', email: 'e2e.teacher@example.com', name: 'E2E Teacher' },
];

const { data: branch } = await db.from('branches').select('id').eq('is_active', true).order('created_at').limit(1).maybeSingle();
if (!branch) throw new Error('No active branch. Apply the migrations first (supabase/migrations).');

const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
for (const a of accounts) {
  let user = list.users.find((u) => u.email === a.email);
  if (user) {
    await db.auth.admin.updateUserById(user.id, { password, email_confirm: true, ban_duration: 'none' });
  } else {
    const { data, error } = await db.auth.admin.createUser({ email: a.email, password, email_confirm: true, user_metadata: { full_name: a.name } });
    if (error) throw error;
    user = data.user;
  }
  const { error } = await db
    .from('profiles')
    .update({ role: a.role, full_name: a.name, is_active: true, branch_id: a.role === 'admin' ? null : branch.id })
    .eq('id', user.id);
  if (error) throw new Error(`${a.role}: ${error.message} (is there already a different admin?)`);
}

for (const a of accounts) {
  const k = a.role.toUpperCase();
  console.log(`export E2E_${k}_EMAIL='${a.email}'`);
  console.log(`export E2E_${k}_PASSWORD='${password}'`);
}
