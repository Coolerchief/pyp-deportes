import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingPage } from '@/components/catalog/ListingPage';
import { getBuildData } from '@/lib/data';
import { getListing, listingTitle, staticParams } from '@/lib/listing';

type Props = { params: Promise<{ marca: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const { catalog } = await getBuildData();
  return staticParams(
    'marca',
    catalog.brands.map((item) => item.slug),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { marca } = await params;
  const listing = await getListing({ kind: 'brand', brand: marca });
  return listing ? { title: await listingTitle(listing.title) } : {};
}

export default async function BrandPage({ params }: Props) {
  const { marca } = await params;
  const listing = await getListing({ kind: 'brand', brand: marca });
  if (!listing) notFound();
  return <ListingPage {...listing} />;
}
