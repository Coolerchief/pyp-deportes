import Link from 'next/link';
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import { placaOffset } from '@/components/brand';
import { cx } from '@/lib/cx';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'whatsapp';
export type ButtonSize = 'lg' | 'md' | 'sm';

const HEIGHT: Record<ButtonSize, number> = { lg: 56, md: 48, sm: 40 };

// Plate-shaped variants (clip-path at 13°); outline and ghost are rectangular.
const PLACA: Record<ButtonVariant, boolean> = {
  primary: true,
  secondary: true,
  whatsapp: true,
  outline: false,
  ghost: false,
};

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-rojo text-blanco hover:bg-rojo-profundo',
  secondary: 'bg-noche text-blanco hover:bg-grafito',
  whatsapp: 'bg-whatsapp text-noche',
  outline: 'text-noche bg-transparent shadow-[inset_0_0_0_2px_var(--color-noche)] px-6',
  ghost: 'text-rojo-profundo bg-transparent px-2 hover:underline underline-offset-4',
};

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders a link instead of a button. */
  href?: string;
  /** With `href`: an outside link (wa.me, maps) that opens in a new tab. */
  external?: boolean;
  /** `outline` on a dark background (noche, cancha): white border and text. */
  tone?: 'light' | 'dark';
  type?: 'button' | 'submit' | 'reset';
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  /** Shows a spinner and `loadingText`, and blocks the action. */
  loading?: boolean;
  loadingText?: string;
  /** Leading icon (20 px, aria-hidden). Icon-only buttons need `aria-label`. */
  icon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  'aria-label'?: string;
  children?: ReactNode;
};

/**
 * Action button (UI/UX §7.1). Text in the `button` style (19 px bold) so white on rojo passes
 * AA large. Plate variants sit in a wrapper that draws the focus ring, because clip-path
 * would cut an outline on the element itself.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  href,
  external = false,
  tone = 'light',
  type = 'button',
  onClick,
  disabled = false,
  loading = false,
  loadingText = 'Enviando…',
  icon,
  fullWidth = false,
  className,
  'aria-label': ariaLabel,
  children,
}: ButtonProps) {
  const height = HEIGHT[size];
  const placa = PLACA[variant];
  const inactive = disabled || loading;
  const offset = placaOffset(height);
  const style = {
    height,
    ...(placa && {
      '--placa-o': `${offset}px`,
      paddingInline: `${(size === 'sm' ? 16 : 24) + offset}px`,
    }),
  } as CSSProperties;

  const classes = cx(
    'type-button inline-flex items-center justify-center gap-2 whitespace-nowrap no-underline',
    'transition-[background-color,transform] duration-150 ease-brand active:translate-y-px',
    placa && 'placa',
    variant === 'outline' && tone === 'dark'
      ? 'text-blanco bg-transparent shadow-[inset_0_0_0_2px_var(--color-blanco)] px-6'
      : VARIANT[variant],
    fullWidth && 'w-full',
    inactive && 'pointer-events-none opacity-40',
  );

  const content = (
    <>
      {loading ? <Spinner /> : icon}
      {loading ? loadingText : children}
    </>
  );

  const element =
    href && external ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        style={style}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-disabled={inactive || undefined}
        tabIndex={inactive ? -1 : undefined}
      >
        {content}
      </a>
    ) : href ? (
      <Link
        href={href}
        className={classes}
        style={style}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-disabled={inactive || undefined}
        tabIndex={inactive ? -1 : undefined}
      >
        {content}
      </Link>
    ) : (
      <button
        type={type}
        className={classes}
        style={style}
        onClick={onClick}
        disabled={inactive}
        aria-busy={loading || undefined}
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );

  return (
    <span
      className={cx(
        'inline-flex',
        placa && 'focus-placa',
        fullWidth && 'w-full',
        inactive && 'cursor-not-allowed',
        className,
      )}
    >
      {element}
    </span>
  );
}
