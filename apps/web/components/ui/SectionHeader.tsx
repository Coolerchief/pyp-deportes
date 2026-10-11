import Link from 'next/link';
import { DobleDiagonal } from '@/components/brand';
import { cx } from '@/lib/cx';

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  /** Optional "Ver todo" link. */
  href?: string;
  linkLabel?: string;
  /** Surface the header sits on: light (default) or noche. */
  tone?: 'claro' | 'noche';
  /** Shows the DobleDiagonal after the title. */
  diagonal?: boolean;
  as?: 'h1' | 'h2' | 'h3';
  id?: string;
  className?: string;
};

/** Section heading (UI/UX §7.7): eyebrow, italic uppercase title and an optional link. */
export function SectionHeader({
  eyebrow,
  title,
  href,
  linkLabel = 'Ver todo',
  tone = 'claro',
  diagonal = false,
  as: Heading = 'h2',
  id,
  className,
}: SectionHeaderProps) {
  const dark = tone === 'noche';
  return (
    <div className={cx('flex items-end justify-between gap-4', className)}>
      <div>
        <p className={cx('type-eyebrow', dark ? 'text-lima' : 'text-rojo-profundo')}>{eyebrow}</p>
        <Heading
          id={id}
          className={cx(
            'type-h2 mt-1 flex items-center gap-3',
            dark ? 'text-blanco' : 'text-noche',
          )}
        >
          {title}
          {diagonal && <DobleDiagonal height={28} className={dark ? 'text-lima' : 'text-rojo'} />}
        </Heading>
      </div>
      {href && (
        <Link
          href={href}
          className={cx(
            'type-body shrink-0 font-semibold no-underline underline-offset-4 hover:underline',
            dark ? 'text-lima' : 'text-rojo-profundo',
          )}
        >
          {linkLabel}
          <span className="sr-only">: {title}</span>
          <span aria-hidden="true"> →</span>
        </Link>
      )}
    </div>
  );
}
