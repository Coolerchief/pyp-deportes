import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingPage } from '@/components/catalog/ListingPage';
import { getListing, listingTitle } from '@/lib/listing';

export async function generateMetadata(): Promise<Metadata> {
  return { title: await listingTitle('Catálogo') };
}

export default async function CatalogPage() {
  const listing = await getListing({ kind: 'all' });
  if (!listing) notFound();
  return <ListingPage {...listing} />;
}
