'use client';

import { CircleAlert, Move, ZoomIn } from 'lucide-react';
import { type KeyboardEvent, type PointerEvent, useId, useRef, useState } from 'react';
import { FormField } from '@/components/ui';
import { Sheet } from '@/components/ui/Sheet';
import {
  centerOf,
  type CropRect,
  cropRect,
  type DecodedPhoto,
  isBigEnough,
  type Point,
} from '@/lib/admin/photos';
import { Button } from '../ui/button';

const FRAME_WIDTH = 288;
const FRAME_HEIGHT = 360;
const MAX_ZOOM = 4;

/**
 * 4:5 crop of one photo (UI/UX §9): drag to move it, the slider or +/− to zoom, the arrows to
 * move it from the keyboard. The alt text is written here too.
 */
export function PhotoCropper({
  photo,
  name,
  onCancel,
  onConfirm,
}: {
  photo: DecodedPhoto;
  name: string;
  onCancel: () => void;
  onConfirm: (rect: CropRect, alt: string) => void;
}) {
  const { size } = photo;
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<Point>({ x: size.width / 2, y: size.height / 2 });
  const [alt, setAlt] = useState('');
  const drag = useRef<{ x: number; y: number; center: Point } | null>(null);
  const helpId = useId();

  const rect = cropRect(size, zoom, center);
  const scale = FRAME_WIDTH / rect.width;
  const bigEnough = isBigEnough(rect);

  function moveTo(next: Point, nextZoom = zoom) {
    // Keep the center where the crop really is, so dragging back responds at once.
    setCenter(centerOf(cropRect(size, nextZoom, next)));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, center };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const start = drag.current;
    moveTo({
      x: start.center.x - (event.clientX - start.x) / scale,
      y: start.center.y - (event.clientY - start.y) / scale,
    });
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = rect.width * 0.05;
    const moves: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      moveTo({ x: center.x + move.x, y: center.y + move.y });
    } else if (event.key === '+' || event.key === '-') {
      event.preventDefault();
      const next = Math.min(Math.max(zoom + (event.key === '+' ? 0.25 : -0.25), 1), MAX_ZOOM);
      setZoom(next);
      moveTo(center, next);
    }
  }

  return (
    <Sheet
      open
      onClose={onCancel}
      title="Recortar foto"
      desktop="center"
      closeLabel="Cancelar"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button disabled={!bigEnough} onClick={() => onConfirm(rect, alt)}>
            Subir foto
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <p className="type-small text-grafito self-start break-all">{name}</p>
        <div
          role="img"
          aria-label="Recorte 4:5 de la foto"
          aria-describedby={helpId}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={onKeyDown}
          className="bg-gis border-noche relative cursor-move touch-none overflow-hidden rounded-sm border-2 select-none focus-visible:outline-lima focus-visible:outline-3 focus-visible:outline-offset-2"
          style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file */}
          <img
            src={photo.previewUrl}
            alt=""
            draggable={false}
            className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left"
            style={{
              width: size.width * scale,
              height: size.height * scale,
              transform: `translate(${-rect.x * scale}px, ${-rect.y * scale}px)`,
            }}
          />
        </div>
        <p id={helpId} className="type-caption text-grafito flex items-center gap-1 text-center">
          <Move aria-hidden="true" className="size-4 shrink-0" />
          Arrastra la foto para acomodarla (o usa las flechas y + / −).
        </p>
        <label className="type-small text-noche flex w-full max-w-72 items-center gap-3 font-semibold">
          <ZoomIn aria-hidden="true" className="size-5 shrink-0" />
          <span className="sr-only">Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            aria-label="Zoom"
            onChange={(event) => {
              const next = Number(event.target.value);
              setZoom(next);
              moveTo(center, next);
            }}
            className="accent-noche w-full"
          />
        </label>
        {!bigEnough && (
          <p
            role="alert"
            className="type-small text-rojo-profundo flex items-start gap-1 font-medium"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Con este zoom la foto queda muy pequeña. Aléjala un poco.
          </p>
        )}
        <FormField
          label="Texto alternativo"
          name="alt"
          className="w-full"
          value={alt}
          maxLength={200}
          help="Describe la foto para quien no puede verla, por ejemplo: Balón blanco con costuras negras."
          onChange={(event) => setAlt(event.target.value)}
        />
      </div>
    </Sheet>
  );
}
