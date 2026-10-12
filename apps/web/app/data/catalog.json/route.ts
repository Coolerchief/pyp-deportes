import { getBuildData } from '@/lib/data';

// Written to out/data/catalog.json at build time (filters, sorting and search in the browser).
export const dynamic = 'force-static';

export async function GET() {
  const { catalog } = await getBuildData();
  return Response.json(catalog);
}
