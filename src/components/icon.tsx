import type { CSSProperties } from 'react';
const paths: Record<string, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></>,
  trophy: <><path d="M8 3h8v7a4 4 0 0 1-8 0zM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v5m-4 2h8m-6-2h4" /></>,
  swords: <><path d="m4 3 3 1 13 13-3 3L4 7zM3 20l5-5m-4-2 7 7M20 3l-3 1-4 4m7-5v4l-4 4m5 9-5-5m4-2-7 7" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m1 4a5 5 0 0 1 4 5" /></>,
  card: <><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="9" cy="9" r="2" /><path d="M6 16a3 3 0 0 1 6 0m3-8h3m-3 4h3m-3 4h3" /></>,
  chart: <><path d="M4 3v18h17M8 17v-4m5 4V8m5 9V4" /></>,
  history: <><path d="M3 11a9 9 0 1 1 2 7M3 5v6h6m3-5v6l4 2" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
  unlock: <><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 7-3m-3 11v2" /></>,
  settings: <><path d="m9 3-1 3-3 1v4l-2 1 2 3v3l3 1 1 2h6l1-2 3-1v-3l2-3-2-1V7l-3-1-1-3z" /><circle cx="12" cy="12" r="3" /></>,
  shield: <><path d="m12 2 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6z" /><path d="m8 12 3 3 5-6" /></>,
  star: <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />,
  check: <path d="m5 12 4 4L19 6" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-13 4h1m6 0h1" /></>,
  bolt: <path d="m14 2-10 12h7l-1 8 10-12h-7z" />,
  medal: <><circle cx="12" cy="9" r="6" /><path d="m8 14-2 8 6-3 6 3-2-8m-6-14 2 1 2-1" /></>,
  leaf: <><path d="M20 3c-2 0-15-1-15 9a7 7 0 0 0 7 7c9 0 8-14 8-16zM3 21 15 9" /></>,
  up: <path d="m6 15 6-6 6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
  edit: <><path d="m15 4 5 5-12 12H3v-5zM13 6l5 5" /></>,
};
export default function Icon({ name, size = 22, style, className = '' }: { name: string; size?: number; style?: CSSProperties; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style} className={className}>{paths[name] || paths.star}</svg>;
}
