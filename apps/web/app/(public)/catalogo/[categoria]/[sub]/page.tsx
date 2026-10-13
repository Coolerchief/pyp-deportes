import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingPage } from '@/components/catalog/ListingPage';
import { getBuildData } from '@/lib/data';
import { EMPTY_PARAM, getListing, listingTitle } from '@/lib/listing';

type Props = { params: Promise<{ categoria: string; sub: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const { catalog } = await getBuildData();
  const subs = catalog.categories
    .filter((c) => c.parent !== null)
    .map((c) => ({ categoria: c.parent as string, sub: c.slug }));
  // See EMPTY_PARAM: output: 'export' needs at least one page per dynamic route.
  return subs.length > 0 ? subs : [{ categoria: EMPTY_PARAM, sub: EMPTY_PARAM }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria, sub } = await params;
  const listing = await getListing({ kind: 'subcategory', category: categoria, subcategory: sub });
  return listing ? { title: await listingTitle(listing.title) } : {};
}

export default async function SubcategoryPage({ params }: Props) {
  const { categoria, sub } = await params;
  const listing = await getListing({ kind: 'subcategory', category: categoria, subcategory: sub });
  if (!listing) notFound();
  return <ListingPage {...listing} />;
}
