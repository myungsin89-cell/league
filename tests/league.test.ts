import test from 'node:test';
import assert from 'node:assert/strict';
import { LEAGUES, League, newClass, adminAction, createSeason, recordMatch, standings, generateFixtures, validateFixtures, movementPreview, closeRound, currentSeason, stage, badgesFor, correctMatch, scheduleDefaults, updateSeason, addDays, todaySeoul } from '../src/lib/league';

function classroom(count = 30) { const state = newClass('검증 학급', Array.from({ length: count }, (_, i) => `학생 ${i + 1}`)); adminAction(state, 'place', { members: state.initialMembers }); return state; }
function seasonState(count = 2, size = 30) {
  const state = classroom(size);
  createSeason(state, { name: '첫 시즌', start: '2026-01-01', end: '2026-01-28', exchanges: [2, 2], rounds: scheduleDefaults('2026-01-01', '2026-01-28', count, 2) }); return state;
}
function record(state: ReturnType<typeof newClass>, a: string, b: string, winner: string, date: string) {
  return recordMatch(state, { a, b, winner, phaseId: stage(state, date).phase!.id, requestId: crypto.randomUUID(), confirmed: [true, true] }, date);
}
function orders(state: ReturnType<typeof newClass>) {
  const round = currentSeason(state)!.rounds.find(r => !r.closed)!;
  const rows = standings(state, round);
  return Object.fromEntries(LEAGUES.map(l => [l, rows.filter(r => r.league === l).map(r => r.id)]));
}
function playFixtures(state: ReturnType<typeof newClass>) {
  const round = currentSeason(state)!.rounds.find(r => !r.closed)!;
  for (const f of round.fixtures) record(state, f.a, f.b, f.a, round.promotion.start);
}
test('initial placement is once per class and does not carry RP', () => {
  const state = newClass('학급', Array.from({ length: 30 }, (_, i) => `학생${i}`));
  record(state, state.students[0].id, state.students[1].id, state.students[0].id, todaySeoul());
  assert.equal(standings(state).find(s => s.id === state.students[0].id)!.rp, 0);
  adminAction(state, 'place', { members: state.initialMembers });
  assert.throws(() => adminAction(state, 'place', { members: state.initialMembers }), /이미/);
  assert.throws(() => recordMatch(state, { a: state.students[0].id, b: state.students[2].id, winner: state.students[0].id, phaseId: 'placement', requestId: crypto.randomUUID(), confirmed: [true, true] }, '2026-01-01'), /경기 기간/);
});
test('automatic pairing is regular, unique and within leagues for every feasible size', () => {
  for (let n = 2; n <= 15; n++) for (let k = 1; k < n; k++) {
    const members = Object.fromEntries(LEAGUES.flatMap(l => Array.from({ length: n }, (_, i) => [`${l}-${i}`, l]))) as Record<string, League>;
    if (n * k % 2) assert.throws(() => generateFixtures(members, k), /배정할 수 없습니다/);
    else { const fixtures = generateFixtures(members, k); for (const l of LEAGUES) validateFixtures(fixtures, Object.keys(members).filter(id => members[id] === l), l, k); assert.equal(fixtures.length, n * k * 3 / 2); }
  }
});
test('regular matches score both students, deduct both quotas, enforce idempotence', () => {
  const state = seasonState(), round = currentSeason(state)!.rounds[0], ids = Object.keys(round.members).filter(id => round.members[id] === 'rookie');
  const payload = { a: ids[0], b: ids[1], winner: ids[0], phaseId: round.league.id, requestId: crypto.randomUUID(), confirmed: [true, true] };
  recordMatch(state, payload, round.league.start); recordMatch(state, payload, round.league.start);
  assert.equal(state.matches.length, 1);
  const rows = standings(state, round, round.league.id);
  assert.equal(rows.find(s => s.id === ids[0])!.rp, 10);
  assert.equal(rows.find(s => s.id === ids[0])!.remaining, 1);
  assert.equal(rows.find(s => s.id === ids[1])!.remaining, 1);
  assert.equal(rows.find(s => s.id === ids[0])!.played, 1);
  assert.equal(rows.find(s => s.id === ids[1])!.played, 1);
  assert.throws(() => record(state, ids[1], ids[0], ids[0], round.league.start), /이미 대결/);
  record(state, ids[0], ids[2], ids[2], round.league.start);
  assert.throws(() => record(state, ids[0], ids[3], ids[3], round.league.start), /경기 기회/);
});
test('cross-league, self, stale-phase and incomplete confirmation are rejected', () => {
  const state = seasonState(), round = currentSeason(state)!.rounds[0], a = Object.keys(round.members).find(id => round.members[id] === 'rookie')!, b = Object.keys(round.members).find(id => round.members[id] === 'champion')!;
  assert.throws(() => record(state, a, b, a, round.league.start), /같은 리그/);
  assert.throws(() => record(state, a, a, a, round.league.start), /두 학생/);
  assert.throws(() => recordMatch(state, { a, b, winner: a, phaseId: round.league.id, requestId: crypto.randomUUID(), confirmed: [true, false] }, round.league.start), /두 사람/);
  assert.throws(() => recordMatch(state, { a, b, winner: a, phaseId: round.league.id, requestId: crypto.randomUUID(), confirmed: [true, true] }, round.promotion.start), /기간/);
});
test('promotion permits only fixtures and gives 15 RP', () => {
  const state = seasonState(), round = currentSeason(state)!.rounds[0], f = round.fixtures[0];
  record(state, f.a, f.b, f.a, round.promotion.start);
  assert.equal(standings(state, round).find(r => r.id === f.a)!.rp, 15);
  const other = Object.keys(round.members).find(id => round.members[id] === f.league && !round.fixtures.some(fix => [fix.a, fix.b].includes(f.a) && [fix.a, fix.b].includes(id)))!;
  assert.throws(() => record(state, f.a, other, f.a, round.promotion.start), /지정된/);
});
test('regular and promotion quotas are separate and each phase disallows repeat opponents', () => {
  const state = seasonState(), round = currentSeason(state)!.rounds[0], f = round.fixtures[0];
  record(state, f.a, f.b, f.a, round.league.start); record(state, f.a, f.b, f.a, round.promotion.start);
  assert.equal(standings(state, round, round.promotion.id).find(r => r.id === f.a)!.rp, 25);
  for (const phase of [round.league, round.promotion]) {
    for (const id of [f.a, f.b]) {
      const row = standings(state, round, phase.id).find(r => r.id === id)!;
      assert.equal(row.played, 1);
      assert.equal(row.remaining, phase.limit - 1);
    }
  }
});

test('placement counts wins and losses toward the maximum and cancellation restores the quota', () => {
  const state = newClass('경기 횟수 확인', Array.from({ length: 9 }, (_, i) => `학생${i}`));
  adminAction(state, 'placementLimit', { limit: 2 });
  const [a, b, c, d] = state.students.map(s => s.id);
  record(state, a, b, a, todaySeoul());
  const lost = record(state, a, c, c, todaySeoul());
  const row = standings(state).find(s => s.id === a)!;
  assert.equal(row.played, 2);
  assert.equal(row.remaining, 0);
  assert.throws(() => record(state, a, d, d, todaySeoul()), /경기 기회/);
  assert.throws(() => record(state, d, a, d, todaySeoul()), /경기 기회/);
  correctMatch(state, { id: lost.id, voided: true, reason: '중복 입력 취소' });
  assert.equal(standings(state).find(s => s.id === a)!.played, 1);
  assert.equal(standings(state).find(s => s.id === a)!.remaining, 1);
  record(state, d, a, d, todaySeoul());
  assert.equal(standings(state).find(s => s.id === a)!.played, 2);
});
test('correction and cancellation recalculate points and restore opportunities', () => {
  const state = seasonState(), round = currentSeason(state)!.rounds[0], f = round.fixtures[0];
  const m = record(state, f.a, f.b, f.a, round.league.start);
  correctMatch(state, { id: m.id, winner: f.b, reason: '승자 수정' });
  assert.equal(standings(state, round).find(s => s.id === f.a)!.rp, 0);
  assert.equal(standings(state, round).find(s => s.id === f.b)!.rp, 10);
  correctMatch(state, { id: m.id, voided: true, reason: '경기 취소' });
  assert.equal(standings(state, round, round.league.id).find(s => s.id === f.b)!.remaining, 2);
  assert.equal(m.revisions.length, 2);
});
test('3-win streak badge is recomputed after correction', () => {
  const state = seasonState(), round = currentSeason(state)!.rounds[0]; round.league.limit = 4;
  const ids = Object.keys(round.members).filter(id => round.members[id] === 'rookie');
  const matches = [1, 2, 3].map(i => record(state, ids[0], ids[i], ids[0], round.league.start));
  assert.equal(badgesFor(state, ids[0]).filter(b => b.kind === 'streak').length, 1);
  correctMatch(state, { id: matches[1].id, winner: ids[2], reason: '실제 승자' });
  assert.equal(badgesFor(state, ids[0]).filter(b => b.kind === 'streak').length, 0);
});
test('closing requires resolving boundary ties and preserves league sizes', () => {
  const state = seasonState(); playFixtures(state);
  assert.throws(() => closeRound(state, {}, '2026-01-14'), /동점/);
  const oldRound = currentSeason(state)!.rounds[0]; const preview = movementPreview(state, oldRound, [2, 2], orders(state));
  closeRound(state, orders(state), '2026-01-14');
  const next = currentSeason(state)!.rounds[1];
  for (const l of LEAGUES) assert.equal(Object.values(next.members).filter(v => v === l).length, 10);
  assert.deepEqual(next.members, preview.nextMembers);
  assert.ok(standings(state, next).every(r => r.rp === 0 && r.wins === 0));
  assert.equal(state.badges.filter(b => b.kind === 'promotion').length, 4);
  assert.throws(() => correctMatch(state, { id: state.matches[0].id, winner: state.matches[0].b, reason: '마감 후' }), /마감/);
});
test('final ranking retains old league while final promotion applies next season', () => {
  const state = seasonState(1); playFixtures(state);
  const season = currentSeason(state)!, original = { ...season.rounds[0].members };
  closeRound(state, orders(state), '2026-01-28');
  assert.equal(season.completed, true); assert.equal(stage(state).kind, 'complete');
  for (const row of season.rounds[0].finalRows!) assert.equal(row.league, original[row.id]);
  assert.ok(Object.keys(original).some(id => original[id] !== season.nextMembers![id]));
  assert.equal(state.badges.filter(b => b.kind === 'promotion').length, 0);
  createSeason(state, { name: '다음 시즌', start: '2026-02-01', end: '2026-02-28', exchanges: [2, 2], rounds: scheduleDefaults('2026-02-01', '2026-02-28', 1) });
  assert.deepEqual(currentSeason(state)!.rounds[0].members, season.nextMembers);
  assert.equal(state.badges.filter(b => b.kind === 'promotion').length, 4);
  assert.equal(state.placed, true);
});
test('1, 2 and 3 promotion periods use valid non-overlapping dates', () => {
  for (const count of [1, 2, 3]) { const state = seasonState(count); assert.equal(currentSeason(state)!.rounds.length, count); assert.equal(currentSeason(state)!.rounds.at(-1)!.promotion.end, '2026-01-28'); }
  assert.throws(() => scheduleDefaults('2026-01-01', '2026-01-04', 3), /기간/);
});
test('schedule changes are allowed before games and recorded phases stay immutable', () => {
  const state = seasonState(), season = currentSeason(state)!, rounds = scheduleDefaults(season.start, season.end, 2);
  updateSeason(state, { name: '수정 시즌', start: season.start, end: season.end, exchanges: [1, 1], rounds });
  const revised = currentSeason(state)!, f = revised.rounds[0].fixtures[0];
  record(state, f.a, f.b, f.a, revised.rounds[0].league.start);
  rounds[0].league.limit = 3;
  assert.throws(() => updateSeason(state, { name: '수정', start: season.start, end: season.end, exchanges: [1, 1], rounds }), /경기 기록/);
});
test('unfeasible odd pairings, overlap and overlapping promotion targets reject settings', () => {
  const state = classroom(9);
  assert.throws(() => createSeason(state, { name: '실패', start: '2026-01-01', end: '2026-01-28', exchanges: [1, 1], rounds: scheduleDefaults('2026-01-01', '2026-01-28', 1, 1) }), /배정할 수 없습니다/);
  const normal = classroom(); const rounds = scheduleDefaults('2026-01-01', '2026-01-28', 2); rounds[0].promotion.start = rounds[0].league.end;
  assert.throws(() => createSeason(normal, { name: '실패', start: '2026-01-01', end: '2026-01-28', exchanges: [2, 2], rounds }), /겹치/);
  assert.throws(() => createSeason(normal, { name: '실패', start: '2026-01-01', end: '2026-01-28', exchanges: [6, 6], rounds: scheduleDefaults('2026-01-01', '2026-01-28', 1) }), /대상이 겹칩니다/);
});
test('no mid-phase early closing, and date boundary changes active stage', () => {
  const state = seasonState(), round = currentSeason(state)!.rounds[0];
  assert.equal(stage(state, addDays(round.league.start, -1)).kind, 'waiting');
  assert.equal(stage(state, round.league.end).kind, 'league'); assert.equal(stage(state, round.promotion.start).kind, 'promotion');
  assert.equal(stage(state, addDays(round.promotion.end, 1)).kind, 'closing');
  assert.throws(() => closeRound(state, orders(state), round.promotion.start), /지정 경기/);
});
test('a saved custom medal can be awarded to multiple students and revoked without affecting its template or RP', () => {
  const state = seasonState(), id = state.students[0].id;
  adminAction(state, 'createBadgeTemplate', { name: '멋진 도전', description: '친구를 응원함', color: '#8964B3' });
  assert.equal(state.badges.length, 0);
  const templateId = state.badgeTemplates[0].id;
  adminAction(state, 'praise', { studentId: id, templateId, name: '조작한 이름', color: '#ffffff' });
  adminAction(state, 'praise', { studentId: state.students[1].id, templateId });
  assert.ok(state.badges.every(b => b.name === '멋진 도전' && b.description === '친구를 응원함'));
  assert.ok(state.badges.every(b => b.color === '#8964b3'));
  assert.throws(() => adminAction(state, 'praise', { studentId: id, templateId }), /이미 수여/);
  assert.equal(badgesFor(state, id).length, 1); assert.equal(standings(state).find(s => s.id === id)!.rp, 0);
  adminAction(state, 'revoke', { id: state.badges[0].id }); assert.equal(badgesFor(state, id).length, 0);
  assert.equal(state.badgeTemplates.length, 1);
  assert.equal(badgesFor(state, state.students[1].id).length, 1);
  adminAction(state, 'praise', { studentId: id, templateId });
  assert.equal(badgesFor(state, id).length, 1);
});
test('custom medals require a saved template and a valid student', () => {
  const state = classroom(), studentId = state.students[0].id;
  assert.throws(() => adminAction(state, 'createBadgeTemplate', { name: ' ', description: '설명' }), /훈장 이름/);
  assert.throws(() => adminAction(state, 'createBadgeTemplate', { name: '잘못된 색상', description: '설명', color: 'red' }), /색상/);
  adminAction(state, 'createBadgeTemplate', { name: '도전', description: '도전을 기념해요' });
  assert.throws(() => adminAction(state, 'createBadgeTemplate', { name: '도전', description: '다른 설명' }), /같은 이름/);
  assert.throws(() => adminAction(state, 'praise', { studentId, name: '즉석 훈장', description: '설명' }), /미리 만든/);
  assert.throws(() => adminAction(state, 'praise', { studentId, templateId: 'missing' }), /미리 만든/);
  assert.throws(() => adminAction(state, 'praise', { studentId: 'missing', templateId: state.badgeTemplates[0].id }), /학생/);
  assert.equal(state.badges.length, 0);
});
test('placement defaults to two days and rejects records outside its dates', () => {
  const state = newClass('배치 일정', Array.from({ length: 30 }, (_, i) => `학생${i}`));
  assert.equal(state.placement!.end, addDays(state.placement!.start, 1));
  adminAction(state, 'placementDates', { start: '2026-01-01', end: '2026-01-02' });
  assert.equal(stage(state, '2025-12-31').kind, 'waiting');
  assert.equal(stage(state, '2026-01-02').kind, 'placement');
  assert.equal(stage(state, '2026-01-03').kind, 'closing');
  record(state, state.students[0].id, state.students[1].id, state.students[0].id, '2026-01-01');
  assert.throws(() => adminAction(state, 'placementDates', { start: '2026-01-02', end: '2026-01-03' }), /기록하기 전/);
});
