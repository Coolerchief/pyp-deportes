'use client';

import { MessageCircle, Plus } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import {
  Badge,
  Button,
  type ButtonSize,
  type ButtonVariant,
  Chip,
  EmptyState,
  FormField,
  SectionHeader,
  Sheet,
  Skeleton,
} from '@/components/ui';

const variants: ButtonVariant[] = ['primary', 'secondary', 'whatsapp', 'outline', 'ghost'];
const sizes: ButtonSize[] = ['lg', 'md', 'sm'];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12 lg:mt-16">
      <h2 className="type-h3">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Demo() {
  const [chips, setChips] = useState<Record<string, boolean>>({ Balones: true });
  const [sheet, setSheet] = useState<'side' | 'center' | null>(null);

  return (
    <>
      <Block title="Button">
        <div className="flex flex-col gap-6">
          {sizes.map((size) => (
            <div key={size} className="flex flex-wrap items-center gap-4">
              {variants.map((variant) => (
                <Button
                  key={variant}
                  variant={variant}
                  size={size}
                  icon={
                    variant === 'whatsapp' ? (
                      <MessageCircle aria-hidden="true" className="size-5" />
                    ) : undefined
                  }
                >
                  {variant === 'whatsapp' ? 'Escríbenos' : variant}
                </Button>
              ))}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-4">
            <Button disabled>Deshabilitado</Button>
            <Button loading>Enviar</Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus aria-hidden="true" className="size-5" />}
            >
              Cotizar
            </Button>
            <Button href="/dev/marca" variant="secondary">
              Enlace
            </Button>
          </div>
          <div className="bg-noche flex flex-wrap gap-4 p-4">
            <Button>Foco sobre noche</Button>
            <Button variant="whatsapp">Enviar por WhatsApp</Button>
          </div>
        </div>
      </Block>

      <Block title="Badge">
        <div className="flex flex-wrap gap-3">
          <Badge variant="new">Nuevo</Badge>
          <Badge variant="custom">Personalizable</Badge>
          <Badge variant="info">Por volumen</Badge>
        </div>
      </Block>

      <Block title="Chip">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {[
            ['Balones', 6],
            ['Ropa deportiva', 5],
            ['Accesorios', 4],
            ['Uniformes', 3],
          ].map(([label, count]) => (
            <Chip
              key={label}
              label={String(label)}
              count={Number(count)}
              selected={!!chips[label as string]}
              onToggle={() =>
                setChips((current) => ({
                  ...current,
                  [label as string]: !current[label as string],
                }))
              }
            />
          ))}
        </div>
      </Block>

      <Block title="FormField">
        <div className="grid max-w-xl gap-4">
          <FormField label="Nombre" name="name" placeholder="Cómo te llamamos" required />
          <FormField
            label="Nombre"
            name="name-error"
            placeholder="Cómo te llamamos"
            required
            error="Escribe tu nombre."
          />
          <FormField
            label="WhatsApp"
            name="phone"
            prefix="+52"
            inputMode="numeric"
            placeholder="55 1234 5678"
            help="10 dígitos."
            required
          />
          <FormField
            label="Nota general"
            name="note"
            multiline
            placeholder="Colores del club, dudas…"
          />
        </div>
      </Block>

      <Block title="Sheet">
        <div className="flex flex-wrap gap-4">
          <Button variant="outline" onClick={() => setSheet('side')}>
            Filtrar (panel lateral)
          </Button>
          <Button variant="outline" onClick={() => setSheet('center')}>
            Personalizar (ventana)
          </Button>
        </div>
        <Sheet
          open={sheet !== null}
          onClose={() => setSheet(null)}
          title={sheet === 'center' ? 'Personalización' : 'Filtrar'}
          desktop={sheet ?? 'side'}
          footer={
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setSheet(null)}>
                Limpiar
              </Button>
              <Button fullWidth onClick={() => setSheet(null)}>
                Ver 6 productos
              </Button>
            </div>
          }
        >
          <fieldset>
            <legend className="type-h4">Categoría</legend>
            {['Balones', 'Ropa deportiva', 'Accesorios', 'Uniformes'].map((name) => (
              <label key={name} className="type-body flex min-h-11 items-center gap-3">
                <input type="checkbox" className="accent-noche size-5" />
                {name}
              </label>
            ))}
          </fieldset>
        </Sheet>
      </Block>

      <Block title="EmptyState">
        <EmptyState
          title="Tu lista está vacía"
          description="Agrega productos con sus cantidades por talla y te cotizamos por WhatsApp."
          action={
            <Button href="/dev/marca" size="lg" fullWidth>
              Ver catálogo
            </Button>
          }
          className="max-w-md"
        />
      </Block>

      <Block title="Skeleton">
        <div className="grid max-w-md grid-cols-2 gap-3" aria-live="polite">
          {[0, 1].map((key) => (
            <div key={key} className="flex flex-col gap-2">
              <Skeleton className="aspect-[4/5]" />
              <Skeleton tone="linea" className="h-3 w-1/3" />
              <Skeleton tone="linea" className="h-4 w-full" />
              <Skeleton tone="linea" className="h-10 w-2/3" />
            </div>
          ))}
          <p className="type-small text-grafito-suave col-span-2 text-center">
            Cargando productos…
          </p>
        </div>
      </Block>

      <Block title="SectionHeader">
        <div className="flex flex-col gap-6">
          <SectionHeader eyebrow="Lo más pedido" title="Destacados" href="/dev/marca" />
          <SectionHeader eyebrow="Catálogo" title="Entra por tu deporte" diagonal />
          <div className="bg-noche p-4">
            <SectionHeader
              eyebrow="Taller propio"
              title="Uniformes"
              tone="noche"
              href="/dev/marca"
              diagonal
            />
          </div>
        </div>
      </Block>
    </>
  );
}
