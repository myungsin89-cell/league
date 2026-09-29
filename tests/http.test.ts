import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { NextRequest } from 'next/server';
import { POST as auth } from '../src/app/api/auth/route';
import { POST as action } from '../src/app/api/action/route';
import { GET as state } from '../src/app/api/state/route';
import { GET as exportData } from '../src/app/api/export/route';
import { db, mutateClass, getClass } from '../src/lib/store';
import { Classroom, scheduleDefaults, todaySeoul, addDays } from '../src/lib/league';
process.env.CLASS_LEAGUE_DB = resolve(`data/test-${crypto.randomUUID()}.sqlite`);
const origin = 'http://localhost:3000';
function request(path: string, body?: object, cookies: Record<string, string> = {}, from = origin) {
  return new NextRequest(origin + '/api/' + path, { method: body ? 'POST' : 'GET', headers: { origin: from, 'Content-Type': 'application/json', cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') }, body: body ? JSON.stringify(body) : undefined });
}
async function create(name = 'API 검증') {
  const res = await auth(request('auth', { action: 'create', name, password: 'test-only-2026', names: Array.from({ length: 30 }, (_, i) => `예시 ${i + 1}`) }));
  assert.equal(res.status, 200);
  const cookies = Object.fromEntries(res.cookies.getAll().map(c => [c.name, c.value]));
  const data = await (await state(request('state', undefined, cookies))).json();
  return { cookies, state: data.state as Classroom };
}
test('API requires device session and a separate teacher session; lock revokes server permission', async () => {
  const unauth = await action(request('action', { action: 'praise', payload: {} })); assert.equal(unauth.status, 401);
  const example = await create(); const kiosk = { cl_kiosk: example.cookies.cl_kiosk };
  const forbidden = await action(request('action', { action: 'activity', payload: { name: '새 활동', instructions: '안내' } }, kiosk)); assert.equal(forbidden.status, 403);
  const allowed = await action(request('action', { action: 'activity', payload: { name: '새 활동', instructions: '안내' } }, example.cookies)); assert.equal(allowed.status, 200);
  assert.equal((await exportData(request('export', undefined, kiosk))).status, 403);
  assert.equal((await exportData(request('export', undefined, example.cookies))).status, 200);
  assert.equal((await auth(request('auth', { action: 'lock' }, example.cookies))).status, 200);
  assert.equal((await action(request('action', { action: 'activity', payload: { name: '변경', instructions: '안내' } }, example.cookies))).status, 403);
  assert.equal((await state(request('state', undefined, kiosk))).status, 200);
});
test('teacher permission is scoped to its class, and no password hash leaks to the device', async () => {
  const first = await create('첫 학급'), second = await create('다른 학급');
  const wrong = { cl_kiosk: first.cookies.cl_kiosk, cl_admin: second.cookies.cl_admin };
  assert.equal((await action(request('action', { action: 'activity', payload: { name: '변경', instructions: '안내' } }, wrong))).status, 403);
  const json = await (await state(request('state', undefined, first.cookies))).text();
  assert.ok(!json.includes('password')); assert.ok(!json.includes('salt'));
  const unauth = await (await state(request('state'))).json(); assert.equal(unauth.state, null);
  assert.ok(!JSON.stringify(unauth).includes(first.state.students[0].id));
  const raw = db().prepare('SELECT password FROM classrooms WHERE id=?').get(first.state.id) as { password: string };
  assert.notEqual(raw.password, 'test-only-2026');
});
test('forged origin and expired administrative sessions are denied', async () => {
  const example = await create();
  assert.equal((await auth(request('auth', { action: 'lock' }, example.cookies, 'https://other.example'))).status, 403);
  db().prepare("UPDATE sessions SET expires=0 WHERE class_id=? AND role='admin'").run(example.state.id);
  assert.equal((await action(request('action', { action: 'activity', payload: { name: '변경', instructions: '안내' } }, example.cookies))).status, 403);
});
test('transaction rollback preserves the original state after validation fails', async () => {
  const example = await create();
  await assert.rejects(() => mutateClass(example.state.id, state => { state.name = '저장되면 안 됨'; throw new Error('abort'); }));
  assert.equal((await getClass(example.state.id)).name, example.state.name);
});
test('custom medal templates persist separately from awards and require teacher permission', async () => {
  const example = await create(), kiosk = { cl_kiosk: example.cookies.cl_kiosk };
  const createTemplate = { action: 'createBadgeTemplate', payload: { name: '함께한 도전', description: '함께 참여한 모습을 기념해요', color: '#c66f91' } };
  assert.equal((await action(request('action', createTemplate, kiosk))).status, 403);
  assert.equal((await action(request('action', createTemplate, example.cookies))).status, 200);
  const saved = await getClass(example.state.id);
  assert.equal(saved.badgeTemplates.length, 1); assert.equal(saved.badges.length, 0);
  assert.equal(saved.badgeTemplates[0].color, '#c66f91');
  for (const student of saved.students.slice(0, 2)) {
    assert.equal((await action(request('action', { action: 'praise', payload: { templateId: saved.badgeTemplates[0].id, studentId: student.id } }, example.cookies))).status, 200);
  }
  assert.equal((await getClass(saved.id)).badges.length, 2);
  assert.ok((await getClass(saved.id)).badges.every(b => b.color === '#c66f91'));
  const other = await create('다른 학급의 훈장');
  assert.equal((await action(request('action', { action: 'praise', payload: { templateId: saved.badgeTemplates[0].id, studentId: other.state.students[0].id } }, other.cookies))).status, 400);
});
test('legacy awards are preserved and become reusable templates when a classroom is loaded', async () => {
  const example = await create();
  const legacy = { ...example.state } as Partial<Classroom>;
  delete legacy.badgeTemplates;
  legacy.badges = [0, 1].map(i => ({ id: `old-${i}`, studentId: example.state.students[i].id, kind: 'praise' as const, name: '기존 훈장', description: '기존 수여 이유', at: '2026-09-28T00:00:00Z' }));
  db().prepare('UPDATE classrooms SET state=? WHERE id=?').run(JSON.stringify(legacy), example.state.id);
  const loaded = await getClass(example.state.id);
  assert.equal(loaded.badgeTemplates.length, 1); assert.equal(loaded.badges.length, 2);
  assert.ok(loaded.badges.every(b => b.templateId === loaded.badgeTemplates[0].id));
  await mutateClass(loaded.id, state => { state.activity.name = '이관 확인'; });
  const persisted = await getClass(loaded.id);
  assert.equal(persisted.badgeTemplates[0].id, loaded.badgeTemplates[0].id);
  assert.equal(persisted.badges[0].description, '기존 수여 이유');
});
test('concurrent tablets cannot consume the same final opportunity twice', async () => {
  const example = await create();
  await action(request('action', { action: 'place', payload: { members: example.state.initialMembers } }, example.cookies));
  const today = todaySeoul();
  const setup = await action(request('action', { action: 'season', payload: { name: '동시 입력 시즌', start: today, end: addDays(today, 27), exchanges: [2, 2], rounds: scheduleDefaults(today, addDays(today, 27), 2) } }, example.cookies));
  assert.equal(setup.status, 200);
  const classroom = (await setup.json()).state as Classroom, round = classroom.seasons[0].rounds[0];
  const ids = Object.keys(round.members).filter(id => round.members[id] === 'rookie');
  const kiosk = { cl_kiosk: example.cookies.cl_kiosk };
  const payload = (b: string) => ({ action: 'match', payload: { a: ids[0], b, winner: ids[0], confirmed: [true, true], phaseId: round.league.id, requestId: crypto.randomUUID() } });
  assert.equal((await action(request('action', payload(ids[1]), kiosk))).status, 200);
  const results = await Promise.all([action(request('action', payload(ids[2]), kiosk)), action(request('action', payload(ids[3]), kiosk))]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 400]);
  assert.equal((await getClass(example.state.id)).matches.filter(m => m.a === ids[0] || m.b === ids[0]).length, 2);
});
test('legitimate browser Origin matches Host when Next uses the bind address internally', async () => {
  const example = await create();
  const req = new NextRequest('http://0.0.0.0:3000/api/action', { method: 'POST', headers: { host: 'localhost:3000', origin, 'Content-Type': 'application/json', cookie: Object.entries(example.cookies).map(([k, v]) => `${k}=${v}`).join('; ') }, body: JSON.stringify({ action: 'activity', payload: { name: '연결 확인', instructions: '같은 기기에서 정상 입력' } }) });
  assert.equal((await action(req)).status, 200);
});
