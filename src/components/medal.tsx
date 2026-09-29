import { useId } from 'react';
import { DEFAULT_BADGE_COLOR, type Badge } from '@/lib/league';

function tint(color: string, amount: number) {
  return '#' + [1, 3, 5].map(offset => {
    const channel = parseInt(color.slice(offset, offset + 2), 16);
    return Math.round(channel + (255 - channel) * amount).toString(16).padStart(2, '0');
  }).join('');
}

export function MedalArt({ kind, muted = false, color = DEFAULT_BADGE_COLOR }: { kind: Badge['kind']; muted?: boolean; color?: string }) {
  const id = useId().replaceAll(':', '');
  const theme = /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_BADGE_COLOR;
  return (
    <svg className={`honor-art ${kind} ${muted ? 'unearned' : ''}`} viewBox="0 0 100 110" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-silver`} x1="26" y1="34" x2="73" y2="95" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" /><stop offset=".5" stopColor={tint(theme, .84)} /><stop offset="1" stopColor={tint(theme, .32)} />
        </linearGradient>
        <linearGradient id={`${id}-emerald`} x1="31" y1="30" x2="72" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#65cba5" /><stop offset=".5" stopColor="#2b967d" /><stop offset="1" stopColor="#14544c" />
        </linearGradient>
        <linearGradient id={`${id}-wing`} x1="16" y1="29" x2="40" y2="66" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f4fbef" /><stop offset="1" stopColor="#8bc4b0" />
        </linearGradient>
        <linearGradient id={`${id}-fire`} x1="50" y1="14" x2="50" y2="103" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff8f4e" /><stop offset=".45" stopColor="#ee5c37" /><stop offset="1" stopColor="#b73338" />
        </linearGradient>
        <linearGradient id={`${id}-warmth`} x1="50" y1="39" x2="50" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff1a0" /><stop offset="1" stopColor="#ff983c" />
        </linearGradient>
      </defs>
      {kind === 'praise' && <>
        <path d="M31 10h38l-7 30-12 12-12-12z" fill={theme} />
        <path d="m40 10 4 27 6 8 6-8 4-27h-7l-3 27-3-27z" fill={tint(theme, .64)} />
        <rect x="30" y="7" width="40" height="7" rx="3" fill={tint(theme, .16)} />
        <path d="M34 9.5h32" stroke={tint(theme, .8)} strokeWidth="2" strokeLinecap="round" />
        <circle cx="50" cy="68" r="29" fill={theme} opacity=".1" />
        <path d="m50 36 6 3 6-1 4 5 6 2 1 6 5 4-2 7 2 6-5 4-1 6-6 2-4 5-6-1-6 3-6-3-6 1-4-5-6-2-1-6-5-4 2-6-2-7 5-4 1-6 6-2 4-5 6 1z" fill={`url(#${id}-silver)`} stroke={tint(theme, .16)} strokeWidth="1.5" />
        <circle cx="50" cy="63" r="20" fill={tint(theme, .93)} stroke={tint(theme, .4)} strokeWidth="1.4" />
        <circle cx="50" cy="63" r="17" stroke="white" strokeWidth="1.2" />
        <path d="m50 49 4.2 8.5 9.4 1.4-6.8 6.6 1.6 9.4-8.4-4.4-8.4 4.4 1.6-9.4-6.8-6.6 9.4-1.4z" fill={tint(theme, .55)} stroke={theme} strokeWidth="1.5" strokeLinejoin="round" />
      </>}
      {kind === 'promotion' && <>
        <path d="M34 44C24 37 16 31 8 22c-1 17 3 31 18 42l9 3z" fill={`url(#${id}-wing)`} stroke="#6aa38e" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M66 44c10-7 18-13 26-22 1 17-3 31-18 42l-9 3z" fill={`url(#${id}-wing)`} stroke="#6aa38e" strokeWidth="1.2" strokeLinejoin="round" />
        <g stroke="#75ad97" strokeWidth="1.3" strokeLinecap="round"><path d="m14 36 17 16M17 47l15 12M86 36 69 52M83 47 68 59" /></g>
        <path d="m50 13 3 6.2 6.8 1-4.9 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8-4.9-4.8 6.8-1z" fill="#f8de8d" stroke="#a8904e" strokeWidth="1.2" />
        <path d="M50 33c-8 5-16 7-25 8l2 30c1 12 11 23 23 29 12-6 22-17 23-29l2-30c-9-1-17-3-25-8z" fill="#d8c48b" stroke="#8c956e" strokeWidth="1.4" />
        <path d="M50 39c-7 4-13 6-20 7l2 24c1 10 8 19 18 24 10-5 17-14 18-24l2-24c-7-1-13-3-20-7z" fill={`url(#${id}-emerald)`} stroke="#e9ebc1" strokeWidth="1.2" />
        <path d="m39 62 11-11 11 11m-22 13 11-11 11 11" stroke="#e8f7dc" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M50 82v4" stroke="#a3d4b8" strokeWidth="2.5" strokeLinecap="round" />
      </>}
      {kind === 'streak' && <>
        <path d="M51 8c4 16 24 23 21 45 7-5 9-12 8-19 16 18 15 40 4 54-8 11-20 16-34 16-23 0-39-16-39-36 0-15 6-25 14-33-1 11 4 17 8 18-3-19 15-27 18-45z" fill={`url(#${id}-fire)`} stroke="#c24d3c" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M50 35c3 11 15 18 13 31 5-3 7-7 7-12 8 10 10 19 5 29-5 10-13 15-25 15-17 0-28-11-28-24 0-9 4-16 9-22 0 9 4 13 8 14-2-12 9-20 11-31z" fill={`url(#${id}-warmth)`} />
        <path d="M51 65c1 8 10 11 10 21 0 6-4 10-11 10s-12-5-12-12c0-8 7-12 13-19z" fill="#fff3b8" />
        <path d="m16 21 2 4m65-9-3 5M36 12l-2 5" stroke="#eeaa61" strokeWidth="2.5" strokeLinecap="round" />
      </>}
    </svg>
  );
}

export function Medal({ badge }: { badge: Badge }) {
  return <span className={`honor-medal ${badge.kind}`} title={`${badge.name} · ${badge.description}`}><MedalArt kind={badge.kind} color={badge.color} /><strong className="honor-name">{badge.name}</strong></span>;
}

export function MedalExamples() {
  const examples: { kind: Badge['kind']; name: string; description: string; rule: string }[] = [
    { kind: 'praise', name: '교사 커스텀 훈장', description: '선생님이 수여합니다', rule: '우리 반을 위해 선생님이 만든 훈장' },
    { kind: 'promotion', name: '승급 성공', description: '한 단계 높은 리그로 올라갔어요.', rule: '리그 승급 시 자동 수여' },
    { kind: 'streak', name: '3연승', description: '같은 구간에서 세 번 연속 승리했어요.', rule: '3연승 달성 시 자동 수여' },
  ];
  return <div className="medal-examples"><p className="muted">우리 반의 칭찬과 성장을 기념하는 훈장이에요.</p><div className="medal-example-grid">{examples.map(example => <article className={`medal-example ${example.kind}`} key={example.kind}><span className="medal-example-tag">{example.kind === 'praise' ? '커스텀' : '자동 수여'}</span><MedalArt kind={example.kind} /><h3>{example.name}</h3><p>{example.description}</p><small>{example.rule}</small></article>)}</div><p className="medal-example-note">받은 훈장은 학생 카드에 표시됩니다. 카드를 누르면 전체 훈장과 받은 이유를 볼 수 있어요.</p></div>;
}
