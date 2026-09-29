import { NextRequest } from 'next/server';
import { requireKiosk, requireAdmin, errorResponse, response } from '@/lib/http';
import { getClass } from '@/lib/store';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  try {
    const kiosk = await requireKiosk(req); await requireAdmin(req, kiosk.class_id);
    const res = response({ version: 1, exportedAt: new Date().toISOString(), classroom: await getClass(kiosk.class_id) });
    res.headers.set('Content-Disposition', 'attachment; filename="class-league-records.json"');
    return res;
  } catch (error) { return errorResponse(error); }
}
