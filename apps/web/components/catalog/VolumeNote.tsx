import { DobleDiagonal } from '@/components/brand';
import { WhatsAppGlyph } from '@/components/layout/WhatsAppGlyph';
import { Button } from '@/components/ui';
import { cx } from '@/lib/cx';

/**
 * Volume note (UI/UX §7.4, §10): gis band with the DobleDiagonal, once per listing and on every
 * product page. On desktop it adds "Hablar con un asesor" to WhatsApp. `stacked` puts the
 * button under the text, for narrow columns like the product page's.
 */
export function VolumeNote({
  whatsappUrl,
  stacked = false,
  className,
}: {
  whatsappUrl: string;
  stacked?: boolean;
  className?: string;
}) {
  return (
    <aside
      className={cx(
        'bg-gis flex items-start gap-3.5 px-4 py-5 lg:gap-5 lg:px-7 lg:py-6',
        stacked ? 'lg:flex-wrap' : 'lg:items-center',
        className,
      )}
    >
      <DobleDiagonal height={32} className="text-rojo shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 lg:gap-1.5">
        <p className="font-display text-[22px] leading-none font-extrabold italic uppercase lg:text-[26px]">
          ¿Compras para tu liga o escuela?
        </p>
        <p className="text-grafito text-[15px] leading-[1.45] lg:text-base">
          Precio especial por volumen. Arma tu lista y te cotizamos por WhatsApp.
        </p>
      </div>
      <div className={cx('hidden shrink-0 lg:block', stacked && 'lg:basis-full lg:pl-[35px]')}>
        <Button variant="whatsapp" href={whatsappUrl} external icon={<WhatsAppGlyph size={20} />}>
          Hablar con un asesor
        </Button>
      </div>
    </aside>
  );
}
