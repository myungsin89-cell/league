import type { Metadata, Viewport } from 'next';
import './globals.css';
import './honors.css';
import './student-notice.css';

export const metadata: Metadata = {
  title: '교실 리그 · 함께 도전하는 우리 반',
  description: '공용 태블릿으로 기록하는 우리 반 리그. 대결, 성장, 그리고 작은 칭찬.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#087f72' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
