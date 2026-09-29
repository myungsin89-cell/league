import type { Classroom } from '@/lib/league';
import { currentSeason } from '@/lib/league';
import { dateLabel } from './ui';
import Icon from './icon';

export default function StudentNotice({ state, compact = false }: { state: Classroom; compact?: boolean }) {
  const season = currentSeason(state);
  const instructions = state.activity.instructions.split(/\n+/).map(line => line.trim()).filter(Boolean);
  return <section className={`student-notice ${compact ? 'compact' : ''}`} aria-labelledby={compact ? 'record-notice-title' : 'home-notice-title'}>
    <div className="student-notice-heading"><span className="student-notice-icon"><Icon name="swords" size={28} /></span><div><span className="eyebrow">대결 전에 함께 읽어요</span><h2 id={compact ? 'record-notice-title' : 'home-notice-title'}>{state.activity.name}</h2></div></div>
    {!compact && <div className="student-notice-facts">
      {!state.placed && state.placement && <div><span>배치전 기간</span><strong>{dateLabel(state.placement.start)}<span> ~ </span>{dateLabel(state.placement.end)}</strong></div>}
      <div><span>{state.placed ? '현재 경기 기회' : '배치전 경기 기회'}</span><strong>{state.placed ? '이름 아래 남은 횟수 확인' : <>1인당 총 {state.placementLimit}경기</>}</strong></div>
      {season && <div><span>정규 리그 시작</span><strong>{dateLabel(season.start)}</strong></div>}
    </div>}
    <ul className="student-notice-rules">{instructions.map((line, i) => <li key={i}>{line}</li>)}</ul>
    {!compact && <>
      {!state.placed && <p className="student-notice-reminder"><strong>서로 다른 친구 {state.placementLimit}명과 대결해요.</strong> 이겨도 져도 경기 기회는 1회 사용돼요. 경기를 하지 않으면 승리 기록을 쌓을 수 없으니, 기간 안에 {state.placementLimit}경기를 모두 마쳐요.</p>}
      <div className="student-notice-record"><Icon name="check" size={24} /><p><strong>대결 후 두 사람이 함께 태블릿에 기록해요.</strong><span>두 사람 이름 선택 → 승자 선택 → 각자 확인 → 저장</span></p></div>
    </>}
  </section>;
}
