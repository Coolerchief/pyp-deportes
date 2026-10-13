import { siWhatsapp } from 'simple-icons';

/** WhatsApp's official glyph (UI/UX §5), in currentColor: always noche on the whatsapp green. */
export function WhatsAppGlyph({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={siWhatsapp.path} />
    </svg>
  );
}
