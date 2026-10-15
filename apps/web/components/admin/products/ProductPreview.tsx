'use client';

import { CircleAlert, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { ProductPage } from '@/components/product/ProductPage';
import { buildPreview, fetchPreviewTaxonomy, type PreviewTaxonomy } from '@/lib/admin/preview';
import type { EditorProduct } from '@/lib/admin/products';
import { getSupabase } from '@/lib/supabase/browser';
import { Button } from '../ui/button';
import { Card, CardDescription, CardTitle } from '../ui/card';

const REASONS = {
  missing_brand: 'Su marca no está activa en el catálogo público.',
  missing_category: 'Su categoría no está activa en el catálogo público.',
  invalid:
    'Con los datos guardados no se puede armar la ficha. Revisa el nombre, la dirección y las especificaciones.',
} as const;

/**
 * "Vista previa" (UI/UX §9, TRD §8): the public product page with what is saved, drafts
 * included. It is inert: its buttons and links do nothing here.
 */
export function ProductPreview({ product }: { product: EditorProduct }) {
  const [open, setOpen] = useState(false);
  const [taxonomy, setTaxonomy] = useState<PreviewTaxonomy | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  async function show() {
    setOpen(true);
    if (taxonomy) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setState('loading');
    try {
      setTaxonomy(await fetchPreviewTaxonomy(supabase));
      setState('idle');
    } catch {
      setState('error');
    }
  }

  const preview = open && taxonomy ? buildPreview(product, taxonomy) : null;

  return (
    <Card className="gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>Vista previa</CardTitle>
          <CardDescription>
            Así se verá la ficha en el sitio con lo que está guardado. Los botones no funcionan
            aquí.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          aria-expanded={open}
          loading={state === 'loading'}
          loadingText="Cargando…"
          onClick={() => (open ? setOpen(false) : void show())}
        >
          {open ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          {open ? 'Ocultar vista previa' : 'Ver vista previa'}
        </Button>
      </div>
      {open && state === 'error' && (
        <p
          role="alert"
          className="type-small text-rojo-profundo flex items-start gap-2 font-medium"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          No pudimos cargar la vista previa. Revisa tu conexión e inténtalo de nuevo.
        </p>
      )}
      {preview && !preview.ok && (
        <p className="type-small text-noche flex items-start gap-2 font-medium">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {REASONS[preview.reason]}
        </p>
      )}
      {preview?.ok && (
        <div
          inert
          aria-label="Vista previa de la ficha"
          role="region"
          className="border-linea -mx-4 overflow-hidden border-y bg-blanco lg:mx-0 lg:rounded-sm lg:border"
        >
          <ProductPage data={preview.data} />
        </div>
      )}
    </Card>
  );
}
