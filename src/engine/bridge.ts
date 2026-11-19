/* Brooklyn Bridge: shared geometry + the river span (a top-level scene item).
   The DUMBO anchorage/deck lives in hoods/dumbo.ts, the FiDi anchorage/ramp in hoods/fidi.ts. */
import { INK, C_STONE, iso, pts, poly, ln, dk, box, faceL, faceR, frect } from './iso';
import type { Pt } from './iso';

export const T1 = 15.3, T2 = 20.7;
const ZT = 9.0, ZM = 3.6, YA = 5.5, YB = 23.2, ZA = 2.9;

export function cableZ(y: number) {
  if (y <= T1) return ZA + (ZT - ZA) * Math.pow(Math.max(0, (y - YA) / (T1 - YA)), 1.35);
  if (y >= T2) return ZA + (ZT - ZA) * Math.pow(Math.max(0, (YB - y) / (YB - T2)), 1.35);
  const s = (y - T1) / (T2 - T1); return ZT - 4 * (ZT - ZM) * s * (1 - s);
}
export function deckSVG(x: number, y0: number, y1: number) {
  let s = box(x, y0, 1.9, 2.0, y1 - y0, 0.4, '#b9a98f', { top: '#8d8478' });
  s += poly([iso(x + 0.7, y0, 2.31), iso(x + 1.3, y0, 2.31), iso(x + 1.3, y1, 2.31), iso(x + 0.7, y1, 2.31)], '#e3d6bd', 'stroke-width=".6"');
  s += ln(iso(x, y0, 2.6), iso(x, y1, 2.6), INK, 0.8) + ln(iso(x + 2, y0, 2.6), iso(x + 2, y1, 2.6), INK, 0.8);
  return s;
}
export function cablesSVG(xa: number, xb: number, ya: number, yb: number, ydeck: number) {
  let s = '';
  for (const cx of [xa, xb]) {
    const p: Pt[] = []; for (let y = ya; y <= yb + 1e-6; y += 0.2) p.push(iso(cx, y, cableZ(y)));
    for (let y = Math.max(ya, ydeck) + 0.2; y < yb; y += 0.45) { const z = cableZ(y); if (z > 2.7) s += ln(iso(cx, y, 2.3), iso(cx, y, z), '#6b625a', 0.55); }
    s += `<polyline points="${pts(p)}" fill="none" stroke-width="1.7"/>`;
  }
  return s;
}
function towerSVG(yc: number) {
  const x = 41.15, w = 2.7, d = 0.8, y = yc - d / 2, z0 = -0.5, h = 9.75;
  let s = box(40.95, y - 0.15, -0.65, 3.1, d + 0.3, 0.9, '#b7a487');
  s += box(x, y, z0, w, d, h, C_STONE, { top: '#d9c8ab' });
  const F = faceL(x, y, z0, w, d), FR = faceR(x, y, z0, w, d);
  for (const [u0, u1] of [[0.4, 1.15], [1.55, 2.3]]) { const um = (u0 + u1) / 2; s += poly([F.at(u0, 2.8), F.at(u1, 2.8), F.at(u1, 6.7), F.at(um, 7.7), F.at(u0, 6.7)], '#dbe9f1'); }
  for (let v = 1.2; v < h; v += 1.3) s += ln(FR.at(0, v), FR.at(d, v), dk(C_STONE, 0.15), 0.6);
  s += box(x - 0.08, y - 0.08, z0 + h, w + 0.16, d + 0.16, 0.22, '#bfa98a');
  s += frect(F, 0.25, 8.0, w - 0.25, 8.5, dk(C_STONE, 0.08), 'stroke-width=".6"');
  return s;
}
export function bridgeSVG() {
  let s = '';
  s += deckSVG(41.5, 14, T1 - 0.4);
  s += cablesSVG(41.7, 43.3, 14, T1, 14);
  s += towerSVG(T1);
  s += deckSVG(41.5, T1 + 0.4, T2 - 0.4);
  s += cablesSVG(41.7, 43.3, T1, T2, T1 + 0.3);
  s += towerSVG(T2);
  s += deckSVG(41.5, T2 + 0.4, 22);
  s += cablesSVG(41.7, 43.3, T2, 22, T2);
  return s;
}
/** Scene AABB of the river span. */
export const BRIDGE_BOUNDS = { x0: 40.95, x1: 44.05, y0: 14, y1: 22, above: true };
