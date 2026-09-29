import { NextRequest } from 'next/server';
import { session, getClass, catalog } from '@/lib/store';
import { response, errorResponse, meta } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const kiosk = await session(req.cookies.get('cl_kiosk')?.value, 'kiosk');
    if (!kiosk) return response({ state: null, classes: await catalog(), admin: false });
    return response({ state: await getClass(kiosk.class_id), ...await meta(req, kiosk.class_id) });
  } catch (error) { return errorResponse(error); }
}
