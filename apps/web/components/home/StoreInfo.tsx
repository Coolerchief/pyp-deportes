import { directionsUrl, type SettingsJson } from '@pyp/shared';
import { MapPin, Phone } from 'lucide-react';
import { Button, SectionHeader } from '@/components/ui';
import { type SiteNav, shortCity } from '@/lib/navigation';
import { StoreStatus } from './StoreStatus';

type StoreInfoProps = {
  store: SettingsJson['store'];
  contact: SiteNav['contact'];
};

/**
 * StoreInfo (UI/UX §7.7): map, address, open/closed state, hours, "Cómo llegar" (secondary) and
 * "Llamar" (outline). The map stays a placeholder until one is chosen (embedded or image).
 */
export function StoreInfo({ store, contact }: StoreInfoProps) {
  return (
    <section className="container-page py-12 lg:py-20">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
        <div
          aria-hidden="true"
          className="bg-gis text-grafito-suave flex aspect-[16/10] flex-col items-center justify-center gap-2 lg:order-first"
        >
          <MapPin className="text-rojo size-8" />
          <span className="type-caption tracking-wider">[MAPA]</span>
        </div>
        <div className="flex flex-col gap-4">
          <SectionHeader eyebrow="Tienda" title="Visítanos en Coapa" />
          <address className="type-body-lg not-italic">
            {store.street}
            <br />
            {store.neighborhood}, {store.borough}, {store.postalCode}, {shortCity(store.city)}
          </address>
          <StoreStatus hours={store.hours} />
          {contact.hours && <p className="type-small text-grafito-suave">{contact.hours}</p>}
          <div className="flex flex-wrap gap-3 pt-1">
            <Button variant="secondary" href={directionsUrl(store)} external>
              Cómo llegar
            </Button>
            {contact.phoneHref && (
              <Button
                variant="outline"
                href={contact.phoneHref}
                icon={<Phone aria-hidden="true" className="size-5" />}
              >
                Llamar
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
