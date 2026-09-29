// Seeds only a separate example classroom. Never resets existing credentials or data.
const origin = process.env.DEMO_URL || 'http://localhost:3000';
const className = '체험 학급 · 예시 30명';
const password = 'league2026';
let cookies = '';
async function call(path, body) {
  const res = await fetch(origin + '/api/' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', origin, cookie: cookies }, body: JSON.stringify(body) } : { headers: { cookie: cookies } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  if (path === 'auth') cookies = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  return data;
}
const catalog = await call('state');
if (catalog.classes?.some(c => c.name === className)) { console.log('Example classroom already exists. No data changed.'); process.exit(0); }
await call('auth', { action: 'create', name: className, password, names: Array.from({ length: 30 }, (_, i) => `학생 ${String(i + 1).padStart(2, '0')}`) });
let { state } = await call('state');
await call('action', { action: 'place', payload: { members: state.initialMembers } });
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const date = offset => { const d = new Date(today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
({ state } = await call('action', { action: 'season', payload: { name: '함께 도전하는 첫 시즌', start: today, end: date(27), exchanges: [2, 2], rounds: [0, 1].map(i => ({ league: { start: date(i * 14), end: date(i * 14 + 11), limit: 2 }, promotion: { start: date(i * 14 + 12), end: date(i * 14 + 13), limit: 2 } })) } }));
const round = state.seasons[0].rounds[0];
for (const league of ['rookie', 'challenger', 'champion']) {
  const ids = state.students.filter(s => round.members[s.id] === league).map(s => s.id);
  await call('action', { action: 'match', payload: { a: ids[0], b: ids[1], winner: ids[0], phaseId: round.league.id, requestId: crypto.randomUUID(), confirmed: [true, true] } });
}
({ state } = await call('action', { action: 'createBadgeTemplate', payload: { name: '멋진 도전', description: '친구와 함께 규칙을 지키며 대결했어요.' } }));
await call('action', { action: 'praise', payload: { studentId: state.students[20].id, templateId: state.badgeTemplates[0].id } });
await call('auth', { action: 'lock' });
console.log(`Example classroom ready: ${className}\nExample-only teacher password: ${password}`);
