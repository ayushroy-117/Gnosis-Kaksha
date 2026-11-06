// Makes sure the permanent test logins exist, are active and have the configured passwords.
// Runs INSIDE the app container at the end of every deploy (deploy.sh pipes it to `node`),
// so it reaches Supabase exactly like the app does — self-hosted or cloud — with no deps.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (already in the container), and
//      TEST_ADMIN_PASSWORD / TEST_ACCOUNTANT_PASSWORD / TEST_TEACHER_PASSWORD / TEST_STUDENT_PASSWORD
//      (GitHub secrets via deploy.yml, or the app .env), TEST_DOMAIN (default gnosiskaksha.in).
// A role whose password is unset is skipped. Passwords are never printed.
//
// Admin: the database allows exactly ONE admin, so the test admin IS the master admin —
// its password is (re)set to TEST_ADMIN_PASSWORD on every run.
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DOMAIN = process.env.TEST_DOMAIN || 'gnosiskaksha.in';
if (!URL_ || !KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
const pw = (role) => process.env[`TEST_${role.toUpperCase()}_PASSWORD`] || '';

async function call(method, path, body, prefer) {
  const res = await fetch(`${URL_}${path}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path.split('?')[0]} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const rest = (method, table, query = '', body) =>
  call(method, `/rest/v1/${table}${query}`, body, 'return=representation');
const one = async (table, query) => (await rest('GET', table, query))[0] ?? null;
const q = encodeURIComponent;

// Create the auth user, or reset its password and unban it. Returns its id.
async function upsertUser(email, password, fullName) {
  const attrs = { password, email_confirm: true, ban_duration: 'none', user_metadata: { full_name: fullName } };
  const existing = await one('profiles', `?select=id&email=eq.${q(email)}`);
  if (existing) {
    await call('PUT', `/auth/v1/admin/users/${existing.id}`, attrs);
    return existing.id;
  }
  return (await call('POST', '/auth/v1/admin/users', { email, ...attrs })).id;
}

// Same formula as staffCodeFor() in src/lib/server/staff.ts.
const staffCode = (role, id) =>
  `GK-${role === 'teacher' ? 'FAC' : role.slice(0, 3).toUpperCase()}-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;

const branch = await one('branches', '?select=id&is_active=eq.true&order=created_at&limit=1');
if (!branch) throw new Error('No active branch — apply supabase/migrations first.');
const now = () => new Date().toISOString();

if (pw('admin')) {
  const admin = await one('profiles', '?select=id,email&role=eq.admin');
  if (!admin) {
    console.log('  test login SKIPPED: admin — no master admin yet, run deploy/scripts/seed-admin.sh');
  } else {
    await call('PUT', `/auth/v1/admin/users/${admin.id}`, { password: pw('admin'), email_confirm: true, ban_duration: 'none' });
    await rest('PATCH', 'profiles', `?id=eq.${admin.id}`, { is_active: true });
    console.log(`  test login ok: admin      ${admin.email}`);
  }
}

for (const role of ['accountant', 'teacher']) {
  if (!pw(role)) continue;
  const email = `test.${role}@${DOMAIN}`;
  const name = `Test ${role[0].toUpperCase()}${role.slice(1)}`;
  const id = await upsertUser(email, pw(role), name);
  const prof = await one('profiles', `?select=branch_id&id=eq.${id}`);
  await rest('PATCH', 'profiles', `?id=eq.${id}`, {
    role, full_name: name, is_active: true, branch_id: prof?.branch_id ?? branch.id, updated_at: now(),
  });
  await call('POST', '/rest/v1/staff_details?on_conflict=user_id', { user_id: id, staff_code: staffCode(role, id) },
    'resolution=ignore-duplicates,return=minimal');
  await rest('PATCH', 'staff_details', `?user_id=eq.${id}`, { employment_status: 'active' });
  console.log(`  test login ok: ${role.padEnd(10)} ${email}`);
}

if (pw('student')) {
  const email = `test.student@${DOMAIN}`;
  const id = await upsertUser(email, pw('student'), 'Test Student');
  let sid = (await one('profiles', `?select=student_id&id=eq.${id}`))?.student_id;
  if (!sid) {
    // Already approved, so the dashboard isn't locked behind "Admission under review".
    [{ id: sid }] = await rest('POST', 'students', '', {
      branch_id: branch.id, full_name: 'Test Student', class_number: 10, board: 'SEBA',
      subjects: ['Mathematics', 'Science', 'English'], parent_name: 'Test Parent', mobile: '9000000000',
      email, admission_date: now().slice(0, 10), status: 'active',
    });
  }
  await rest('PATCH', 'students', `?id=eq.${sid}`, { status: 'active' });
  await rest('PATCH', 'profiles', `?id=eq.${id}`, {
    role: 'student', student_id: sid, full_name: 'Test Student', is_active: true, updated_at: now(),
  });
  const { registration_number } = await one('students', `?select=registration_number&id=eq.${sid}`);
  console.log(`  test login ok: student    ${email} (${registration_number})`);
}
