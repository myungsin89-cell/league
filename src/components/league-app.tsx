'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Classroom, LEAGUES, LEAGUE_INFO, League, Student, Standing, stage, currentSeason, membersNow, standings, badgesFor, activeMatches } from '@/lib/league';
import Icon from './icon';
import { Empty, LeagueChip, Modal, dateLabel, timeLabel, demoNames, newRequestId } from './ui';
import Admin from './teacher';
import { Medal, MedalArt, MedalExamples } from './medal';
import StudentNotice from './student-notice';

export type AppData = { state: Classroom | null; admin: boolean; adminExpires?: number; today?: string; classes?: { id: string; name: string }[] };
export type Mutate = (action: string, payload: Record<string, unknown>) => Promise<boolean>;
type View = 'home' | 'record' | 'students' | 'ranking' | 'history' | 'admin';
const nav = [{ id: 'home', label: '우리 반 홈', icon: 'home' }, { id: 'record', label: '경기 기록', icon: 'swords' }, { id: 'students', label: '학생 카드', icon: 'card' }, { id: 'ranking', label: '리그 순위', icon: 'chart' }, { id: 'history', label: '우리 반 기록', icon: 'history' }] as const;
async function api(path: string, body?: object) {
  const res = await fetch(`/api/${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || '연결을 확인해 주세요.');
  return result;
}

export default function LeagueApp() {
  const [data, setData] = useState<AppData | null>(null), [view, setView] = useState<View>('home');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null), [busy, setBusy] = useState(false);
  const [unlock, setUnlock] = useState(false), [password, setPassword] = useState('');
  const [league, setLeague] = useState<League>('rookie'), [student, setStudent] = useState<Student | null>(null);
  const activityAt = useRef(Date.now());
  const notify = useCallback((message: string, error = false) => setToast({ message, error }), []);
  const refresh = useCallback(async () => { try { setData(await api('state')); setLoadError(null); } catch (e) { setLoadError((e as Error).message); notify((e as Error).message, true); } }, [notify]);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 15000); const focus = () => refresh(); window.addEventListener('focus', focus); return () => { clearInterval(timer); window.removeEventListener('focus', focus); }; }, [refresh]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(null), 6000); return () => clearTimeout(timer); } }, [toast]);
  const lock = useCallback(async () => { try { await api('auth', { action: 'lock' }); await refresh(); setView('home'); } catch (e) { notify((e as Error).message, true); } }, [refresh, notify]);
  useEffect(() => {
    if (!data?.admin) return;
    activityAt.current = Date.now();
    const active = () => { activityAt.current = Date.now(); };
    const timer = setInterval(() => { if (Date.now() - activityAt.current > 5 * 60000 || Date.now() > (data.adminExpires || 0)) lock(); }, 10000);
    document.addEventListener('pointerdown', active); document.addEventListener('keydown', active);
    return () => { clearInterval(timer); document.removeEventListener('pointerdown', active); document.removeEventListener('keydown', active); };
  }, [data?.admin, data?.adminExpires, lock]);
  useEffect(() => { if (view === 'admin' && data && !data.admin) setView('home'); }, [data, view]);
  const mutate: Mutate = async (action, payload) => {
    if (busy) return false;
    setBusy(true);
    try { const result = await api('action', { action, payload }); setData(result); return true; }
    catch (e) { notify((e as Error).message, true); await refresh(); return false; }
    finally { setBusy(false); }
  };
  async function authenticate(action: string, values: Record<string, unknown>) {
    setBusy(true);
    try { await api('auth', { action, ...values }); await refresh(); if (action === 'unlock' || action === 'create') setView('admin'); setUnlock(false); setPassword(''); return true; }
    catch (e) { notify((e as Error).message, true); return false; }
    finally { setBusy(false); }
  }
  const closeUnlock = useCallback(() => { setUnlock(false); setPassword(''); }, []);
  const closeStudent = useCallback(() => setStudent(null), []);
  if (!data) return <div className="loading"><div className="brand-mark"><Icon name="trophy" size={30} /></div><h2>교실 리그</h2>{loadError ? <><p role="alert">학급 정보를 불러오지 못했어요.<br />{loadError}</p><button className="btn primary" onClick={refresh}>다시 연결하기</button></> : <p>우리 반을 준비하고 있어요.</p>}</div>;
  const toastElement = toast && <div role={toast.error ? 'alert' : 'status'} className={`toast ${toast.error ? 'error' : ''}`}><Icon name={toast.error ? 'close' : 'check'} size={20} />{toast.message}<button className="icon-btn" aria-label="알림 닫기" onClick={() => setToast(null)}><Icon name="close" size={16} /></button></div>;
  if (!data.state) return <><Setup classes={data.classes || []} busy={busy} submit={authenticate} />{toastElement}</>;
  const state = data.state, current = stage(state, data.today), season = currentSeason(state);
  const rows = current.round?.closed ? current.round.finalRows! : standings(state, current.round), members = membersNow(state);
  const navigate = (v: View, l?: League) => { if (l) setLeague(l); setView(v); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const teacherOpen = () => { if (data.admin) navigate('admin'); else setUnlock(true); };
  return <div className="app-shell">
    <aside className="sidebar"><button className="brand" onClick={() => navigate('home')}><span className="brand-mark"><Icon name="trophy" size={25} /></span><span>교실 리그<small>CLASS LEAGUE</small></span></button>
      <div className="class-label"><span className="status-dot" />{state.name}<small>공용 태블릿</small></div>
      <div className="nav-label">우리 반 함께 보기</div><nav aria-label="주 메뉴">{nav.map(n => <button key={n.id} className={`nav-item ${view === n.id ? 'active' : ''}`} aria-current={view === n.id ? 'page' : undefined} onClick={() => navigate(n.id)}><Icon name={n.icon} />{n.label}{n.id === 'record' && <span className="nav-bubble">+</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="encourage"><Icon name="leaf" /><p>점수보다 더 멋진 건<br /><strong>함께 도전하는 마음!</strong></p></div><button className={`nav-item ${view === 'admin' ? 'active' : ''}`} onClick={teacherOpen}><Icon name={data.admin ? 'unlock' : 'lock'} />교사 관리<Icon name="arrow" size={16} /></button><small className="version">우리 반의 작은 성장 기록 · V1</small></div>
    </aside>
      <div className="app-main"><header className="topbar"><div><span className="eyebrow">함께 도전하는 우리 반</span><h1>{view === 'admin' ? '교사 관리' : nav.find(n => n.id === view)?.label}</h1></div><div className="topbar-right"><span className="today"><Icon name="calendar" size={17} />{data.today?.replaceAll('-', '.')}</span><button className="mode-pill" onClick={data.admin ? lock : teacherOpen}><Icon name={data.admin ? 'unlock' : 'lock'} size={17} />{data.admin ? '공용 모드로 전환' : '교사 관리'}</button></div></header>
      <main className="page-content">
        {view === 'home' && <><StudentNotice state={state} /><Home state={state} current={current} rows={rows} navigate={navigate} openStudent={setStudent} /></>}
        {view === 'record' && <Recorder state={state} today={data.today!} busy={busy} mutate={mutate} home={() => navigate('home')} />}
        {view === 'students' && <Students state={state} rows={rows} members={members} open={setStudent} />}
        {view === 'ranking' && <Ranking state={state} rows={rows} league={league} setLeague={setLeague} open={setStudent} />}
        {view === 'history' && <History state={state} />}
        {view === 'admin' && data.admin && <Admin state={state} today={data.today!} busy={busy} mutate={mutate} notify={notify} publicMode={lock} disconnect={async () => { await api('auth', { action: 'disconnect' }); await refresh(); navigate('home'); }} />}
      </main><footer className="page-footer"><span>교실 리그</span><p>경쟁은 즐겁게, 성장은 함께.</p><span>{season?.name || '우리 반의 첫 시작'}</span></footer>
    </div>
    {unlock && <Modal title="교사 관리 열기" onClose={closeUnlock}><div className="unlock-icon"><Icon name="lock" size={30} /></div><p className="modal-description">학급 설정과 결과 정정은 교사 비밀번호로 보호됩니다.</p><form onSubmit={e => { e.preventDefault(); authenticate('unlock', { password }); }}><label className="field">교사 비밀번호<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" maxLength={128} /></label><button className="btn primary full" disabled={busy}>{busy ? '확인 중…' : '관리 화면 열기'}<Icon name="arrow" size={18} /></button></form></Modal>}
    {student && <Modal title="학생 카드" onClose={closeStudent} wide><StudentDetail state={state} student={student} row={rows.find(r => r.id === student.id)!} /></Modal>}
    {toastElement}
  </div>;
}

function Setup({ classes, busy, submit }: { classes: { id: string; name: string }[]; busy: boolean; submit: (action: string, values: Record<string, unknown>) => Promise<boolean> }) {
  const [connect, setConnect] = useState(classes.length > 0), [name, setName] = useState(''), [names, setNames] = useState('');
  const [password, setPassword] = useState(''), [repeat, setRepeat] = useState(''), [classId, setClassId] = useState(classes[0]?.id || ''), [localError, setError] = useState('');
  const count = names.split(/\n/).filter(n => n.trim()).length;
  function onSubmit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!connect && password !== repeat) { setError('두 비밀번호가 다릅니다.'); return; }
    submit(connect ? 'connect' : 'create', connect ? { classId, password } : { name, password, names: names.split(/\n/).map(n => n.trim()).filter(Boolean) });
  }
  return <div className="setup-page"><div className="setup-story"><div className="brand"><span className="brand-mark"><Icon name="trophy" size={28} /></span><span>교실 리그<small>CLASS LEAGUE</small></span></div><div className="setup-copy"><span className="pill light">우리 반을 위한 작은 리그</span><h1>도전은 즐겁게.<br />성장은 <em>함께.</em></h1><p>한 번의 대결, 한 번의 칭찬.<br />아이들의 작은 성장을 기록하세요.</p><div className="setup-crests">{LEAGUES.map((l, i) => <div className={`setup-crest ${l}`} key={l}><Icon name={i === 0 ? 'leaf' : i === 1 ? 'shield' : 'trophy'} size={45} /><strong>{LEAGUE_INFO[l].name}</strong></div>)}</div><div className="setup-features"><span><Icon name="check" size={18} />학생 로그인 없이</span><span><Icon name="check" size={18} />공용 태블릿으로 간단하게</span></div></div><small className="setup-bottom">경쟁은 즐겁게, 성장은 함께.</small></div>
    <div className="setup-form-side"><div className="setup-form"><div className="eyebrow">선생님, 환영합니다</div><h2>{connect ? '우리 반 태블릿 연결' : '우리 반 리그 만들기'}</h2><p className="muted">{connect ? '처음 한 번만 연결하면 학생들은 바로 사용할 수 있어요.' : '명단과 교사 비밀번호만 있으면 시작할 수 있어요.'}</p>{classes.length > 0 && <div className="segmented"><button className={!connect ? 'active' : ''} onClick={() => { setConnect(false); setPassword(''); }}>새 학급 만들기</button><button className={connect ? 'active' : ''} onClick={() => { setConnect(true); setPassword(''); setClassId(classes[0].id); }}>기존 학급 연결</button></div>}<form onSubmit={onSubmit}>
      {connect ? <label className="field">학급<select value={classId} onChange={e => setClassId(e.target.value)} required>{classes.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label> : <><label className="field">학급 이름<input placeholder="예: 5학년 2반" value={name} onChange={e => setName(e.target.value)} required maxLength={50} /></label><label className="field">학생 명단<span className="field-hint">한 줄에 한 명 · {count}명</span><textarea value={names} onChange={e => setNames(e.target.value)} placeholder={'김하늘\n이바다\n박나무'} rows={5} required /><span className="inline-hint">세 리그에 최소 2명씩, 총 6~100명을 등록해 주세요.</span></label><button type="button" className="text-btn demo-fill" onClick={() => setNames(demoNames)}>먼저 둘러보기: 예시 학생 30명 넣기<Icon name="arrow" size={15} /></button></>}
      <label className="field">교사 비밀번호<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={4} maxLength={128} autoComplete={connect ? 'current-password' : 'new-password'} placeholder="4자 이상" /></label>{!connect && <label className="field">비밀번호 확인<input type="password" value={repeat} onChange={e => setRepeat(e.target.value)} required minLength={4} maxLength={128} autoComplete="new-password" /></label>}{localError && <p className="error-text" role="alert">{localError}</p>}<button className="btn primary full" disabled={busy}>{busy ? '준비 중…' : connect ? '공용 태블릿으로 시작' : '우리 반 리그 만들기'}<Icon name="arrow" size={20} /></button><p className="setup-note"><Icon name="lock" size={15} />학생들은 비밀번호를 입력하지 않아요.</p></form></div></div></div>;
}

function Home({ state, current, rows, navigate, openStudent }: { state: Classroom; current: ReturnType<typeof stage>; rows: Standing[]; navigate: (v: View, l?: League) => void; openStudent: (s: Student) => void }) {
  const canPlay = ['placement', 'league', 'promotion'].includes(current.kind);
  const matches = state.matches.filter(m => !m.voided && (current.round ? m.roundId === current.round.id : m.type === 'placement'));
  const participants = new Set(matches.flatMap(m => [m.a, m.b])).size;
  return <><section className="hero"><div className="hero-copy"><span className="pill light"><span className="status-dot" />{current.title}</span><h2>작은 도전이 쌓여,<br /><em>우리 반의 리그가 됩니다.</em></h2><p>{current.message}</p><div className="hero-actions"><button className="btn white" onClick={() => navigate('record')} disabled={!canPlay}><Icon name="swords" size={21} />대결 결과 기록<Icon name="arrow" size={18} /></button><button className="hero-link" onClick={() => navigate('students')}>학생 카드 보기<Icon name="arrow" size={17} /></button></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="art-star star-one">✦</span><span className="art-star star-two">✧</span><div className="art-crest crest-back"><Icon name="shield" size={55} /></div><div className="art-crest crest-front"><Icon name="trophy" size={76} /><span>CLASS LEAGUE</span><strong>함께 도전!</strong></div><span className="art-dots">•••</span></div></section>
    <section className="stats-grid"><div className="stat"><span className="stat-icon mint"><Icon name="users" /></span><div><small>우리 반 학생</small><strong>{state.students.length}<span>명</span></strong></div></div><div className="stat"><span className="stat-icon blue"><Icon name="swords" /></span><div><small>이번 구간 경기</small><strong>{matches.length}<span>경기</span></strong></div></div><div className="stat"><span className="stat-icon amber"><Icon name="bolt" /></span><div><small>이번 구간 참여</small><strong>{participants}<span>명</span></strong></div></div><div className="stat"><span className="stat-icon lavender"><Icon name="medal" /></span><div><small>칭찬과 성장 배지</small><strong>{state.students.reduce((sum, s) => sum + badgesFor(state, s.id).length, 0)}<span>개</span></strong></div></div></section>
    <section className="section"><div className="section-head"><div><span className="eyebrow">THREE LEAGUES, ONE CLASS</span><h2>우리 반의 세 가지 리그</h2></div><button className="text-btn" onClick={() => navigate('ranking')}>전체 순위<Icon name="arrow" size={16} /></button></div><div className="league-grid">{LEAGUES.map((l, i) => { const group = rows.filter(r => r.league === l); return <article className={`league-panel ${l}`} key={l}><div className="league-panel-head"><span className="league-emblem"><Icon name={i === 0 ? 'leaf' : i === 1 ? 'shield' : 'trophy'} size={27} /></span><span className="league-panel-count">{state.placed ? `${group.length}명` : '배정 전'}</span></div><h3>{LEAGUE_INFO[l].name}<small>{LEAGUE_INFO[l].label}</small></h3><div className="mini-leaders">{state.placed ? group.slice(0, 3).map(s => <button key={s.id} onClick={() => openStudent(s)}><span className="mini-rank">{s.rank}</span><span>{s.name}</span><strong>{s.rp}<small> RP</small></strong></button>) : <p>배치전 기록을 참고해<br />선생님이 첫 리그를 정해요.</p>}</div><button className="league-panel-link" onClick={() => navigate('ranking', l)}>{state.placed ? '리그 순위 보기' : '배치전 기록 보기'}<Icon name="arrow" size={17} /></button></article>; })}</div></section>
    <div className="home-bottom-grid"><section className="panel"><div className="section-head"><h2>지금 우리 반은</h2><span className="pill subtle">{current.title}</span></div><div className="season-progress">{['배치전', '리그전', '승급 기간', '시즌 완료'].map((label, i) => { const active = current.kind === 'placement' ? 0 : current.kind === 'complete' ? 3 : ['promotion', 'closing'].includes(current.kind) ? 2 : 1; return <div className={`${i === active ? 'current' : ''} ${i < active ? 'done' : ''}`} key={label}><span>{i < active ? <Icon name="check" size={15} /> : i + 1}</span><strong>{label}</strong></div>; })}</div><div className="activity-callout"><Icon name="swords" size={25} /><div><strong>{state.activity.name}</strong><p>{state.activity.instructions}</p></div></div>{current.round && <p className="date-line"><Icon name="calendar" size={16} />리그전 {dateLabel(current.round.league.start)}–{dateLabel(current.round.league.end)}<span />승급 기간 {dateLabel(current.round.promotion.start)}–{dateLabel(current.round.promotion.end)}</p>}<p className="gentle-note">배지는 점수와 별개예요. 친구의 도전도 함께 응원해요.</p></section>
    <section className="panel"><div className="section-head"><h2>방금 다녀간 대결</h2><span className="muted">최근 4경기</span></div>{matches.length ? <div className="recent-list">{matches.slice(-4).reverse().map(m => { const winner = state.students.find(s => s.id === m.winner)!; const other = state.students.find(s => s.id === (m.a === m.winner ? m.b : m.a))!; return <div className="recent-item" key={m.id}><div><strong>{winner.name}<span> vs </span>{other.name}</strong><small>{timeLabel(m.at)}</small></div><span className="result-label">{m.type === 'placement' ? '배치 승리' : `+${m.type === 'promotion' ? 15 : 10} RP`}</span></div>; })}</div> : <Empty icon="swords" title="첫 대결을 기다리고 있어요">대결 후 두 사람이 함께 결과를 기록해 주세요.</Empty>}</section></div></>;
}

function Recorder({ state, today, busy, mutate, home }: { state: Classroom; today: string; busy: boolean; mutate: Mutate; home: () => void }) {
  const current = stage(state, today), [step, setStep] = useState(1), [a, setA] = useState(''), [b, setB] = useState(''), [winner, setWinner] = useState('');
  const [confirm, setConfirm] = useState([false, false]), [saved, setSaved] = useState(false), [search, setSearch] = useState('');
  const requestId = useRef(''), lastActive = useRef(Date.now());
  const reset = useCallback(() => { setStep(1); setA(''); setB(''); setWinner(''); setConfirm([false, false]); setSaved(false); setSearch(''); requestId.current = newRequestId(); lastActive.current = Date.now(); }, []);
  useEffect(() => { reset(); }, [current.phase?.id, reset]);
  useEffect(() => { const active = () => { lastActive.current = Date.now(); }; const timer = setInterval(() => { if (Date.now() - lastActive.current > 120000) reset(); }, 10000); document.addEventListener('pointerdown', active); document.addEventListener('keydown', active); return () => { clearInterval(timer); document.removeEventListener('pointerdown', active); document.removeEventListener('keydown', active); }; }, [reset]);
  useEffect(() => { if (saved) { const timer = setTimeout(home, 5000); return () => clearTimeout(timer); } }, [saved, home]);
  if (!current.phase) return <div className="panel"><Empty icon="calendar" title={current.title}>{current.message}</Empty><button className="btn secondary centered" onClick={home}>홈으로 돌아가기</button></div>;
  const phaseMatches = activeMatches(state, current.phase.id), members = current.round?.members || state.initialMembers;
  const remaining = (id: string) => current.phase!.limit - phaseMatches.filter(m => m.a === id || m.b === id).length;
  const points = current.kind === 'placement' ? 0 : current.kind === 'promotion' ? 15 : 10;
  const first = state.students.find(s => s.id === a), second = state.students.find(s => s.id === b), winnerStudent = state.students.find(s => s.id === winner);
  function unavailable(s: Student) {
    if (remaining(s.id) <= 0) return '경기 완료';
    if (a && s.id === a) return '선택한 학생';
    if (a && current.kind !== 'placement' && members[s.id] !== members[a]) return '다른 리그';
    if (a && phaseMatches.some(m => [m.a, m.b].includes(a) && [m.a, m.b].includes(s.id))) return '이미 대결';
    if (a && current.kind === 'promotion' && !current.round!.fixtures.some(f => [f.a, f.b].includes(a) && [f.a, f.b].includes(s.id))) return '지정 상대 아님';
    return '';
  }
  if (saved) return <section className="saved-screen panel"><div className="saved-check"><Icon name="check" size={45} /></div><span className="eyebrow">GREAT GAME!</span><h2>두 사람 모두, 멋진 도전이었어요!</h2><p><strong>{winnerStudent?.name}</strong>{points ? ` +${points} RP` : ' 배치전 승리 1회'} · 경기 결과를 저장했어요.</p><div className="saved-students">{[first!, second!].map(s => <div key={s.id}><strong>{s.name}</strong><span>남은 경기 {remaining(s.id)}/{current.phase!.limit}</span></div>)}</div><button className="btn primary" onClick={home}>홈으로 돌아가기<Icon name="arrow" size={18} /></button><small>잠시 후 다음 친구를 위해 홈으로 돌아갑니다.</small></section>;
  return <><div className="record-top"><div><span className="eyebrow">대결이 끝났나요?</span><h2>두 사람이 함께 기록해요</h2><p>{current.title} · {points ? `승리 +${points} RP` : '배치전 승리 기록'}</p></div><button className="btn secondary" onClick={reset} disabled={busy}>처음부터</button></div><div className="record-steps">{['두 학생 선택', '승자 선택', '함께 확인'].map((label, i) => <div className={step === i + 1 ? 'current' : step > i + 1 ? 'done' : ''} key={label}><span>{step > i + 1 ? <Icon name="check" size={17} /> : i + 1}</span>{label}</div>)}</div>
    <section className="record-panel panel">
      {step === 1 && <><div className="record-panel-heading"><span className="step-tag">STEP 01</span><h3>{a ? '함께 대결한 친구는 누구인가요?' : '첫 번째 학생을 선택해 주세요'}</h3><p>{a && current.kind === 'promotion' ? '이번 승급 기간에 배정된 상대만 선택할 수 있어요.' : '이름 아래 남은 경기 횟수를 확인해 주세요.'}</p></div>{first && <div className="selected-player"><strong>{first.name}</strong><span>첫 번째 학생</span><button className="text-btn" onClick={() => { setA(''); setSearch(''); }}>다시 선택</button></div>}<label className="search-box"><Icon name="search" size={20} /><input aria-label="학생 이름 검색" placeholder="이름 또는 번호 검색" value={search} onChange={e => setSearch(e.target.value)} /></label><div className="player-grid">{state.students.filter(s => !search || s.name.includes(search) || String(s.number).includes(search)).map(s => { const reason = unavailable(s); return <button className={`player-btn ${a === s.id ? 'chosen' : ''}`} disabled={!!reason} key={s.id} onClick={() => { if (!a) { setA(s.id); setSearch(''); } else { setB(s.id); setStep(2); } }}><strong>{s.name}</strong><span>{s.number}번 · {reason || `남은 경기 ${remaining(s.id)}/${current.phase!.limit}`}</span>{state.placed && <LeagueChip league={members[s.id]} />}</button>; })}</div></>}
      {step === 2 && <><div className="record-panel-heading"><span className="step-tag">STEP 02</span><h3>이번 대결의 승자는 누구인가요?</h3><p>무승부라면 결과를 저장하지 말고 활동 규칙에 따라 재대결하거나 선생님께 확인해 주세요.</p></div><div className="winner-grid">{[first!, second!].map(s => <button className={`winner-btn ${winner === s.id ? 'selected' : ''}`} key={s.id} onClick={() => { setWinner(s.id); setConfirm([false, false]); }}><strong>{s.name}</strong><span>{winner === s.id ? <><Icon name="trophy" size={20} />승자로 선택했어요</> : '승자로 선택'}</span></button>)}</div><div className="record-actions"><button className="btn secondary" onClick={() => { setB(''); setStep(1); }}><Icon name="back" size={17} />학생 다시 선택</button><button className="btn primary" disabled={!winner} onClick={() => setStep(3)}>결과 확인하기<Icon name="arrow" size={18} /></button></div></>}
      {step === 3 && <><div className="record-panel-heading"><span className="step-tag">STEP 03</span><h3>두 사람 모두 확인해 주세요</h3><p>아래 결과가 맞으면 각자 자기 이름의 확인 버튼을 눌러 주세요.</p></div><div className="result-summary"><Icon name="trophy" size={31} /><div><span>{first!.name} vs {second!.name}</span><strong>{winnerStudent!.name} 승리</strong></div><span className="result-points">{points ? `+${points} RP` : '승리 1회'}</span></div><p className="confirm-note">두 사람 모두 경기 기회가 1회씩 줄어들어요.</p><div className="confirm-grid">{[first!, second!].map((s, i) => <button className={`confirm-btn ${confirm[i] ? 'confirmed' : ''}`} key={s.id} aria-pressed={confirm[i]} onClick={() => setConfirm(old => old.map((v, ix) => ix === i ? !v : v))}><span className="confirm-circle"><Icon name="check" size={23} /></span><strong>{s.name}</strong><span>{confirm[i] ? '확인했어요!' : '결과가 맞아요'}</span></button>)}</div><div className="record-actions"><button className="btn secondary" onClick={() => { setStep(2); setConfirm([false, false]); }} disabled={busy}>승자 다시 선택</button><button className="btn primary" disabled={busy || !confirm.every(Boolean)} onClick={async () => { if (await mutate('match', { a, b, winner, phaseId: current.phase!.id, confirmed: confirm, requestId: requestId.current })) setSaved(true); }}>{busy ? '저장 중…' : '경기 결과 저장'}<Icon name="check" size={19} /></button></div></>}
    </section></>;
}

function StudentCard({ state, row, onClick }: { state: Classroom; row: Standing; onClick?: () => void }) {
  const badges = badgesFor(state, row.id);
  return (
    <button className={`student-card ${row.league}`} onClick={onClick}>
      <div className="student-card-top"><LeagueChip league={row.league} /><span>{state.placed ? `${row.rank}위` : '배치 중'}</span></div>
      <div className="student-card-person"><h3>{row.name}</h3><small>{row.number}번 · {state.name}</small></div>
      <div className="student-card-stats"><div><strong>{row.rp}</strong><small>구간 RP</small></div><div><strong>{row.wins}<span>승</span></strong><small>{row.losses}패</small></div><div><strong>{row.remaining}</strong><small>남은 경기</small></div></div>
      <div className="student-honors">
        <div className="student-honors-heading"><span>받은 훈장</span><small>{badges.length}개</small></div>
        {badges.length ? <><div className="honor-strip">{badges.slice(0, 3).map(b => <Medal key={b.id} badge={b} />)}</div><span className="honor-caption">{badges.length > 3 ? `전체 ${badges.length}개 · 카드를 눌러 모두 보기` : '카드를 눌러 받은 이유 보기'}</span></> : <div className="honors-empty"><MedalArt kind="praise" muted /><span>작은 도전과 배려가<br />새로운 훈장이 돼요.</span></div>}
      </div>
    </button>
  );
}
function Students({ state, rows, members, open }: { state: Classroom; rows: Standing[]; members: Record<string, League>; open: (s: Student) => void }) {
  const [filter, setFilter] = useState('all'), [search, setSearch] = useState(''), [showExamples, setShowExamples] = useState(false);
  const visible = [...rows].sort((a, b) => a.number - b.number).filter(s => (filter === 'all' || members[s.id] === filter) && (!search || s.name.includes(search) || String(s.number).includes(search)));
  return <>
    <div className="section-head">
      <div><span className="eyebrow">서로 다른 도전, 함께하는 성장</span><h2>우리 반 학생 카드</h2><p className="muted">카드를 누르면 훈장과 받은 이유, 지난 기록을 볼 수 있어요.</p></div>
      <div className="student-section-actions"><span className="pill subtle">전체 {state.students.length}명</span><button className="btn secondary small" onClick={() => setShowExamples(true)}><Icon name="medal" size={18} />훈장 예시</button></div>
    </div>
    <div className="filter-row"><div className="tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체</button>{LEAGUES.map(l => <button key={l} className={filter === l ? 'active' : ''} onClick={() => setFilter(l)}>{LEAGUE_INFO[l].name}</button>)}</div><label className="search-box compact"><Icon name="search" size={18} /><input placeholder="이름 검색" aria-label="카드 학생 검색" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
    {!state.placed && <div className="notice">배치전 중에는 카드의 리그가 배정 참고용으로 표시됩니다. 첫 리그는 교사가 확정합니다.</div>}
    <div className="student-grid">{visible.map(r => <StudentCard key={r.id} state={state} row={r} onClick={() => open(r)} />)}</div>
    {!visible.length && <Empty icon="search" title="검색 결과가 없어요">다른 이름이나 리그를 선택해 주세요.</Empty>}
    {showExamples && <Modal title="훈장 예시" wide onClose={() => setShowExamples(false)}><MedalExamples /></Modal>}
  </>;
}
function Ranking({ state, rows, league, setLeague, open }: { state: Classroom; rows: Standing[]; league: League; setLeague: (l: League) => void; open: (s: Student) => void }) {
  const visible = state.placed ? rows.filter(r => r.league === league) : [...rows].sort((a, b) => b.wins - a.wins || a.number - b.number);
  return <><div className="section-head"><div><span className="eyebrow">서로의 도전을 응원해요</span><h2>{state.placed ? '리그별 순위' : '최초 배치전 기록'}</h2></div><span className="pill subtle">{state.placed ? '이번 구간 기준' : '시즌 RP와 별도'}</span></div>{state.placed && <div className="league-tabs">{LEAGUES.map(l => <button className={`${l} ${league === l ? 'active' : ''}`} key={l} onClick={() => setLeague(l)}><Icon name={l === 'rookie' ? 'leaf' : l === 'challenger' ? 'shield' : 'trophy'} />{LEAGUE_INFO[l].name}<span>{rows.filter(r => r.league === l).length}명</span></button>)}</div>}<section className="panel ranking-panel">{visible.every(s => s.wins === 0) && <div className="notice mint"><Icon name="leaf" size={19} />모두 같은 출발선이에요. 첫 대결을 응원합니다!</div>}<div className="table-scroll"><table><thead><tr><th>{state.placed ? '순위' : '번호'}</th><th>학생</th><th>{state.placed ? '구간 RP' : '배치 승리'}</th><th>승 / 패</th><th>남은 경기</th></tr></thead><tbody>{visible.map(s => <tr key={s.id}><td><span className={`rank-number ${state.placed && s.rank === 1 ? 'first' : ''}`}>{state.placed ? s.rank : s.number}</span></td><td><button className="table-person" onClick={() => open(s)}><strong>{s.name}</strong></button></td><td><strong className="score">{state.placed ? s.rp : s.wins}</strong>{state.placed && <small> RP</small>}</td><td>{s.wins}<span className="muted"> / {s.losses}</span></td><td><span className={`remaining ${s.remaining ? '' : 'finished'}`}>{s.remaining}회</span></td></tr>)}</tbody></table></div><p className="table-note">{state.placed ? 'RP → 구간 승리 수 → 승급 기간 승리 수 순으로 비교합니다. 승강 경계의 동점은 교사가 확정해요.' : '승리 수를 참고해 교사가 리그를 배정합니다. 배치전 점수는 시즌 RP에 포함되지 않아요.'}</p></section></>;
}
function StudentDetail({ state, student, row }: { state: Classroom; student: Student; row: Standing }) {
  const badges = badgesFor(state, student.id), season = currentSeason(state);
  return <div className="student-detail">
    <StudentCard state={state} row={row} />
    <div className="detail-content">
      {season?.completed && <div className="notice mint">이번 시즌: {LEAGUE_INFO[row.league].name} {row.rank}위<br />다음 시즌: {LEAGUE_INFO[season.nextMembers![student.id]].name}</div>}
      <h3>칭찬과 성장 훈장 <span className="muted">{badges.length}</span></h3>
      {badges.length ? <div className="badge-list honor-list">{badges.map(b => <div key={b.id}><MedalArt kind={b.kind} color={b.color} /><div className="honor-description"><strong>{b.name}</strong><p>{b.description}</p><small>{timeLabel(b.at)}</small></div></div>)}</div> : <p className="muted">아직 훈장이 없어요. 친구를 배려하는 모습도 멋진 도전이에요.</p>}
      <h3>지난 구간 기록</h3>
      {state.seasons.flatMap(s => s.rounds.filter(r => r.closed).map(r => ({ season: s, round: r, result: r.finalRows?.find(row => row.id === student.id) }))).map(({ season, round, result }) => <div className="past-result" key={round.id}><span>{season.name} · {round.index}차</span><strong>{result && `${LEAGUE_INFO[result.league].name} ${result.rank}위 · ${result.rp} RP`}</strong></div>)}
      {!state.seasons.some(s => s.rounds.some(r => r.closed)) && <p className="muted">첫 구간이 마감되면 여기에 기록이 남아요.</p>}
    </div>
  </div>;
}
function History({ state }: { state: Classroom }) {
  const archived = state.seasons.filter(s => s.rounds.some(r => r.closed));
  return <><div className="section-head"><div><span className="eyebrow">지나온 도전도 소중하니까</span><h2>우리 반 성장 기록</h2></div></div>{archived.length ? archived.slice().reverse().map(s => <section className="panel history-season" key={s.id}><div className="section-head"><div><h2>{s.name}</h2><p className="muted">{s.start} — {s.end}</p></div><span className="pill subtle">{s.completed ? '시즌 완료' : '시즌 진행 중'}</span></div>{s.rounds.filter(r => r.closed).map(r => <details key={r.id} open={r.index === s.rounds.length}><summary>{r.index}차 구간 · 리그별 최종 순위<span>{s.completed && r.index === s.rounds.length ? '이번 시즌 최종 결과' : '구간 결과'}</span></summary><div className="table-scroll"><table><thead><tr><th>학생</th><th>경기한 리그</th><th>최종 순위</th><th>RP</th><th>{s.completed && r.index === s.rounds.length ? '다음 시즌 리그' : '다음 구간 리그'}</th></tr></thead><tbody>{r.finalRows!.map(row => <tr key={row.id}><td>{row.name}</td><td><LeagueChip league={row.league} /></td><td>{row.rank}위</td><td>{row.rp}</td><td><LeagueChip league={r.nextMembers![row.id]} /></td></tr>)}</tbody></table></div></details>)}</section>) : <section className="panel"><Empty icon="history" title="지나온 도전이 여기에 남아요">구간을 마감하면 당시 리그·점수·순위를 보존합니다.</Empty></section>}</>;
}
