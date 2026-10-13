import { firstName, initials, type SettingsJson } from '@pyp/shared';
import Image from 'next/image';
import { WhatsAppGlyph } from '@/components/layout/WhatsAppGlyph';
import { Button } from '@/components/ui';
import { mediaUrl } from '@/lib/images/loader';

type AdvisorCardProps = {
  advisor: SettingsJson['siteTexts']['advisor'];
  photo: SettingsJson['siteMedia']['advisor'];
  whatsappUrl: string;
};

/**
 * AdvisorCard (UI/UX §7.7): photo (or initials), name, role, quote and "Escríbele a {nombre}".
 * Name and quote come from `site_texts.advisor`; the brackets of pending data stay visible.
 */
export function AdvisorCard({ advisor, photo, whatsappUrl }: AdvisorCardProps) {
  return (
    <figure className="bg-blanco shadow-card flex flex-col gap-4 p-5 lg:p-6">
      <div className="flex items-center gap-3">
        {photo ? (
          <Image
            src={mediaUrl(photo.keyBase)}
            alt={photo.alt}
            width={56}
            height={56}
            className="size-14 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="bg-noche text-lima font-display flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-black italic"
          >
            {initials(advisor.name)}
          </span>
        )}
        <figcaption className="flex flex-col">
          <span className="type-body-strong">{advisor.name}</span>
          <span className="type-eyebrow text-rojo-profundo text-[12px]">{advisor.role}</span>
        </figcaption>
      </div>
      <blockquote className="type-body text-grafito">“{advisor.quote}”</blockquote>
      <Button
        variant="whatsapp"
        href={whatsappUrl}
        external
        fullWidth
        icon={<WhatsAppGlyph size={20} />}
      >
        Escríbele a {firstName(advisor.name)}
      </Button>
    </figure>
  );
}
