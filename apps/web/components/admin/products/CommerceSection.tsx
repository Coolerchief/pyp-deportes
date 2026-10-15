'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type CommerceForm, CommerceFormSchema, commercePayload, variantLabel } from '@pyp/shared';
import { CircleAlert, CircleCheck, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  type Control,
  type FieldErrors,
  useFieldArray,
  useForm,
  type UseFormRegister,
} from 'react-hook-form';
import { FormField } from '@/components/ui';
import {
  commerceForm,
  type EditorProduct,
  type EditorVariant,
  fetchProduct,
  type Option,
  productErrorMessage,
  saveCommerce,
} from '@/lib/admin/products';
import { getSupabase } from '@/lib/supabase/browser';
import { Button } from '../ui/button';
import { Card, CardDescription, CardTitle } from '../ui/card';
import { cn } from '../ui/cn';

function VariantCommerce({
  index,
  variant,
  stores,
  control,
  register,
  errors,
}: {
  index: number;
  variant: EditorVariant;
  stores: Option[];
  control: Control<CommerceForm>;
  register: UseFormRegister<CommerceForm>;
  errors: FieldErrors<CommerceForm>;
}) {
  const prices = useFieldArray({ control, name: `variants.${index}.prices` });
  const label = variantLabel(variant.option1, variant.option2) ?? 'Única';
  const rowErrors = errors.variants?.[index];
  return (
    <fieldset className="border-linea flex flex-col gap-3 rounded-sm border p-3">
      <legend className="type-body-strong text-noche px-1">
        {label} <span className="type-small text-grafito font-normal">· {variant.sku}</span>
      </legend>
      <div className="flex flex-col gap-2">
        <p className="type-small text-noche font-semibold">Precios</p>
        {prices.fields.length === 0 && (
          <p className="type-small text-grafito">Sin precio capturado.</p>
        )}
        {prices.fields.map((field, row) => (
          <div key={field.id} className="flex items-start gap-2">
            <FormField
              label="Desde (piezas)"
              inputMode="numeric"
              className="w-32"
              error={rowErrors?.prices?.[row]?.minQty?.message}
              {...register(`variants.${index}.prices.${row}.minQty`)}
            />
            <FormField
              label="Precio por pieza (MXN)"
              inputMode="decimal"
              prefix="$"
              className="flex-1"
              error={rowErrors?.prices?.[row]?.price?.message}
              {...register(`variants.${index}.prices.${row}.price`)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="mt-6 shrink-0"
              aria-label={`Quitar precio ${row + 1} de ${label}`}
              onClick={() => prices.remove(row)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() =>
            prices.append({ minQty: prices.fields.length === 0 ? '1' : '', price: '' })
          }
        >
          <Plus aria-hidden="true" />
          {prices.fields.length === 0 ? 'Agregar precio' : 'Agregar escala por volumen'}
        </Button>
      </div>
      {stores.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {stores.map((store, storeIndex) => (
            <FormField
              key={store.id}
              label={`Existencias en ${store.name}`}
              inputMode="numeric"
              help="Vacío = sin contar."
              error={rowErrors?.stock?.[storeIndex]?.quantity?.message}
              {...register(`variants.${index}.stock.${storeIndex}.quantity`)}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}

/**
 * "Comercial (oculto en el sitio)" (UI/UX §9): price per piece with volume tiers and stock per
 * store, per active variant. Catalog mode never shows them; they are ready for e-commerce.
 */
export function CommerceSection({ product, stores }: { product: EditorProduct; stores: Option[] }) {
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CommerceForm>({
    resolver: zodResolver(CommerceFormSchema),
    defaultValues: commerceForm(product, stores),
  });

  async function save(values: CommerceForm) {
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    setNotice(null);
    try {
      await saveCommerce(supabase, product.id, commercePayload(values));
      const fresh = await fetchProduct(supabase, product.id);
      if (fresh) reset(commerceForm(fresh, stores));
      setNotice({ tone: 'ok', text: 'Datos comerciales guardados.' });
    } catch (error) {
      setNotice({ tone: 'error', text: productErrorMessage(error as never).message });
    } finally {
      setSaving(false);
    }
  }

  const Icon = notice?.tone === 'error' ? CircleAlert : CircleCheck;

  return (
    <Card className="gap-4">
      <form
        noValidate
        aria-labelledby="comercial-titulo"
        onSubmit={handleSubmit(save, () =>
          setNotice({ tone: 'error', text: 'Revisa los datos marcados antes de guardar.' }),
        )}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <CardTitle id="comercial-titulo">Comercial</CardTitle>
          <CardDescription className="flex items-start gap-2">
            <EyeOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Oculto en el sitio: el catálogo no muestra precios ni existencias. Quedan listos para
            cuando haya tienda en línea.
          </CardDescription>
        </div>
        {product.variants.map((variant, index) => (
          <VariantCommerce
            key={variant.id}
            index={index}
            variant={variant}
            stores={stores}
            control={control}
            register={register}
            errors={errors}
          />
        ))}
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
          variant="outline"
          className="self-end"
          disabled={!isDirty && !saving}
          loading={saving}
          loadingText="Guardando…"
        >
          Guardar datos comerciales
        </Button>
      </form>
    </Card>
  );
}
