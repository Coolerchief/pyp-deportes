'use client';

import { CircleAlert, CircleCheck, Images, RefreshCw } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import {
  findProducts,
  matchPhotos,
  type PhotoMatch,
  uploadMatchedPhoto,
} from '@/lib/admin/bulk-photos';
import { photoErrorMessage } from '@/lib/admin/photos';
import { getSupabase } from '@/lib/supabase/browser';
import { Button } from '../ui/button';
import { Card, CardDescription, CardTitle } from '../ui/card';
import { cn } from '../ui/cn';

type ItemState =
  | { status: 'pending' }
  | { status: 'uploading'; fraction: number }
  | { status: 'done' }
  | { status: 'error'; message: string };

type Plan = { matched: PhotoMatch[]; unmatched: File[] };

/**
 * "Fotos en lote" (APP-FLOW §8.3): files named by SKU ("BAL-001.jpg", "BAL-001-2.jpg") go to
 * their products, centered 4:5 crop, one after another. Files that match no SKU are listed.
 */
export function BulkPhotos() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [states, setStates] = useState<ItemState[]>([]);
  const [phase, setPhase] = useState<'idle' | 'matching' | 'ready' | 'uploading' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (files.length === 0) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setPhase('matching');
    setError(null);
    try {
      const next = matchPhotos(files, await findProducts(supabase, files));
      setPlan(next);
      setStates(next.matched.map(() => ({ status: 'pending' })));
      setPhase('ready');
    } catch {
      setPhase('idle');
      setError('No pudimos buscar los SKU. Revisa tu conexión e inténtalo de nuevo.');
    }
  }

  async function upload(onlyFailed = false) {
    const supabase = getSupabase();
    if (!supabase || !plan) return;
    setPhase('uploading');
    const set = (index: number, state: ItemState) =>
      setStates((list) => list.map((item, i) => (i === index ? state : item)));
    // One by one: the order inside each product is the order of the photos.
    for (const [index, match] of plan.matched.entries()) {
      if (onlyFailed && states[index]?.status !== 'error') continue;
      if (!onlyFailed && states[index]?.status === 'done') continue;
      set(index, { status: 'uploading', fraction: 0 });
      try {
        await uploadMatchedPhoto(supabase, match, (fraction) =>
          set(index, { status: 'uploading', fraction }),
        );
        set(index, { status: 'done' });
      } catch (failure) {
        set(index, { status: 'error', message: photoErrorMessage(failure) });
      }
    }
    setPhase('done');
  }

  const done = states.filter((s) => s.status === 'done').length;
  const failed = states.filter((s) => s.status === 'error').length;

  return (
    <Card className="gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle>Fotos en lote</CardTitle>
        <CardDescription>
          Nombra cada foto con el SKU del producto: <code>BAL-001.jpg</code> es la primera y{' '}
          <code>BAL-001-2.jpg</code> la segunda. Se recortan al centro en 4:5 y se agregan después
          de las fotos que ya tenga el producto.
        </CardDescription>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept="image/*,.heic,.heif"
        onChange={choose}
        data-testid="fotos-lote-input"
      />
      <Button
        variant="outline"
        className="self-start"
        disabled={phase === 'uploading'}
        loading={phase === 'matching'}
        loadingText="Buscando SKU…"
        onClick={() => inputRef.current?.click()}
      >
        <Images aria-hidden="true" />
        Elegir fotos
      </Button>
      {error && (
        <p
          role="alert"
          className="type-small text-rojo-profundo flex items-start gap-2 font-medium"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      {plan && (
        <>
          {plan.unmatched.length > 0 && (
            <div className="flex flex-col gap-1" role="group" aria-label="Fotos sin producto">
              <p className="type-small text-rojo-profundo flex items-start gap-2 font-semibold">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {plan.unmatched.length === 1
                  ? '1 foto no coincide con ningún SKU'
                  : `${plan.unmatched.length} fotos no coinciden con ningún SKU`}{' '}
                y no se subirá{plan.unmatched.length === 1 ? '' : 'n'}:
              </p>
              <ul className="type-small text-grafito flex flex-wrap gap-x-3 gap-y-1">
                {plan.unmatched.map((file) => (
                  <li key={file.name} className="break-all">
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plan.matched.length > 0 && (
            <ul className="divide-linea border-linea flex max-h-96 flex-col divide-y overflow-y-auto rounded-sm border">
              {plan.matched.map((match, index) => {
                const state = states[index] ?? { status: 'pending' };
                return (
                  <li key={`${match.file.name}-${index}`} className="flex flex-col gap-1 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="type-small text-noche min-w-0 flex-1 truncate">
                        <span className="font-semibold">{match.file.name}</span> →{' '}
                        {match.product.sku} · {match.product.name}
                      </span>
                      <span
                        className={cn(
                          'type-caption shrink-0 font-semibold',
                          state.status === 'error' ? 'text-rojo-profundo' : 'text-grafito',
                        )}
                      >
                        {state.status === 'pending' && `Foto ${match.order}`}
                        {state.status === 'uploading' && (
                          <span className="flex items-center gap-1">
                            <Spinner className="size-4" />
                            Subiendo…
                          </span>
                        )}
                        {state.status === 'done' && (
                          <span className="text-exito flex items-center gap-1">
                            <CircleCheck aria-hidden="true" className="size-4" />
                            Lista
                          </span>
                        )}
                        {state.status === 'error' && 'Falló'}
                      </span>
                    </div>
                    {state.status === 'uploading' && (
                      <progress
                        className="accent-noche h-1.5 w-full"
                        max={1}
                        value={state.fraction}
                        aria-label={`Progreso de ${match.file.name}`}
                      />
                    )}
                    {state.status === 'error' && (
                      <p className="type-caption text-rojo-profundo">{state.message}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {phase === 'done' && (
            <p
              role={failed ? 'alert' : 'status'}
              className={cn(
                'type-small flex items-start gap-2 font-medium',
                failed ? 'text-rojo-profundo' : 'text-noche',
              )}
            >
              {failed ? (
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              ) : (
                <CircleCheck aria-hidden="true" className="text-exito mt-0.5 size-4 shrink-0" />
              )}
              {done === 1 ? '1 foto subida' : `${done} fotos subidas`}
              {failed ? ` y ${failed} con error.` : '.'} Se verán en el sitio cuando publiques los
              cambios desde Inicio.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {phase !== 'done' && plan.matched.length > 0 && (
              <Button
                loading={phase === 'uploading'}
                loadingText="Subiendo…"
                onClick={() => void upload()}
              >
                Subir {plan.matched.length === 1 ? '1 foto' : `${plan.matched.length} fotos`}
              </Button>
            )}
            {phase === 'done' && failed > 0 && (
              <Button variant="outline" onClick={() => void upload(true)}>
                <RefreshCw aria-hidden="true" />
                Reintentar las fallidas
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
