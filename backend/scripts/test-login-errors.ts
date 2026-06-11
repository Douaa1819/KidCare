const BASE = process.env.API_BASE ?? 'http://localhost:10000/api';

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const cases = [
    { label: 'Valid admin', email: 'sophie@wlw.ma', password: 'Sophie123!' },
    { label: 'Wrong password', email: 'sophie@wlw.ma', password: 'WrongPass1!' },
    { label: 'Unknown email', email: 'nobody@example.com', password: 'WrongPass1!' },
    { label: 'Valid parent', email: 'sophie.parent@wlw.ma', password: 'SophieParent123!' },
  ];

  for (const c of cases) {
    const r = await login(c.email, c.password);
    const body = r.body as { code?: string; role?: string };
    console.log(
      `${c.label}: HTTP ${r.status}`,
      body.code ? `code=${body.code}` : body.role ? `role=${body.role}` : JSON.stringify(body),
    );
  }
}

main().catch(console.error);
