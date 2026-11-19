/* View rotation in quarter turns. k = 0 looks from the south-west, 1 from the north-west,
   2 from the north-east, 3 from the south-east. The camera swings smoothly between them. */
export type Dir = 'N' | 'E' | 'S' | 'W';

/** Camera azimuth for rotation k: the camera sits at (sin θ, cos θ) from its target (x = east, z = south). */
export const thetaOf = (k: number) => -Math.PI / 4 - (Math.PI / 2) * k;

/** Outward normal of a compass side (x = east, z = south). */
const NORMAL: Record<Dir, [number, number]> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

/** Whether a compass side faces the camera at rotation k. */
export function visibleAt(dir: Dir, k: number) {
  const t = thetaOf(k), [nx, nz] = NORMAL[dir];
  return nx * Math.sin(t) + nz * Math.cos(t) > 0.1;
}
/** Rotation (closest to `from`) that shows a compass side. */
export function rotShowing(dir: Dir, from: number) {
  for (const d of [0, 1, 3, 2]) { const k = (from + d) % 4; if (visibleAt(dir, k)) return k; }
  return from;
}
