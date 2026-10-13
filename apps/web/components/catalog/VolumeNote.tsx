import { DobleDiagonal } from '@/components/brand';
import { WhatsAppGlyph } from '@/components/layout/WhatsAppGlyph';
import { Button } from '@/components/ui';
import { cx } from '@/lib/cx';

/**
 * Volume note (UI/UX §7.4, §10): gis band with the DobleDiagonal, once per listing and on every
 * product page. On desktop it adds "Hablar con un asesor" to WhatsApp.
 */
export function VolumeNote({
  whatsappUrl,
  className,
}: {
  whatsappUrl: string;
  className?: string;
}) {
  return (
    <aside
      className={cx(
        'bg-gis flex items-start gap-3.5 px-4 py-5 lg:items-center lg:gap-5 lg:px-7 lg:py-6',
        className,
      )}
    >
      <DobleDiagonal height={32} className="text-rojo shrink-0" />
      <div className="flex grow flex-col gap-2 lg:gap-1.5">
        <p className="font-display text-[22px] leading-none font-extrabold italic uppercase lg:text-[26px]">
          ¿Compras para tu liga o escuela?
        </p>
        <p className="text-grafito text-[15px] leading-[1.45] lg:text-base">
          Precio especial por volumen. Arma tu lista y te cotizamos por WhatsApp.
        </p>
      </div>
      <div className="hidden shrink-0 lg:block">
        <Button variant="whatsapp" href={whatsappUrl} external icon={<WhatsAppGlyph size={20} />}>
          Hablar con un asesor
        </Button>
      </div>
    </aside>
  );
}
