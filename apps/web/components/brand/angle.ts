/** tan(13°): horizontal offset of anything slanted at the brand angle, per pixel of height. */
export const TAN13 = 0.2309;

/** Horizontal offset in px for a plate (Placa) of the given height. */
export function placaOffset(height: number): number {
  return Math.round(height * TAN13);
}
