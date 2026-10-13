import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductPage } from '@/components/product/ProductPage';
import { getBuildData } from '@/lib/data';
import { staticParams } from '@/lib/listing';
import { buildProductPage } from '@/lib/product';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

/** One page per published product (empty catalog: the "_" stand-in, see lib/listing). */
export async function generateStaticParams() {
  const { catalog } = await getBuildData();
  return staticParams(
    'slug',
    catalog.products.map((p) => p.slug),
  );
}

async function load(slug: string) {
  const { rows, catalog, settings } = await getBuildData();
  return { data: buildProductPage(rows, catalog, settings, slug), siteName: settings.siteName };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data, siteName } = await load((await params).slug);
  if (!data) return {};
  return {
    title: `${data.product.name} · ${siteName}`,
    ...(data.shortDescription ? { description: data.shortDescription } : {}),
  };
}

export default async function ProductRoute({ params }: Props) {
  const { data } = await load((await params).slug);
  if (!data) notFound();
  return <ProductPage data={data} />;
}
