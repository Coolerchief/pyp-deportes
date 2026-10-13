import { getBuildData } from '@/lib/data';

// Written to out/data/settings.json at build time (WhatsApp, flags, store, site photos and texts).
export const dynamic = 'force-static';

export async function GET() {
  const { settings } = await getBuildData();
  return Response.json(settings);
}
