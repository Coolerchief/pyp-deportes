type DobleDiagonalProps = {
  /** Height in px; width follows the 13° construction. */
  height?: number;
  /** Color via text-* (rojo on light, lima or blanco on noche, noche on gis, concreto when empty). */
  className?: string;
};

// Thin bar 0.6u + gap 0.55u + thick bar 1.1u, slanted 13° (u = height / 10).
const VIEW_WIDTH = 18.24;
const VIEW_HEIGHT = 40;

/** The logo's pair of 13° strokes: bullet, separator or closing mark. Always decorative. */
export function DobleDiagonal({ height = 24, className }: DobleDiagonalProps) {
  return (
    <svg
      width={Number(((height * VIEW_WIDTH) / VIEW_HEIGHT).toFixed(2))}
      height={height}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <polygon points="9.24,0 11.64,0 2.4,40 0,40" />
      <polygon points="13.84,0 18.24,0 9,40 4.6,40" />
    </svg>
  );
}
