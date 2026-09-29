import { NextRequest } from 'next/server';
import { body, response, errorResponse, requireKiosk, requireAdmin, meta } from '@/lib/http';
import { mutateClass } from '@/lib/store';
import { adminAction, recordMatch, RuleError } from '@/lib/league';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const input = await body(req);
    const kiosk = await requireKiosk(req);
    if (typeof input.action !== 'string' || !input.payload || typeof input.payload !== 'object' || Array.isArray(input.payload)) throw new RuleError('입력 내용을 확인해 주세요.');
    if (input.action !== 'match') await requireAdmin(req, kiosk.class_id);
    const { state } = await mutateClass(kiosk.class_id, state => input.action === 'match' ? recordMatch(state, input.payload as Parameters<typeof recordMatch>[1]) : adminAction(state, input.action as string, input.payload as Record<string, unknown>));
    return response({ state, ...await meta(req, kiosk.class_id) });
  } catch (error) { return errorResponse(error); }
}
