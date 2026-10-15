'use client';

import {
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ImageOff,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import {
  type CropRect,
  type DecodedPhoto,
  decodePhoto,
  deletePhoto,
  MAX_PHOTOS,
  moveItem,
  photoErrorMessage,
  reorderPhotos,
  updatePhotoAlt,
  type UploadStep,
  uploadProductPhoto,
} from '@/lib/admin/photos';
import { type EditorImage, type EditorProduct, fetchProduct } from '@/lib/admin/products';
import { mediaUrl } from '@/lib/images/loader';
import { getSupabase } from '@/lib/supabase/browser';
import { Button } from '../ui/button';
import { Card, CardDescription, CardTitle } from '../ui/card';
import { cn } from '../ui/cn';
import { PhotoCropper } from './PhotoCropper';

type Upload = {
  id: string;
  name: string;
  previewUrl: string;
  step: UploadStep | 'error';
  fraction: number;
  error?: string;
  /** Kept to retry without cropping again. */
  retry?: { photo: DecodedPhoto; rect: CropRect; alt: string };
};

const STEP_TEXT: Record<UploadStep, string> = {
  preparing: 'Preparando…',
  uploading: 'Subiendo…',
  saving: 'Guardando…',
};

function Thumb({ image, localUrl }: { image: EditorImage; localUrl?: string }) {
  const [broken, setBroken] = useState(false);
  if (broken && !localUrl) {
    return (
      <span className="bg-gis flex size-full items-center justify-center">
        <ImageOff aria-hidden="true" className="text-concreto size-6" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- R2 WebP of 320 px, no optimizer in the export
    <img
      src={broken && localUrl ? localUrl : `${mediaUrl(image.keyBase)}-320.webp`}
      alt={image.alt}
      onError={() => setBroken(true)}
      className="size-full object-cover"
    />
  );
}

function AltField({
  image,
  onSave,
}: {
  image: EditorImage;
  onSave: (alt: string) => Promise<void>;
}) {
  const [value, setValue] = useState(image.alt);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const inputId = `alt-${image.id}`;
  async function save() {
    if (value.trim() === image.alt) return;
    setState('saving');
    try {
      await onSave(value);
      setState('saved');
    } catch {
      setState('error');
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="type-caption text-noche font-semibold">
        Texto alternativo
      </label>
      <input
        id={inputId}
        value={value}
        maxLength={200}
        onChange={(event) => {
          setValue(event.target.value);
          setState('idle');
        }}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void save();
          }
        }}
        aria-describedby={`${inputId}-state`}
        placeholder="Describe la foto"
        className="type-small text-noche border-borde-control focus:border-noche focus:outline-lima h-10 w-full rounded-sm border bg-blanco px-2 focus:outline-3 focus:outline-offset-0"
      />
      <span
        id={`${inputId}-state`}
        className="type-caption text-grafito min-h-4"
        aria-live="polite"
      >
        {state === 'saving' && 'Guardando…'}
        {state === 'saved' && 'Guardado.'}
        {state === 'error' && (
          <span className="text-rojo-profundo">No se guardó. Inténtalo de nuevo.</span>
        )}
      </span>
    </div>
  );
}

/**
 * "Fotos" (UI/UX §9, T4.5): take or choose photos, crop each one to 4:5, upload it to R2 with a
 * progress bar, then order them (the first is the cover), write the alt text or remove one.
 */
export function PhotosSection({
  product,
  onSaved,
}: {
  product: EditorProduct;
  onSaved: (product: EditorProduct) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [cropping, setCropping] = useState<{ file: File; photo: DecodedPhoto } | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // Local previews of this session's uploads, shown while R2 is not public (local setups).
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({});

  const images = product.images;
  const pending = uploads.filter((u) => u.step !== 'error').length;
  const room = MAX_PHOTOS - images.length - pending;

  async function refresh() {
    const supabase = getSupabase();
    if (!supabase) return;
    const fresh = await fetchProduct(supabase, product.id);
    if (fresh) onSaved(fresh);
  }

  // Opens the next chosen file in the cropper.
  useEffect(() => {
    if (cropping || queue.length === 0) return;
    const [file, ...rest] = queue;
    let cancelled = false;
    void decodePhoto(file!)
      .then((photo) => {
        if (cancelled) return;
        setQueue(rest);
        setCropping({ file: file!, photo });
      })
      .catch((error) => {
        if (cancelled) return;
        setQueue(rest);
        setNotice({ tone: 'error', text: `${file!.name}: ${photoErrorMessage(error)}` });
      });
    return () => {
      cancelled = true;
    };
  }, [queue, cropping]);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (files.length === 0) return;
    setNotice(null);
    if (files.length > room) {
      setNotice({
        tone: 'error',
        text: `Cada producto puede tener hasta ${MAX_PHOTOS} fotos: solo se tomarán ${Math.max(room, 0)}.`,
      });
    }
    setQueue((current) => [...current, ...files.slice(0, Math.max(room, 0))]);
  }

  async function start(upload: Upload) {
    const supabase = getSupabase();
    if (!supabase || !upload.retry) return;
    const { photo, rect, alt } = upload.retry;
    const patch = (changes: Partial<Upload>) =>
      setUploads((list) => list.map((u) => (u.id === upload.id ? { ...u, ...changes } : u)));
    patch({ step: 'preparing', fraction: 0, error: undefined });
    try {
      const { imageId, thumbnail } = await uploadProductPhoto({
        supabase,
        productId: product.id,
        bitmap: photo.bitmap,
        rect,
        alt,
        onProgress: (step, fraction) => patch({ step, fraction }),
      });
      setLocalUrls((urls) => ({ ...urls, [imageId]: URL.createObjectURL(thumbnail) }));
      setUploads((list) => list.filter((u) => u.id !== upload.id));
      await refresh();
      setNotice({
        tone: 'ok',
        text: 'Foto agregada. Se verá en el sitio cuando publiques los cambios desde Inicio.',
      });
    } catch (error) {
      patch({ step: 'error', error: photoErrorMessage(error) });
    }
  }

  function confirmCrop(rect: CropRect, alt: string) {
    if (!cropping) return;
    const upload: Upload = {
      id: crypto.randomUUID(),
      name: cropping.file.name,
      previewUrl: cropping.photo.previewUrl,
      step: 'preparing',
      fraction: 0,
      retry: { photo: cropping.photo, rect, alt },
    };
    setUploads((list) => [...list, upload]);
    setCropping(null);
    void start(upload);
  }

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      await refresh();
      setNotice({ tone: 'ok', text: done });
    } catch {
      setNotice({ tone: 'error', text: 'No pudimos guardar el cambio. Inténtalo de nuevo.' });
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, delta: number) {
    const supabase = getSupabase();
    if (!supabase) return;
    const ids = moveItem(
      images.map((i) => i.id),
      index,
      delta,
    );
    void run(
      () => reorderPhotos(supabase, product.id, ids),
      ids[0] !== images[0]?.id ? 'Portada cambiada.' : 'Orden guardado.',
    );
  }

  function remove(imageId: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    setConfirmDelete(null);
    void run(() => deletePhoto(supabase, imageId), 'Foto quitada.');
  }

  const Icon = notice?.tone === 'error' ? CircleAlert : CircleCheck;

  return (
    <Card className="gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle>Fotos</CardTitle>
        <CardDescription>
          {images.length === 0
            ? 'Sin foto: en el sitio se ve la imagen genérica de su categoría.'
            : `${images.length} de ${MAX_PHOTOS}. La primera es la portada.`}{' '}
          Cada foto se recorta en 4:5 y se prepara en cuatro tamaños antes de subirse.
        </CardDescription>
      </div>

      {(images.length > 0 || uploads.length > 0) && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.id} className="border-linea flex flex-col gap-2 rounded-sm border p-2">
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm">
                <Thumb image={image} localUrl={localUrls[image.id]} />
                {index === 0 && (
                  <span className="type-caption bg-noche text-blanco absolute top-1 left-1 rounded-sm px-2 py-0.5 font-semibold">
                    Portada
                  </span>
                )}
              </div>
              <AltField
                image={image}
                onSave={async (alt) => {
                  const supabase = getSupabase();
                  if (!supabase) return;
                  await updatePhotoAlt(supabase, image.id, alt);
                }}
              />
              {confirmDelete === image.id ? (
                <div className="flex flex-col gap-2" role="group" aria-label="Confirmar">
                  <p className="type-small text-noche font-semibold">¿Quitar esta foto?</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => remove(image.id)}
                    >
                      Quitar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                      No
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={busy || index === 0}
                    aria-label={`Mover foto ${index + 1} antes`}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={busy || index === images.length - 1}
                    aria-label={`Mover foto ${index + 1} después`}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="ml-auto"
                    disabled={busy}
                    aria-label={`Quitar foto ${index + 1}`}
                    onClick={() => setConfirmDelete(image.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              )}
            </li>
          ))}
          {uploads.map((upload) => (
            <li
              key={upload.id}
              className={cn(
                'flex flex-col gap-2 rounded-sm border p-2',
                upload.step === 'error' ? 'border-rojo-profundo' : 'border-linea',
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview while uploading */}
                <img src={upload.previewUrl} alt="" className="size-full object-cover opacity-60" />
              </div>
              <p className="type-caption text-grafito truncate">{upload.name}</p>
              {upload.step === 'error' ? (
                <>
                  <p
                    role="alert"
                    className="type-caption text-rojo-profundo flex items-start gap-1 font-medium"
                  >
                    <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    {upload.error}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => void start(upload)}>
                      <RefreshCw aria-hidden="true" />
                      Reintentar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setUploads((list) => list.filter((u) => u.id !== upload.id))}
                    >
                      Descartar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <p className="type-caption text-noche flex items-center gap-1 font-semibold">
                    <Spinner className="size-4" />
                    {STEP_TEXT[upload.step]}
                  </p>
                  <progress
                    className="accent-noche h-2 w-full"
                    max={1}
                    value={
                      upload.step === 'preparing'
                        ? 0.05
                        : upload.step === 'saving'
                          ? 1
                          : 0.1 + upload.fraction * 0.85
                    }
                    aria-label={`Progreso de ${upload.name}`}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

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

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={choose}
        data-testid="fotos-input"
      />
      <Button
        variant="outline"
        className="self-start"
        disabled={room <= 0}
        onClick={() => inputRef.current?.click()}
      >
        <Camera aria-hidden="true" />
        {images.length === 0 ? 'Agregar fotos' : 'Agregar más fotos'}
      </Button>

      {cropping && (
        <PhotoCropper
          photo={cropping.photo}
          name={cropping.file.name}
          onCancel={() => {
            URL.revokeObjectURL(cropping.photo.previewUrl);
            setCropping(null);
          }}
          onConfirm={confirmCrop}
        />
      )}
    </Card>
  );
}
