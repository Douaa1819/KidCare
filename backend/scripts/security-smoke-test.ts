/**
 * Tests manuels de sécurité (API locale).
 * Usage: npx ts-node scripts/security-smoke-test.ts
 */
const BASE = process.env.API_BASE ?? 'http://localhost:10000/api';

async function req(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body: parsed };
}

async function main() {
  console.log('🔒 Security smoke tests\n');

  // 1. SQL injection in login
  const sqli = await req('POST', '/auth/login-user', {
    email: "admin@example.com' OR '1'='1",
    password: "'; DROP TABLE users; --",
  });
  console.log(`SQLi login-user: ${sqli.status} (expect 400)`);

  // 2. Invalid UUID on familles (needs admin token — expect 401 without auth)
  const familles = await req('GET', '/familles/not-a-uuid');
  console.log(`Unguarded familles blocked: ${familles.status} (expect 401)`);

  // 3. XSS in public inscription if exists — skip if endpoint needs captcha
  const xss = await req('POST', '/public/inscriptions', {
    payload: { enfant: { prenom: '<script>alert(1)</script>', nom: 'Test' } },
  });
  console.log(`XSS inscription: ${xss.status}`);

  // 4. Parent login then try another child (if we have credentials)
  const parentLogin = await req('POST', '/auth/login-user', {
    email: 'sophie.parent@wlw.ma',
    password: 'SophieParent123!',
  });
  const parentToken = (parentLogin.body as { accessToken?: string })?.accessToken;
  if (parentToken) {
    const otherChild = await req(
      'GET',
      '/parent/enfants/00000000-0000-0000-0000-000000000099',
      undefined,
      parentToken,
    );
    console.log(`Parent foreign child: ${otherChild.status} (expect 403/404)`);
  }

  // 5. Teacher cannot access unassigned class summary filter
  const teacherLogin = await req('POST', '/auth/login-user', {
    email: 'enseignant.sophie@test.com',
    password: 'Teacher123!',
  });
  const teacherToken = (teacherLogin.body as { accessToken?: string })?.accessToken;
  if (teacherToken) {
    const foreignClass = await req(
      'GET',
      '/class-daily-summaries?classeId=00000000-0000-0000-0000-000000000002',
      undefined,
      teacherToken,
    );
    console.log(`Teacher foreign class: ${foreignClass.status} (expect 403)`);
  }

  // 6. Admin cannot hit platform without super admin
  const adminLogin = await req('POST', '/auth/login-user', {
    email: 'sophie@wlw.ma',
    password: 'Sophie123!',
  });
  const adminToken = (adminLogin.body as { accessToken?: string })?.accessToken;
  if (adminToken) {
    const platform = await req('GET', '/platform/users', undefined, adminToken);
    console.log(`Admin platform users: ${platform.status} (expect 403)`);
  }

  console.log('\n✅ Smoke tests completed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
