const HARD = setTimeout(() => { console.error('HARD TIMEOUT'); process.exit(3); }, 25000);
async function login(identifier, password) {
  const res = await fetch('http://127.0.0.1:4000/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername: identifier, password }),
  });
  const json = await res.json();
  if (!json?.tokens?.access) throw new Error('login failed ' + JSON.stringify(json));
  return json;
}
function authH(token) { return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }; }
(async () => {
  const me = await login('zuhair', '13201');
  const token = me.tokens.access;

  console.log('--- create realm ---');
  let r = await fetch('http://127.0.0.1:4000/api/servers', {
    method: 'POST', headers: authH(token), body: JSON.stringify({ name: 'TestRealm ' + Date.now() }),
  });
  const created = await r.json();
  console.log('create status', r.status, 'body', JSON.stringify(created).slice(0, 400));
  if (r.status !== 201 || !created.server) { clearTimeout(HARD); process.exit(0); }

  const channelId = created.server.channels?.[0]?.id;
  console.log('channelId', channelId);

  console.log('--- fetch messages for new channel ---');
  r = await fetch(`http://127.0.0.1:4000/api/channels/${channelId}/messages`, { headers: authH(token) });
  console.log('messages status', r.status, 'body', JSON.stringify(await r.json()).slice(0, 300));

  console.log('--- fetch servers ---');
  r = await fetch('http://127.0.0.1:4000/api/servers', { headers: authH(token) });
  console.log('servers status', r.status, 'count', (await r.json()).length);

  clearTimeout(HARD);
  process.exit(0);
})().catch((e) => { console.error('TEST ERROR:', e.message); process.exit(1); });
