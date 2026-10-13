import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingPage } from '@/components/catalog/ListingPage';
import { getBuildData } from '@/lib/data';
import { getListing, listingTitle, staticParams } from '@/lib/listing';

type Props = { params: Promise<{ categoria: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const { catalog } = await getBuildData();
  return staticParams(
    'categoria',
    catalog.categories.filter((c) => c.parent === null).map((c) => c.slug),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const listing = await getListing({ kind: 'category', category: categoria });
  return listing ? { title: await listingTitle(listing.title) } : {};
}

export default async function CategoryPage({ params }: Props) {
  const { categoria } = await params;
  const listing = await getListing({ kind: 'category', category: categoria });
  if (!listing) notFound();
  return <ListingPage {...listing} />;
}
