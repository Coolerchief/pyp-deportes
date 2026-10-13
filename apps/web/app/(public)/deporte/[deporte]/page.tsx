import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingPage } from '@/components/catalog/ListingPage';
import { getBuildData } from '@/lib/data';
import { getListing, listingTitle, staticParams } from '@/lib/listing';

type Props = { params: Promise<{ deporte: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const { catalog } = await getBuildData();
  return staticParams(
    'deporte',
    catalog.sports.map((item) => item.slug),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { deporte } = await params;
  const listing = await getListing({ kind: 'sport', sport: deporte });
  return listing ? { title: await listingTitle(listing.title) } : {};
}

export default async function SportPage({ params }: Props) {
  const { deporte } = await params;
  const listing = await getListing({ kind: 'sport', sport: deporte });
  if (!listing) notFound();
  return <ListingPage {...listing} />;
}
