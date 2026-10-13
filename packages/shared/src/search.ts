// Catalog search (T2.6, TRD §7): MiniSearch over catalog.json in the browser. Separate entry
// point (@pyp/shared/search) so the Edge Functions never bundle MiniSearch.

import MiniSearch, { type SearchResult } from 'minisearch';
import type { CatalogJson, CatalogProduct } from './catalog';
import { normalizeText } from './text';

/** Fuzziness of normal results and of the "¿Quisiste decir…?" correction (TRD §7). */
export const SEARCH_FUZZY = 0.2;
export const SUGGEST_FUZZY = 0.4;
/** Typing shows suggestions from 2 characters (APP-FLOW §3.3). */
export const MIN_QUERY_LENGTH = 2;

/**
 * Index form of a word: no accents, lowercase and a simple singular, so "Balones", "balón" and
 * "balon" meet: "balones" → "balon", "guantes" → "guante", "tallas" → "talla".
 */
export function searchTerm(word: string): string {
  const term = normalizeText(word);
  if (term.length > 4 && /[lnrdzj]es$/.test(term)) return term.slice(0, -2);
  if (term.length > 3 && /[aeiou]s$/.test(term)) return term.slice(0, -1);
  return term;
}

const tokenize = (text: string) => text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

type SearchDocument = {
  id: string;
  name: string;
  brand: string;
  sku: string;
  category: string;
  sports: string;
};

export type CatalogSearch = {
  index: MiniSearch<SearchDocument>;
  products: Map<string, CatalogProduct>;
  /** Index term → the word as people read it ("balon" → "balón"), for suggestions. */
  words: Map<string, string>;
  /** Product and variant SKUs without separators → product id ("box004" → …). */
  skus: Map<string, string>;
};

const compactSku = (value: string) => normalizeText(value).replace(/[^a-z0-9]/g, '');

/** Builds the index: name^3, brand^2, SKU, category and subcategory, sports. */
export function buildCatalogSearch(catalog: CatalogJson): CatalogSearch {
  const categoryName = new Map(catalog.categories.map((c) => [c.slug, c.name]));
  const sportName = new Map(catalog.sports.map((s) => [s.slug, s.name]));
  const index = new MiniSearch<SearchDocument>({
    fields: ['name', 'brand', 'sku', 'category', 'sports'],
    tokenize,
    processTerm: (term) => searchTerm(term) || null,
    searchOptions: {
      boost: { name: 3, brand: 2 },
      prefix: true,
      fuzzy: SEARCH_FUZZY,
      combineWith: 'AND',
    },
  });
  const documents = catalog.products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand.name,
    sku: p.sku,
    category: [p.category, p.subcategory]
      .map((slug) => (slug ? categoryName.get(slug) : undefined))
      .filter(Boolean)
      .join(' '),
    sports: p.sports.map((slug) => sportName.get(slug) ?? slug).join(' '),
  }));
  index.addAll(documents);

  // Display form of each term: prefer a word that is already the term's singular ("balón").
  const words = new Map<string, string>();
  for (const doc of documents) {
    for (const word of tokenize(`${doc.name} ${doc.brand} ${doc.category} ${doc.sports}`)) {
      const term = searchTerm(word);
      const shown = word.toLowerCase();
      if (!words.has(term) || normalizeText(word) === term) words.set(term, shown);
    }
  }
  const skus = new Map<string, string>();
  for (const p of catalog.products) {
    for (const sku of [p.sku, ...p.variants.map((v) => v.sku)]) skus.set(compactSku(sku), p.id);
  }
  return { index, products: new Map(catalog.products.map((p) => [p.id, p])), words, skus };
}

const byScore = (results: SearchResult[], products: Map<string, CatalogProduct>) =>
  results.map((r) => products.get(r.id)).filter((p): p is CatalogProduct => p !== undefined);

/**
 * Products by relevance (fuzzy 0.2 and prefix); a query that is exactly a product or variant SKU
 * puts that product first. Empty for queries under 2 characters.
 */
export function searchProducts(search: CatalogSearch, query: string): CatalogProduct[] {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];
  const results = byScore(search.index.search(q), search.products);
  const skuMatch = search.products.get(search.skus.get(compactSku(q)) ?? '');
  return skuMatch ? [skuMatch, ...results.filter((p) => p.id !== skuMatch.id)] : results;
}

/**
 * "¿Quisiste decir…?" (TRD §7): when some word of the query is not in the catalog as written
 * (neither exact nor as the start of a word), the closest phrase with a wider fuzziness, shown
 * with its accents ("valon" → "balón"). null when the query is fine or nothing is close.
 */
export function suggestCorrection(search: CatalogSearch, query: string): string | null {
  const terms = tokenize(query).map(searchTerm).filter(Boolean);
  if (terms.length === 0) return null;
  const known = (term: string) =>
    search.index.search(term, { fuzzy: false, prefix: true, combineWith: 'AND' }).length > 0;
  if (terms.every(known)) return null;
  const [best] = search.index.autoSuggest(query, { fuzzy: SUGGEST_FUZZY, prefix: false });
  if (!best) return null;
  const phrase = best.terms.map((term) => search.words.get(term) ?? term).join(' ');
  return searchTerm(phrase) === terms.join(' ') ? null : phrase;
}

export type SearchSuggestions = {
  products: CatalogProduct[];
  categories: { slug: string; name: string; parent: string | null }[];
};

/** While typing (APP-FLOW §3.3): up to 6 products and 3 categories. */
export function searchSuggestions(
  search: CatalogSearch,
  catalog: CatalogJson,
  query: string,
): SearchSuggestions {
  const products = searchProducts(search, query);
  const q = searchTerm(query.trim());
  const seen = new Set<string>();
  const categories: SearchSuggestions['categories'] = [];
  // Categories whose name matches the text first, then the categories of the top products.
  const byName = catalog.categories.filter((c) =>
    tokenize(c.name).some((word) => searchTerm(word).startsWith(q)),
  );
  const fromProducts = products.flatMap((p) =>
    [p.subcategory, p.category]
      .map((slug) => catalog.categories.find((c) => c.slug === slug))
      .filter((c) => c !== undefined),
  );
  for (const category of [...byName, ...fromProducts]) {
    if (seen.has(category.slug) || categories.length === 3) continue;
    seen.add(category.slug);
    categories.push(category);
  }
  return { products: products.slice(0, 6), categories };
}
