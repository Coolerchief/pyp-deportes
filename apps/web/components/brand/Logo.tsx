import Image from 'next/image';

export type LogoVariant = 'horizontal' | 'vertical' | 'monograma';
export type LogoTone = 'positivo' | 'negativo' | 'mono-blanco' | 'mono-noche';

// Aspect ratios of the SVG view boxes in public/brand.
const RATIO: Record<LogoVariant, number> = {
  horizontal: 55 / 10,
  vertical: 23.45 / 18,
  monograma: 23.45 / 10,
};

/** Minimum on-screen widths from the brand manual (UI/UX §3). */
export const LOGO_MIN_WIDTH: Record<LogoVariant, number> = {
  horizontal: 120,
  vertical: 80,
  monograma: 32,
};

type LogoProps = {
  variant?: LogoVariant;
  /** Background rule: light → positivo, dark → negativo, rojo → mono-blanco, lima → mono-noche. */
  tone?: LogoTone;
  /** Width in px; never below the manual's minimum for the variant. */
  width?: number;
  alt?: string;
  className?: string;
  priority?: boolean;
};

export function logoSrc(variant: LogoVariant, tone: LogoTone): string {
  const file = variant === 'monograma' ? `monograma-${tone}` : `logo-${variant}-${tone}`;
  return `/brand/${file}.svg`;
}

export function Logo({
  variant = 'horizontal',
  tone = 'positivo',
  width,
  alt = 'P&P Deportes Coapa',
  className,
  priority,
}: LogoProps) {
  const w = Math.max(width ?? LOGO_MIN_WIDTH[variant], LOGO_MIN_WIDTH[variant]);
  return (
    <Image
      src={logoSrc(variant, tone)}
      width={w}
      height={Math.round(w / RATIO[variant])}
      alt={alt}
      className={className}
      priority={priority}
    />
  );
}
