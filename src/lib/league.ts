export const LEAGUES = ['rookie', 'challenger', 'champion'] as const;
export type League = typeof LEAGUES[number];
export const LEAGUE_INFO: Record<League, { name: string; color: string; label: string }> = {
  rookie: { name: '루키', color: '#26976f', label: '도전의 시작' },
  challenger: { name: '챌린저', color: '#4285cf', label: '한 걸음 더 높이' },
  champion: { name: '챔피언', color: '#ba8523', label: '함께 만든 멋진 실력' },
};
export type Student = { id: string; name: string; number: number };
export type Phase = { id: string; start: string; end: string; limit: number };
export type Fixture = { id: string; a: string; b: string; league: League };
export type Standing = Student & { league: League; rp: number; wins: number; losses: number; promotionWins: number; played: number; remaining: number; streak: number; rank: number };
export type PlacementStanding = Student & { wins: number; losses: number; played: number; remaining: number; winRate: number; winScore: number; participationScore: number; score: number; rank: number };
export type Round = { id: string; index: number; members: Record<string, League>; league: Phase; promotion: Phase; fixtures: Fixture[]; closed: boolean; finalRows?: Standing[]; nextMembers?: Record<string, League> };
export type Season = { id: string; name: string; start: string; end: string; exchanges: [number, number]; rounds: Round[]; completed: boolean; nextMembers?: Record<string, League> };
export type Match = { id: string; requestId: string; a: string; b: string; winner: string; phaseId: string; roundId: string; seasonId: string; type: 'placement' | 'league' | 'promotion'; at: string; activity: { name: string; instructions: string }; voided: boolean; revisions: { at: string; winner: string; voided: boolean; reason: string }[] };
export const DEFAULT_BADGE_COLOR = '#5375aa';
export type BadgeTemplate = { id: string; name: string; description: string; color: string; at: string };
export type Badge = { id: string; studentId: string; name: string; description: string; color?: string; at: string; kind: 'praise' | 'promotion' | 'streak'; revoked?: boolean; source?: string; templateId?: string };
export type Classroom = { id: string; name: string; activity: { name: string; instructions: string }; students: Student[]; placementLimit: number; placement?: { start: string; end: string }; placed: boolean; initialMembers: Record<string, League>; seasons: Season[]; matches: Match[]; badges: Badge[]; badgeTemplates: BadgeTemplate[] };
export type Stage = { kind: 'placement' | 'league' | 'promotion' | 'waiting' | 'closing' | 'complete' | 'ready'; title: string; phase?: Phase; season?: Season; round?: Round; message: string };
export class RuleError extends Error { constructor(message: string) { super(message); this.name = 'RuleError'; } }
function fail(message: string): never { throw new RuleError(message); }
export const uid = () => crypto.randomUUID();
export const todaySeoul = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export function addDays(date: string, days: number) { const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
export const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function text(value: unknown, label: string, max = 80) { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(`${label}을(를) 1~${max}자로 입력해 주세요.`); return (value as string).trim(); }
function integer(value: unknown, min: number, max: number, label: string) { if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) fail(`${label}은(는) ${min}~${max} 사이의 정수여야 합니다.`); return Number(value); }
export function makeStudents(names: string[]) {
  if (!Array.isArray(names) || names.length < 6 || names.length > 100) fail('학생은 6~100명 등록해 주세요. 세 리그에 최소 2명씩 필요합니다.');
  return names.map((name, i) => ({ id: uid(), number: i + 1, name: text(name, '학생 이름', 30) }));
}
export function placementStandings(state: Pick<Classroom, 'students' | 'matches' | 'placementLimit'>): PlacementStanding[] {
  const matches = state.matches.filter(m => m.type === 'placement' && !m.voided);
  const rows = state.students.map(s => {
    const own = matches.filter(m => m.a === s.id || m.b === s.id), played = own.length, wins = own.filter(m => m.winner === s.id).length;
    return { ...s, wins, losses: played - wins, played, remaining: Math.max(0, state.placementLimit - played), winRate: played ? Math.round(wins / played * 100) : 0, winScore: wins, participationScore: played, score: played + wins, rank: 0 };
  }).sort((a, b) => b.score - a.score || a.number - b.number);
  rows.forEach((row, i) => { row.rank = i && row.score === rows[i - 1].score ? rows[i - 1].rank : i + 1; });
  return rows;
}
export function initialAssignment(students: Student[], matches: Match[] = [], placementLimit = Math.min(4, students.length - 1)): Record<string, League> {
  const sorted = placementStandings({ students, matches, placementLimit });
  const counts = [Math.floor(students.length / 3), Math.floor(students.length / 3), students.length - 2 * Math.floor(students.length / 3)];
  const result: Record<string, League> = {};
  sorted.forEach((s, i) => { result[s.id] = i < counts[2] ? 'champion' : i < counts[2] + counts[1] ? 'challenger' : 'rookie'; });
  return result;
}
export function newClass(name: string, names: string[]): Classroom {
  const students = makeStudents(names);
  return { id: uid(), name: text(name, '학급 이름', 50), activity: { name: '우리 반 대결', instructions: '활동 규칙에 따라 승자를 정하고, 두 사람이 함께 결과를 확인해 주세요.' }, students, placementLimit: Math.min(4, students.length - 1), placement: { start: todaySeoul(), end: addDays(todaySeoul(), 1) }, placed: false, initialMembers: initialAssignment(students), seasons: [], matches: [], badges: [], badgeTemplates: [] };
}
export function currentSeason(state: Classroom) { return state.seasons.at(-1); }
export function stage(state: Classroom, today = todaySeoul()): Stage {
  if (!state.placed) {
    if (state.placement && today < state.placement.start) return { kind: 'waiting', title: '배치전 준비', message: `${state.placement.start}에 최초 배치전이 시작됩니다.` };
    if (state.placement && today > state.placement.end) return { kind: 'closing', title: '배치전 마감 대기', message: '배치전이 끝났어요. 교사가 첫 리그를 정하고 있어요.' };
    return { kind: 'placement', title: '최초 배치전', phase: { id: 'placement', start: state.placement?.start || '', end: state.placement?.end || '', limit: state.placementLimit }, message: '다양한 친구와 대결하고, 교사가 첫 리그를 정해요.' };
  }
  const season = currentSeason(state);
  if (!season) return { kind: 'ready', title: '시즌 준비', message: '리그 배정이 끝났어요. 교사가 시즌을 시작하면 대결할 수 있어요.' };
  if (season.completed) return { kind: 'complete', season, round: season.rounds.at(-1), title: '시즌 완료', message: '이번 시즌 최종 순위와 다음 시즌 리그를 확인해요.' };
  const round = season.rounds.find(r => !r.closed)!;
  if (today < round.league.start) return { kind: 'waiting', season, round, title: '시작을 기다려요', message: `${round.league.start}에 ${round.index}차 리그전이 시작됩니다.` };
  if (today <= round.league.end) return { kind: 'league', season, round, phase: round.league, title: `${round.index}차 리그전`, message: '같은 리그의 친구와 대결해요. 승리하면 +10 RP!' };
  if (today < round.promotion.start) return { kind: 'waiting', season, round, title: '승급 기간 준비', message: `${round.promotion.start}에 승급 기간이 시작됩니다.` };
  if (today <= round.promotion.end) return { kind: 'promotion', season, round, phase: round.promotion, title: `${round.index}차 승급 기간`, message: '지정된 친구와 대결해요. 승리하면 +15 RP!' };
  return { kind: 'closing', season, round, title: '구간 마감 대기', message: '교사가 순위와 승강을 확정하고 있어요.' };
}
export function membersNow(state: Classroom): Record<string, League> {
  const season = currentSeason(state);
  return season ? (season.rounds.find(r => !r.closed) || season.rounds.at(-1)!).members : state.initialMembers;
}
export function activeMatches(state: Classroom, phaseId: string) { return state.matches.filter(m => !m.voided && m.phaseId === phaseId); }
export function compareScore(a: Standing, b: Standing) { return b.rp - a.rp || b.wins - a.wins || b.promotionWins - a.promotionWins; }
export function standings(state: Classroom, round?: Round, phaseId?: string): Standing[] {
  const members = round?.members || membersNow(state);
  const phase = stage(state);
  const counted = state.matches.filter(m => !m.voided && (round ? m.roundId === round.id : m.type === 'placement'));
  const activeId = phaseId || (round ? (phase.round?.id === round.id ? phase.phase?.id || (phase.kind === 'waiting' && todaySeoul() < round.league.start ? round.league.id : round.promotion.id) : round.promotion.id) : 'placement');
  const activeLimit = round ? (activeId === round.promotion.id ? round.promotion.limit : round.league.limit) : state.placementLimit;
  const rows: Standing[] = state.students.map(s => {
    const own = counted.filter(m => m.a === s.id || m.b === s.id);
    const won = own.filter(m => m.winner === s.id);
    let streak = 0;
    for (let i = own.length - 1; i >= 0 && own[i].winner === s.id; i--) streak++;
    const played = state.matches.filter(m => !m.voided && m.phaseId === activeId && (m.a === s.id || m.b === s.id)).length;
    return { ...s, league: members[s.id], rp: won.reduce((sum, m) => sum + (m.type === 'league' ? 10 : m.type === 'promotion' ? 15 : 0), 0), wins: won.length, losses: own.length - won.length, promotionWins: won.filter(m => m.type === 'promotion').length, played, remaining: Math.max(0, activeLimit - played), streak, rank: 0 };
  });
  const ranked: Standing[] = [];
  for (const league of LEAGUES) {
    const group = rows.filter(r => r.league === league).sort((a, b) => compareScore(a, b) || a.number - b.number);
    group.forEach((r, i) => { r.rank = i && compareScore(r, group[i - 1]) === 0 ? group[i - 1].rank : i + 1; ranked.push(r); });
  }
  return ranked;
}
export function badgesFor(state: Classroom, studentId: string): Badge[] {
  const badges = state.badges.filter(b => b.studentId === studentId && !b.revoked);
  for (const season of state.seasons) for (const round of season.rounds) {
    let streak = 0;
    for (const m of state.matches.filter(m => !m.voided && m.roundId === round.id && (m.a === studentId || m.b === studentId))) {
      streak = m.winner === studentId ? streak + 1 : 0;
      if (streak === 3) { badges.push({ id: `streak-${round.id}-${studentId}`, studentId, kind: 'streak', name: '3연승', description: `${season.name} · ${round.index}차 구간에서 3연승`, at: m.at }); break; }
    }
  }
  return badges.sort((a, b) => b.at.localeCompare(a.at));
}
export function scheduleDefaults(start: string, end: string, count: number, limit = 2) {
  const duration = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  if (duration < count * 3) fail('승급 기간마다 리그전 1일과 승급 기간 2일이 필요합니다. 시즌 기간을 늘려 주세요.');
  return Array.from({ length: count }, (_, i) => {
    const from = addDays(start, Math.floor(duration * i / count));
    const to = addDays(start, Math.floor(duration * (i + 1) / count) - 1);
    return { league: { start: from, end: addDays(to, -2), limit }, promotion: { start: addDays(to, -1), end: to, limit } };
  });
}
function pairKey(a: string, b: string) { return [a, b].sort().join(':'); }
export function validateFixtures(fixtures: Fixture[], students: string[], league: League, limit: number) {
  const counts = new Map(students.map(id => [id, 0])); const seen = new Set<string>();
  for (const f of fixtures.filter(f => f.league === league)) {
    if (f.a === f.b || !counts.has(f.a) || !counts.has(f.b)) fail('같은 리그의 서로 다른 학생을 배정해 주세요.');
    const key = pairKey(f.a, f.b); if (seen.has(key)) fail('같은 상대와 중복 대진을 만들 수 없습니다.'); seen.add(key);
    counts.set(f.a, counts.get(f.a)! + 1); counts.set(f.b, counts.get(f.b)! + 1);
  }
  if ([...counts.values()].some(n => n !== limit)) fail('모든 학생의 승급 기간 경기 수가 같아야 합니다.');
}
export function generateFixtures(members: Record<string, League>, limit: number): Fixture[] {
  const result: Fixture[] = [];
  for (const league of LEAGUES) {
    const ids = Object.keys(members).filter(id => members[id] === league);
    const n = ids.length;
    if (limit >= n || (n * limit) % 2) fail(`${LEAGUE_INFO[league].name} ${n}명에게 ${limit}경기씩 중복 없이 배정할 수 없습니다. 경기 수를 조정해 주세요.`);
    // A circulant graph gives every student exactly the same degree.
    for (let step = 1; step <= Math.floor(limit / 2); step++) for (let i = 0; i < n; i++) result.push({ id: uid(), league, a: ids[i], b: ids[(i + step) % n] });
    if (limit % 2) for (let i = 0; i < n / 2; i++) result.push({ id: uid(), league, a: ids[i], b: ids[i + n / 2] });
    validateFixtures(result, ids, league, limit);
  }
  return result;
}
type SeasonInput = { name: string; start: string; end: string; exchanges: [number, number]; rounds: { league: Omit<Phase, 'id'>; promotion: Omit<Phase, 'id'> }[] };
function validateMembers(state: Classroom, members: Record<string, League>) {
  if (!members || Object.keys(members).length !== state.students.length || state.students.some(s => !LEAGUES.includes(members[s.id]))) fail('모든 학생에게 리그를 배정해 주세요.');
  for (const league of LEAGUES) if (Object.values(members).filter(l => l === league).length < 2) fail('각 리그에 최소 2명을 배정해 주세요.');
}
export function createSeason(state: Classroom, input: SeasonInput) {
  if (!state.placed) fail('먼저 최초 리그 배정을 확정해 주세요.');
  const previous = currentSeason(state);
  if (previous && !previous.completed) fail('진행 중인 시즌을 먼저 마감해 주세요.');
  if (!validDate(input.start) || !validDate(input.end) || input.start > input.end) fail('시즌 시작일과 종료일을 확인해 주세요.');
  if (previous && input.start <= previous.end) fail('새 시즌은 이전 시즌 종료일 다음 날부터 설정해 주세요.');
  if (!Array.isArray(input.rounds) || input.rounds.length < 1 || input.rounds.length > 3) fail('승급 기간은 1~3번 설정해 주세요.');
  const members = { ...(previous?.nextMembers || state.initialMembers) };
  validateMembers(state, members);
  const counts = LEAGUES.map(l => Object.values(members).filter(v => v === l).length);
  if (!Array.isArray(input.exchanges) || input.exchanges.length !== 2) fail('리그 경계별 승강 인원을 입력해 주세요.');
  const e0 = integer(input.exchanges[0], 0, Math.min(counts[0], counts[1]), '루키↔챌린저 승강 인원');
  const e1 = integer(input.exchanges[1], 0, Math.min(counts[1], counts[2]), '챌린저↔챔피언 승강 인원');
  if (e0 + e1 > counts[1]) fail('챌린저에서 승급·강등 대상이 겹칩니다. 승강 인원을 줄여 주세요.');
  const rounds: Round[] = [];
  let last = addDays(input.start, -1);
  input.rounds.forEach((r, i) => {
    if (!r.league || !r.promotion) fail('각 리그전과 승급 기간의 설정을 입력해 주세요.');
    for (const p of [r.league, r.promotion]) {
      if (!validDate(p.start) || !validDate(p.end) || p.start > p.end || p.start <= last || p.start < input.start || p.end > input.end) fail('경기 기간이 겹치거나 시즌 밖에 있습니다. 날짜를 확인해 주세요.');
      last = p.end;
      integer(p.limit, 1, Math.min(...counts) - 1, '경기 수');
    }
    const round: Round = { id: uid(), index: i + 1, members: { ...members }, league: { ...r.league, id: uid() }, promotion: { ...r.promotion, id: uid() }, fixtures: generateFixtures(members, r.promotion.limit), closed: false };
    rounds.push(round);
  });
  if (rounds[0].league.start !== input.start || rounds.at(-1)!.promotion.end !== input.end) fail('첫 리그전 시작과 마지막 승급 기간 종료는 시즌 날짜와 같아야 합니다.');
  const season: Season = { id: uid(), name: text(input.name, '시즌 이름', 50), start: input.start, end: input.end, rounds, exchanges: [e0, e1], completed: false };
  if (previous?.nextMembers) awardPromotions(state, previous.rounds.at(-1)!.members, members, previous.id);
  state.seasons.push(season);
  return season;
}
export function recordMatch(state: Classroom, input: { a: string; b: string; winner: string; phaseId: string; requestId: string; confirmed: boolean[] }, today = todaySeoul()) {
  if (typeof input.requestId !== 'string' || !/^[\w-]{16,80}$/.test(input.requestId)) fail('경기 요청 정보가 올바르지 않습니다. 처음부터 다시 입력해 주세요.');
  const existing = state.matches.find(m => m.requestId === input.requestId);
  if (existing) {
    if (existing.a !== input.a || existing.b !== input.b || existing.winner !== input.winner) fail('이미 사용한 경기 요청입니다.');
    return existing;
  }
  const current = stage(state, today);
  if (!['placement', 'league', 'promotion'].includes(current.kind) || current.phase?.id !== input.phaseId) fail('경기 기간이 바뀌었거나 마감되었습니다. 화면을 새로 확인해 주세요.');
  if (!Array.isArray(input.confirmed) || input.confirmed.length !== 2 || input.confirmed.some(v => v !== true)) fail('두 사람이 함께 결과를 확인해 주세요.');
  if (input.a === input.b || !state.students.some(s => s.id === input.a) || !state.students.some(s => s.id === input.b) || ![input.a, input.b].includes(input.winner)) fail('두 학생과 승자를 다시 선택해 주세요.');
  const members = current.round?.members || state.initialMembers;
  if (current.kind !== 'placement' && members[input.a] !== members[input.b]) fail('같은 리그의 학생끼리 대결해 주세요.');
  const matches = activeMatches(state, current.phase!.id);
  if (matches.some(m => pairKey(m.a, m.b) === pairKey(input.a, input.b))) fail('이번 경기 단계에서 이미 대결한 상대입니다.');
  for (const id of [input.a, input.b]) if (matches.filter(m => m.a === id || m.b === id).length >= current.phase!.limit) fail('남은 경기 기회가 없는 학생이 있습니다.');
  if (current.kind === 'promotion' && !current.round!.fixtures.some(f => pairKey(f.a, f.b) === pairKey(input.a, input.b))) fail('승급 기간에는 지정된 상대와 대결해 주세요.');
  const match: Match = { id: uid(), requestId: input.requestId, a: input.a, b: input.b, winner: input.winner, phaseId: current.phase!.id, roundId: current.round?.id || '', seasonId: current.season?.id || '', type: current.kind as Match['type'], at: new Date().toISOString(), activity: { ...state.activity }, voided: false, revisions: [] };
  state.matches.push(match);
  return match;
}
export function updateSeason(state: Classroom, input: SeasonInput) {
  const season = currentSeason(state);
  if (!season || season.completed) fail('진행 중인 시즌이 없습니다.');
  const copy = structuredClone(state); copy.seasons.pop();
  const proposed = createSeason(copy, input);
  const hasMatches = state.matches.some(m => !m.voided && m.seasonId === season!.id);
  if ((hasMatches || season!.rounds.some(r => r.closed)) && season!.rounds.length !== proposed.rounds.length) fail('경기를 기록한 뒤에는 승급 기간 횟수를 바꿀 수 없습니다.');
  if (season!.rounds.some(r => r.closed) && season!.exchanges.some((v, i) => v !== input.exchanges[i])) fail('승강을 적용한 뒤에는 승강 인원을 바꿀 수 없습니다.');
  proposed.rounds.forEach((next, i) => {
    const old = season!.rounds[i]; if (!old) return;
    for (const key of ['league', 'promotion'] as const) {
      if ((old.closed || activeMatches(state, old[key].id).length) && (old[key].start !== next[key].start || old[key].end !== next[key].end || old[key].limit !== next[key].limit)) fail(`${i + 1}차 ${key === 'league' ? '리그전' : '승급 기간'}에 경기 기록이 있어 날짜와 경기 수를 바꿀 수 없습니다.`);
      next[key].id = old[key].id;
    }
    next.id = old.id; next.members = old.members; next.closed = old.closed; next.finalRows = old.finalRows; next.nextMembers = old.nextMembers;
    next.fixtures = old.promotion.limit === next.promotion.limit ? old.fixtures : generateFixtures(next.members, next.promotion.limit);
  });
  proposed.id = season!.id;
  state.seasons[state.seasons.length - 1] = proposed;
}
export function movementPreview(state: Classroom, round: Round, exchanges: [number, number], orders: Partial<Record<League, string[]>> = {}) {
  const rows = standings(state, round);
  const grouped = Object.fromEntries(LEAGUES.map(l => [l, rows.filter(r => r.league === l)])) as Record<League, Standing[]>;
  for (const l of LEAGUES) if (orders[l]) {
    const order = orders[l]!; const group = grouped[l];
    if (order.length !== group.length || new Set(order).size !== group.length || group.some(r => !order.includes(r.id))) fail('동점 순위에 모든 학생을 한 번씩 포함해 주세요.');
    const sorted = order.map(id => group.find(r => r.id === id)!);
    if (sorted.some((r, i) => i > 0 && compareScore(sorted[i - 1], r) > 0)) fail('점수가 다른 학생의 순서는 바꿀 수 없습니다.');
    grouped[l] = sorted;
  }
  const unresolved = new Set<League>();
  const boundary = (l: League, at: number) => { const group = grouped[l]; if (at > 0 && at < group.length && compareScore(group[at - 1], group[at]) === 0 && !orders[l]) unresolved.add(l); };
  boundary('rookie', exchanges[0]); boundary('challenger', grouped.challenger.length - exchanges[0]);
  boundary('challenger', exchanges[1]); boundary('champion', grouped.champion.length - exchanges[1]);
  const nextMembers = { ...round.members };
  for (let i = 0; i < exchanges[0]; i++) { nextMembers[grouped.rookie[i].id] = 'challenger'; nextMembers[grouped.challenger[grouped.challenger.length - 1 - i].id] = 'rookie'; }
  for (let i = 0; i < exchanges[1]; i++) { nextMembers[grouped.challenger[i].id] = 'champion'; nextMembers[grouped.champion[grouped.champion.length - 1 - i].id] = 'challenger'; }
  const finalRows = LEAGUES.flatMap(l => grouped[l].map((r, i) => ({ ...r, rank: orders[l] ? i + 1 : r.rank })));
  return { nextMembers, finalRows, unresolved: [...unresolved] };
}
function awardPromotions(state: Classroom, before: Record<string, League>, after: Record<string, League>, source: string) {
  for (const s of state.students) if (LEAGUES.indexOf(after[s.id]) > LEAGUES.indexOf(before[s.id]) && !state.badges.some(b => b.source === source && b.studentId === s.id)) state.badges.push({ id: uid(), source, studentId: s.id, kind: 'promotion', name: '승급 성공', description: `${LEAGUE_INFO[before[s.id]].name} → ${LEAGUE_INFO[after[s.id]].name}`, at: new Date().toISOString() });
}
export function closeRound(state: Classroom, orders: Partial<Record<League, string[]>>, today = todaySeoul()) {
  const season = currentSeason(state); const round = season?.rounds.find(r => !r.closed);
  if (!season || !round || today < round.promotion.start) fail('승급 기간이 시작된 뒤 마감할 수 있습니다.');
  const complete = activeMatches(state, round.promotion.id).length === round.fixtures.length;
  if (today <= round.promotion.end && !complete) fail('승급 기간이 끝나거나 지정 경기를 모두 마친 뒤 마감할 수 있습니다.');
  const preview = movementPreview(state, round, season.exchanges, orders);
  if (preview.unresolved.length) fail(`${preview.unresolved.map(l => LEAGUE_INFO[l].name).join(', ')}의 승강 경계 동점 순서를 확인해 주세요.`);
  round.closed = true; round.finalRows = preview.finalRows; round.nextMembers = preview.nextMembers;
  const next = season.rounds.find(r => !r.closed);
  if (next) { next.members = { ...preview.nextMembers }; next.fixtures = generateFixtures(next.members, next.promotion.limit); awardPromotions(state, round.members, next.members, round.id); }
  else { season.completed = true; season.nextMembers = preview.nextMembers; }
  return preview;
}
export function correctMatch(state: Classroom, input: { id: string; winner?: string; voided?: boolean; reason: string }) {
  const m = state.matches.find(m => m.id === input.id); if (!m) fail('경기를 찾을 수 없습니다.');
  if (m!.type === 'placement' ? state.placed : state.seasons.some(s => s.rounds.some(r => r.id === m!.roundId && r.closed))) fail('마감한 경기의 결과는 수정할 수 없습니다.');
  const reason = text(input.reason, '정정 이유', 150);
  if (input.winner !== undefined && ![m!.a, m!.b].includes(input.winner)) fail('참여한 학생 중 승자를 선택해 주세요.');
  if (m!.voided) fail('취소된 경기는 다시 수정할 수 없습니다. 새 경기로 기록해 주세요.');
  m!.revisions.push({ at: new Date().toISOString(), winner: m!.winner, voided: m!.voided, reason });
  m!.winner = input.winner || m!.winner;
  if (input.voided === true) m!.voided = true;
}
export function swapFixtures(state: Classroom, firstId: string, secondId: string) {
  const round = currentSeason(state)?.rounds.find(r => !r.closed); if (!round) fail('진행 중인 구간이 없습니다.');
  if (activeMatches(state, round!.promotion.id).length) fail('승급 기간 경기가 기록되기 전까지만 대진을 변경할 수 있습니다.');
  const first = round!.fixtures.find(f => f.id === firstId), second = round!.fixtures.find(f => f.id === secondId);
  if (!first || !second || first.id === second.id || first.league !== second.league) fail('같은 리그에서 서로 다른 두 대진을 선택해 주세요.');
  const trial = round!.fixtures.map(f => ({ ...f }));
  const a = trial.find(f => f.id === first!.id)!, b = trial.find(f => f.id === second!.id)!;
  [a.b, b.b] = [b.b, a.b];
  validateFixtures(trial, Object.keys(round!.members).filter(id => round!.members[id] === a.league), a.league, round!.promotion.limit);
  round!.fixtures = trial;
}
export function adminAction(state: Classroom, action: string, payload: Record<string, unknown>) {
  switch (action) {
    case 'activity': state.activity = { name: text(payload.name, '활동 이름', 50), instructions: text(payload.instructions, '활동 안내', 500) }; break;
    case 'students': {
      if (state.placed || state.matches.some(m => !m.voided)) fail('경기 시작 전까지만 명단을 바꿀 수 있습니다.');
      state.students = makeStudents(payload.names as string[]); state.initialMembers = initialAssignment(state.students); break;
    }
    case 'placementLimit': {
      const limit = integer(payload.limit, 1, state.students.length - 1, '배치전 경기 수');
      if (state.placed || state.students.some(s => activeMatches(state, 'placement').filter(m => m.a === s.id || m.b === s.id).length > limit)) fail('기록된 경기 수보다 줄이거나 배치 완료 후 변경할 수 없습니다.');
      state.placementLimit = limit; break;
    }
    case 'placementDates': {
      if (state.placed || activeMatches(state, 'placement').length) fail('배치전 경기를 기록하기 전까지만 날짜를 변경할 수 있습니다.');
      if (!validDate(payload.start) || !validDate(payload.end) || payload.start > payload.end) fail('배치전 시작일과 종료일을 확인해 주세요.');
      state.placement = { start: payload.start, end: payload.end }; break;
    }
    case 'place': {
      if (state.placed) fail('최초 배치는 이미 완료했습니다.');
      validateMembers(state, payload.members as Record<string, League>);
      state.initialMembers = { ...(payload.members as Record<string, League>) }; state.placed = true; break;
    }
    case 'season': createSeason(state, payload as unknown as SeasonInput); break;
    case 'updateSeason': updateSeason(state, payload as unknown as SeasonInput); break;
    case 'close': closeRound(state, (payload.orders || {}) as Partial<Record<League, string[]>>); break;
    case 'correct': correctMatch(state, payload as Parameters<typeof correctMatch>[1]); break;
    case 'swapFixtures': swapFixtures(state, String(payload.firstId), String(payload.secondId)); break;
    case 'createBadgeTemplate': {
      const name = text(payload.name, '훈장 이름', 30), description = text(payload.description, '훈장 설명', 150);
      const color = payload.color === undefined ? DEFAULT_BADGE_COLOR : payload.color;
      if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) fail('훈장 색상을 선택해 주세요.');
      if (state.badgeTemplates.some(t => t.name === name)) fail('같은 이름의 훈장이 있습니다. 저장된 훈장을 사용해 주세요.');
      state.badgeTemplates.push({ id: uid(), name, description, color: color.toLowerCase(), at: new Date().toISOString() }); break;
    }
    case 'praise': {
      if (!state.students.some(s => s.id === payload.studentId)) fail('학생을 선택해 주세요.');
      const template = state.badgeTemplates.find(t => t.id === payload.templateId);
      if (!template) fail('미리 만든 훈장을 선택해 주세요.');
      if (state.badges.some(b => b.studentId === payload.studentId && b.templateId === template.id && !b.revoked)) fail('이 학생에게 이미 수여한 훈장입니다.');
      state.badges.push({ id: uid(), kind: 'praise', studentId: String(payload.studentId), templateId: template.id, name: template.name, description: template.description, color: template.color, at: new Date().toISOString() }); break;
    }
    case 'revoke': { const badge = state.badges.find(b => b.id === payload.id && b.kind === 'praise'); if (!badge) fail('칭찬 배지를 찾을 수 없습니다.'); badge!.revoked = true; break; }
    default: fail('지원하지 않는 관리 작업입니다.');
  }
}
