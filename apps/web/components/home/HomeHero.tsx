import type { SettingsJson } from '@pyp/shared';
import { CorteA13 } from '@/components/brand';
import { SitePhoto, SLOT_MARKERS } from '@/components/content/SitePhoto';
import { WhatsAppGlyph } from '@/components/layout/WhatsAppGlyph';
import { Button } from '@/components/ui';
import { ROUTES } from '@/lib/navigation';

/**
 * Hero (UI/UX §8.1): PatronCancha, the brand message, "Ver catálogo" and "Cotiza por WhatsApp",
 * and the cover photo (`home_hero`) with the screen's only 13° cut. On desktop the photo takes
 * the right half.
 */
export function HomeHero({
  media,
  whatsappUrl,
}: {
  media: SettingsJson['siteMedia']['home_hero'];
  whatsappUrl: string;
}) {
  return (
    <section className="cancha bg-noche text-blanco lg:grid lg:min-h-[600px] lg:grid-cols-2">
      <div className="flex flex-col gap-5 px-4 pt-10 pb-8 sm:px-6 lg:justify-center lg:gap-6 lg:py-20 lg:pr-12 lg:pl-[max(32px,calc((100vw-1216px)/2))]">
        <p className="type-eyebrow text-lima">P&amp;P Deportes Coapa · desde 1969</p>
        <h1 className="type-display">
          Tu equipo
          <br />
          empieza <span className="text-rojo">aquí.</span>
        </h1>
        <p className="type-body-lg max-w-[34rem]">
          Uniformes a la medida y todo para entrenar. Precio especial para ligas, escuelas y
          equipos.
        </p>
        <div className="flex flex-col gap-3 pt-1 sm:flex-row">
          <Button variant="primary" size="lg" href={ROUTES.catalog} fullWidth className="sm:w-auto">
            Ver catálogo
          </Button>
          <Button
            variant="whatsapp"
            size="lg"
            href={whatsappUrl}
            external
            fullWidth
            className="sm:w-auto"
            icon={<WhatsAppGlyph size={22} />}
          >
            Cotiza por WhatsApp
          </Button>
        </div>
      </div>
      <CorteA13 className="h-[258px] lg:h-auto">
        <SitePhoto
          media={media}
          marker={SLOT_MARKERS.home_hero}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
          className="h-full w-full"
        />
      </CorteA13>
    </section>
  );
}
