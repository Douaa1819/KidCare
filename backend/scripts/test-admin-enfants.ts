const BASE = process.env.API_BASE ?? 'http://localhost:10000/api';

async function main() {
  const login = await fetch(`${BASE}/auth/login-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sophie@wlw.ma', password: 'Sophie123!' }),
  });
  const { accessToken } = (await login.json()) as { accessToken?: string };
  if (!accessToken) {
    console.error('Login failed', await login.text());
    return;
  }

  const res = await fetch(`${BASE}/admin/enfants?page=1&pageSize=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.json();
  console.log('Status:', res.status);
  console.log('Keys:', Object.keys(body));
  console.log('Items:', (body as { items?: unknown[] }).items?.length ?? 'N/A');
  console.log('Total:', (body as { total?: number }).total);
  console.log(JSON.stringify((body as { items?: unknown[] }).items, null, 2));
}

main().catch(console.error);
