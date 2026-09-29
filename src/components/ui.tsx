'use client';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import Icon from './icon';
import { LEAGUE_INFO, League } from '@/lib/league';
export function LeagueChip({ league }: { league: League }) { return <span className={`league-chip ${league}`}>{LEAGUE_INFO[league].name}</span>; }
export function Empty({ icon = 'leaf', title, children }: { icon?: string; title: string; children?: ReactNode }) { return <div className="empty"><span className="empty-icon"><Icon name={icon} size={30} /></span><h3>{title}</h3><p>{children}</p></div>; }
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const root = ref.current!;
    (root.querySelector('input, button, select') as HTMLElement)?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'Tab') {
        const nodes = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')].filter(n => n.getClientRects().length);
        const first = nodes[0], last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = overflow; previous?.focus(); };
  }, [onClose]);
  return <div className="modal-overlay"><div className={`modal ${wide ? 'wide' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="닫기"><Icon name="close" /></button></div>{children}</div></div>;
}
export function dateLabel(value: string) { return value ? `${Number(value.slice(5, 7))}.${Number(value.slice(8, 10))}` : ''; }
export function timeLabel(value: string) { return new Date(value).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }); }
export const demoNames = Array.from({ length: 30 }, (_, i) => `학생 ${String(i + 1).padStart(2, '0')}`).join('\n');
export function newRequestId() { return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''); }
