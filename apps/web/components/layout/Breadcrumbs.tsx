import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

/** A level of the trail; without `href` it is plain text (a section with no page of its own). */
export type Crumb = { label: string; href?: string };

/**
 * Breadcrumbs (UI/UX §7.3): `small` grafito-suave with "/" on desktop; on mobile only the
 * nearest level with a page ("‹ Balones"). The last crumb is the current page.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const current = items[items.length - 1];
  const back = [...items.slice(0, -1)].reverse().find((item) => item.href);
  return (
    <nav aria-label="Ruta de navegación" className="type-small text-grafito-suave">
      {back?.href && (
        <Link
          href={back.href}
          className="text-grafito-suave inline-flex min-h-11 items-center gap-0.5 no-underline lg:hidden"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          {back.label}
        </Link>
      )}
      <ol className="hidden flex-wrap items-center gap-1.5 lg:flex">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <span aria-hidden="true">/</span>}
            {item === current ? (
              <span aria-current="page" className="text-noche">
                {item.label}
              </span>
            ) : item.href ? (
              <Link href={item.href} className="text-grafito-suave">
                {item.label}
              </Link>
            ) : (
              item.label
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
