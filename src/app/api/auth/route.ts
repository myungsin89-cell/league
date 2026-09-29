import { NextRequest } from 'next/server';
import { body, response, errorResponse, cookieOptions, requireKiosk } from '@/lib/http';
import { createClass, verifyPassword, createSession, revoke } from '@/lib/store';
import { RuleError } from '@/lib/league';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const input = await body(req);
    if (input.action === 'lock' || input.action === 'disconnect') {
      await revoke(req.cookies.get('cl_admin')?.value);
      if (input.action === 'disconnect') await revoke(req.cookies.get('cl_kiosk')?.value);
      const res = response({ ok: true });
      res.cookies.set('cl_admin', '', cookieOptions(0));
      if (input.action === 'disconnect') res.cookies.set('cl_kiosk', '', cookieOptions(0));
      return res;
    }
    const classId = input.action === 'unlock' ? (await requireKiosk(req)).class_id : input.classId;
    const state = input.action === 'create' ? await createClass(input.name, input.password, input.names) : ['connect', 'unlock'].includes(String(input.action)) ? await verifyPassword(classId, input.password) : undefined;
    if (!state) throw new RuleError('지원하지 않는 요청입니다.');
    await revoke(req.cookies.get('cl_admin')?.value);
    const res = response({ ok: true });
    if (input.action !== 'unlock') {
      await revoke(req.cookies.get('cl_kiosk')?.value);
      const kiosk = await createSession(state.id, 'kiosk');
      res.cookies.set('cl_kiosk', kiosk.token, cookieOptions(kiosk.seconds));
    }
    if (input.action === 'create' || input.action === 'unlock') {
      const admin = await createSession(state.id, 'admin');
      res.cookies.set('cl_admin', admin.token, cookieOptions(admin.seconds));
    } else res.cookies.set('cl_admin', '', cookieOptions(0));
    return res;
  } catch (error) { return errorResponse(error); }
}
