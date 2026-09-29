import { NextRequest, NextResponse } from 'next/server';
import { AccessError, session } from './store';
import { RuleError, todaySeoul } from './league';
export async function requireKiosk(req: NextRequest) {
  const kiosk = await session(req.cookies.get('cl_kiosk')?.value, 'kiosk');
  if (!kiosk) throw new AccessError('교사가 먼저 이 기기를 학급에 연결해 주세요.');
  return kiosk;
}
export async function requireAdmin(req: NextRequest, classId: string) {
  const admin = await session(req.cookies.get('cl_admin')?.value, 'admin');
  if (!admin || admin.class_id !== classId) throw new AccessError('교사 비밀번호로 관리 화면을 열어 주세요.', 403);
  return admin;
}
export async function body(req: NextRequest): Promise<Record<string, unknown>> {
  const origin = req.headers.get('origin');
  // Next's internal URL can use the bind address (0.0.0.0). Match the browser's Host.
  let sameOrigin = false;
  try {
    const parsed = new URL(origin || '');
    sameOrigin = ['http:', 'https:'].includes(parsed.protocol) && parsed.origin === origin && parsed.host === (req.headers.get('host') || req.nextUrl.host);
  } catch { /* Invalid or absent Origin. */ }
  if (!sameOrigin) throw new AccessError('허용되지 않은 요청입니다.', 403);
  const raw = await req.text();
  if (Buffer.byteLength(raw) > 32768) throw new RuleError('입력 내용이 너무 깁니다.');
  try { const result = JSON.parse(raw); if (!result || Array.isArray(result) || typeof result !== 'object') throw new Error(); return result; }
  catch { throw new RuleError('입력 내용을 확인해 주세요.'); }
}
export function response(data: object, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } }); }
export function errorResponse(error: unknown) {
  if (error instanceof AccessError) return response({ error: error.message }, error.status);
  if (error instanceof RuleError) return response({ error: error.message }, 400);
  console.error('Class League request failed:', error);
  return response({ error: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 500);
}
export function cookieOptions(seconds: number) { return { httpOnly: true, sameSite: 'strict' as const, path: '/', secure: !!process.env.VERCEL || process.env.COOKIE_SECURE === '1', maxAge: seconds }; }
export async function meta(req: NextRequest, classId: string) {
  const admin = await session(req.cookies.get('cl_admin')?.value, 'admin');
  return { admin: admin?.class_id === classId, adminExpires: admin?.class_id === classId ? admin.expires : 0, today: todaySeoul() };
}
