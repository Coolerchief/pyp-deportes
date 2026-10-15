import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from './cn';

// shadcn/ui Button with the brand tokens (UI/UX §9): rectangular, 2 px radius, primary noche,
// destructive rojo-profundo. No plate cuts: the panel is a tool.
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-sm font-sans font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-noche text-blanco hover:bg-grafito',
        destructive: 'bg-rojo-profundo text-blanco hover:bg-rojo',
        outline: 'border-borde-control text-noche hover:bg-gis border bg-blanco',
        ghost: 'text-noche hover:bg-gis',
        link: 'text-rojo-profundo underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-12 px-5 text-base',
        sm: 'h-10 px-3 text-sm',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Spinner plus `loadingText`, and the button is disabled. */
    loading?: boolean;
    loadingText?: string;
  };

export function Button({
  className,
  variant,
  size,
  loading = false,
  loadingText,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
