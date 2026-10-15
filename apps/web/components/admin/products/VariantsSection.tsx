'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  parseOptionValues,
  planVariants,
  replaceSummary,
  VARIANT_PRESETS,
  type VariantsForm,
  VariantsFormSchema,
  variantsPayload,
} from '@pyp/shared';
import { CircleAlert, CircleCheck, Layers } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { FormField } from '@/components/ui';
import {
  type EditorProduct,
  fetchProduct,
  productErrorMessage,
  saveVariants,
} from '@/lib/admin/products';
import { getSupabase } from '@/lib/supabase/browser';
import { Button } from '../ui/button';
import { Card, CardDescription, CardTitle } from '../ui/card';
import { cn } from '../ui/cn';

const STATE_LABELS = {
  new: { text: 'Nueva', className: 'border-noche text-noche' },
  kept: { text: 'Se conserva', className: 'border-linea text-grafito' },
  reactivated: { text: 'Se reactiva', className: 'border-exito text-exito' },
} as const;

function initialForm(product: EditorProduct): VariantsForm {
  const active = product.variants;
  const unique = (values: (string | null)[]) => [
    ...new Set(values.filter((v): v is string => !!v)),
  ];
  const sizes = unique(active.map((v) => v.option1));
  const colors = unique(active.map((v) => v.option2));
  return {
    option1Name: product.option1Name,
    option1Values: sizes.join(', '),
    hasColors: colors.length > 0,
    option2Name: product.option2Name ?? 'Color',
    option2Values: colors.join(', '),
    colorNote: product.colorNote ?? '',
  };
}

/**
 * "Variantes" (UI/UX §9, T4.4): sizes × colors with a live preview of the SKUs and of what
 * regenerating does. Existing combinations keep their id (quotes, prices and stock point to
 * them); the ones that are left out are deactivated, never deleted.
 */
export function VariantsSection({
  product,
  onSaved,
}: {
  product: EditorProduct;
  onSaved: (product: EditorProduct) => void;
}) {
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<VariantsForm>({
    resolver: zodResolver(VariantsFormSchema),
    defaultValues: initialForm(product),
  });
  const values = useWatch({ control }) as VariantsForm;
  const option1 = parseOptionValues(values.option1Values ?? '');
  const option2 = values.hasColors ? parseOptionValues(values.option2Values ?? '') : [];
  const plan = planVariants({
    productSku: product.form.sku,
    option1,
    option2,
    existing: product.allVariants,
  });
  const tooMany = plan.rows.length > 200;
  const namesChanged =
    (values.option1Name ?? '').trim() !== product.option1Name ||
    (values.hasColors ? (values.option2Name ?? '').trim() : null) !==
      (product.option2Name ?? null) ||
    (values.hasColors ? null : (values.colorNote ?? '').trim() || null) !==
      (product.colorNote ?? null);

  async function save(form: VariantsForm) {
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    setNotice(null);
    try {
      const result = await saveVariants(supabase, variantsPayload(product.id, form));
      const fresh = await fetchProduct(supabase, product.id);
      if (fresh) {
        reset(initialForm(fresh));
        onSaved(fresh);
      }
      setNotice({ tone: 'ok', text: `Variantes listas: ${replaceSummary(result)}` });
    } catch (error) {
      setNotice({ tone: 'error', text: productErrorMessage(error as never).message });
    } finally {
      setSaving(false);
    }
  }

  const Icon = notice?.tone === 'error' ? CircleAlert : CircleCheck;
  const optionName = (values.option1Name ?? '').trim() || 'Opción 1';

  return (
    <Card className="gap-4">
      <form
        noValidate
        aria-labelledby="variantes-titulo"
        onSubmit={handleSubmit(save, () =>
          setNotice({ tone: 'error', text: 'Revisa los datos marcados antes de generar.' }),
        )}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <CardTitle id="variantes-titulo">Variantes</CardTitle>
          <CardDescription>
            Escribe los valores separados por comas; cada combinación es una variante con su SKU.
            Volver a generar conserva las que ya existen (con sus solicitudes, precios y
            existencias) y desactiva las que quites.
          </CardDescription>
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
          <FormField
            label="Opción 1"
            required
            help="Talla, Tamaño, Peso…"
            error={errors.option1Name?.message}
            {...register('option1Name')}
          />
          <div className="flex flex-col gap-2">
            <FormField
              label={`Valores de ${optionName}`}
              help="Vacío = una sola variante (unitalla)."
              error={errors.option1Values?.message}
              {...register('option1Values')}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-caption text-grafito">Rellenar:</span>
              {VARIANT_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  aria-label={`Rellenar con ${preset.label}: ${preset.values.join(', ')}`}
                  onClick={() =>
                    setValue('option1Values', preset.values.join(', '), {
                      shouldDirty: true,
                      shouldValidate: !!errors.option1Values,
                    })
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <label className="type-body text-noche flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="accent-noche size-5 shrink-0"
            {...register('hasColors')}
          />
          Tiene colores (cada color es una variante)
        </label>
        {values.hasColors ? (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
            <FormField
              label="Opción 2"
              required
              error={errors.option2Name?.message}
              {...register('option2Name')}
            />
            <FormField
              label={`Valores de ${(values.option2Name ?? '').trim() || 'Opción 2'}`}
              required
              help="Por ejemplo: Rojo, Azul, Blanco/Negro."
              error={errors.option2Values?.message}
              {...register('option2Values')}
            />
          </div>
        ) : (
          <FormField
            label="Nota de color"
            help='Opcional, cuando el color no es una variante: "A elegir", "Surtido".'
            className="sm:max-w-sm"
            error={errors.colorNote?.message}
            {...register('colorNote')}
          />
        )}

        <section aria-label="Vista previa de variantes" className="flex flex-col gap-2">
          <p
            className="type-small text-noche flex items-center gap-2 font-semibold"
            aria-live="polite"
          >
            <Layers aria-hidden="true" className="size-4" />
            {plan.rows.length === 1 ? '1 variante' : `${plan.rows.length} variantes`}
            {plan.deactivated.length > 0 &&
              ` · ${plan.deactivated.length} ${plan.deactivated.length === 1 ? 'se desactiva' : 'se desactivan'}`}
          </p>
          {!tooMany && (
            <ul className="divide-linea border-linea flex max-h-80 flex-col divide-y overflow-y-auto rounded-sm border">
              {plan.rows.map((row) => (
                <li key={row.sku} className="flex items-center gap-3 px-3 py-2">
                  <span className="type-body text-noche min-w-0 flex-1 truncate">{row.label}</span>
                  <span className="type-caption text-grafito hidden sm:inline">{row.sku}</span>
                  <span
                    className={cn(
                      'type-caption inline-flex h-6 shrink-0 items-center rounded-sm border px-2 font-semibold',
                      STATE_LABELS[row.state].className,
                    )}
                  >
                    {STATE_LABELS[row.state].text}
                  </span>
                </li>
              ))}
              {plan.deactivated.map((variant) => (
                <li key={variant.id} className="bg-gis flex items-center gap-3 px-3 py-2">
                  <span className="type-body text-grafito min-w-0 flex-1 truncate line-through">
                    {variant.label}
                  </span>
                  <span className="type-caption border-rojo-profundo text-rojo-profundo inline-flex h-6 shrink-0 items-center rounded-sm border px-2 font-semibold">
                    Se desactiva
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {notice && (
          <p
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'type-small flex items-start gap-2 font-medium',
              notice.tone === 'error' ? 'text-rojo-profundo' : 'text-noche',
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn('mt-0.5 size-4 shrink-0', notice.tone === 'ok' && 'text-exito')}
            />
            {notice.text}
          </p>
        )}
        <Button
          type="submit"
          className="self-end"
          disabled={saving || !isDirty || (plan.unchanged && !namesChanged)}
          loading={saving}
          loadingText="Generando…"
        >
          Generar variantes
        </Button>
      </form>
    </Card>
  );
}
