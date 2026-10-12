import { LoaderCircle } from 'lucide-react';

/** 20 px loading indicator; decorative, the surrounding text says what is happening. */
export function Spinner({ className }: { className?: string }) {
  return (
    <LoaderCircle
      aria-hidden="true"
      className={`size-5 shrink-0 motion-safe:animate-spin ${className ?? ''}`}
    />
  );
}
