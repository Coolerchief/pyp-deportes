'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { type ComponentProps, Suspense } from 'react';
import { ROUTES } from '@/lib/navigation';
import { SearchBox } from './SearchBox';

type HeaderSearchProps = Omit<ComponentProps<typeof SearchBox>, 'initialQuery'>;

/** On /buscar the field shows the current query and, without one, takes the focus. */
function SearchWithQuery({ autoFocus, ...props }: HeaderSearchProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  const onSearchPage = pathname === ROUTES.search;
  const q = onSearchPage ? (params.get('q') ?? '') : '';
  return (
    <SearchBox
      key={q}
      {...props}
      initialQuery={q}
      autoFocus={autoFocus || (onSearchPage && q === '')}
    />
  );
}

/** The header's search field. useSearchParams suspends while prerendering: the fallback is the
 * same field, empty. */
export function HeaderSearch(props: HeaderSearchProps) {
  return (
    <Suspense fallback={<SearchBox {...props} />}>
      <SearchWithQuery {...props} />
    </Suspense>
  );
}
