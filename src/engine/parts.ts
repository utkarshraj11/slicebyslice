/* Building parts, street furniture, people and vehicles, all as SVG strings. */
import {
  type Axis, type Face, INK, C_WIN, TREES, SHIRTS, PANTS, SKIN, HAIR, S,
  rnd, pick, iso, f1, poly, ln, mixc, lt, dk, box, faceL, faceR, frect, ftext, cyl, cone,
} from './iso';
import type { Style, Ground } from './styles';

export function windowsSVG(F: Face, cols: number, rows: number, v0: number, v1: number, ww: number, wh: number, c: string, litP = 0.13) {
  let s = ''; const du = F.L / cols, dv = (v1 - v0) / rows; ww = Math.min(ww, du - 0.18);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const uc = du * (i + 0.5), vc = v0 + dv * (j + 0.5);
    s += frect(F, uc - ww / 2, vc - wh / 2, uc + ww / 2, vc + wh / 2, rnd() < litP ? '#f6e2a0' : c, 'stroke-width=".55"');
  }
  return s;
}
export function awning(F: Face, u0: number, u1: number, v: number, colors: string[], { drop = 0.42, out = 0.62, n = 0 } = {}) {
  let s = ''; n = n || Math.max(4, Math.round((u1 - u0) / 0.32));
  for (let i = 0; i < n; i++) {
    const a = u0 + ((u1 - u0) * i) / n, b = u0 + ((u1 - u0) * (i + 1)) / n, c = colors[i % colors.length];
    s += poly([F.at(a, v), F.at(b, v), F.at(b, v - drop, out), F.at(a, v - drop, out)], c, 'stroke-width=".55"');
  }
  for (let i = 0; i < n; i++) {
    const a = u0 + ((u1 - u0) * i) / n, b = u0 + ((u1 - u0) * (i + 1)) / n, c = colors[i % colors.length];
    s += poly([F.at(a, v - drop, out), F.at(b, v - drop, out), F.at(b, v - drop - 0.2, out), F.at(a, v - drop - 0.2, out)], c, 'stroke-width=".55"');
  }
  return s;
}

export interface StorefrontOpts {
  h?: number; base?: string; wall?: string; glass?: string; door?: string; doorU?: number;
  awn?: string[] | null; sign?: string | null; signH?: number; signBg?: string; signFg?: string; signSize?: number; font?: string;
}
export function storefront(F: Face, u0: number, u1: number, o: StorefrontOpts = {}) {
  let s = ''; const h = o.h || 1.3;
  s += frect(F, u0, 0, u1, h + 0.1, o.base || dk(o.wall || '#e0d6c4', 0.04), 'stroke-width=".6"');
  s += frect(F, u0 + 0.12, 0.18, u1 - 0.12, h - 0.12, o.glass || '#cfe3ee', 'stroke-width=".7"');
  const n = Math.max(2, Math.round((u1 - u0) / 0.75));
  for (let i = 1; i < n; i++) { const u = u0 + 0.12 + ((u1 - u0 - 0.24) * i) / n; s += ln(F.at(u, 0.18), F.at(u, h - 0.12), INK, 0.55); }
  const du = o.doorU ?? u0 + (u1 - u0) * 0.78;
  s += frect(F, du - 0.2, 0, du + 0.2, h - 0.05, o.door || '#5b3d2e', 'stroke-width=".7"');
  if (o.awn) s += awning(F, u0 + 0.04, u1 - 0.04, h + 0.62, o.awn);
  if (o.sign) {
    const v = h + (o.awn ? 0.7 : 0.22), sh = o.signH || 0.56;
    s += frect(F, u0 + 0.06, v, u1 - 0.06, v + sh, o.signBg || '#fff6e6', 'stroke-width=".8"');
    s += ftext(F, (u0 + u1) / 2, v + sh / 2, o.sign, o.signSize || 7.2, o.signFg || INK, { font: o.font });
  }
  return s;
}
export function fireEscape(F: Face, u0: number, u1: number, v0: number, fh: number, n: number) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const v = v0 + i * fh;
    s += poly([F.at(u0, v), F.at(u1, v), F.at(u1, v, 0.35), F.at(u0, v, 0.35)], '#3b3836', 'stroke-width=".5"');
    s += ln(F.at(u0, v + 0.38, 0.35), F.at(u1, v + 0.38, 0.35), '#3b3836', 0.6);
    if (i < n - 1) s += ln(F.at(u0 + 0.15, v, 0.3), F.at(u1 - 0.15, v + fh, 0.3), '#3b3836', 0.8);
  }
  return s;
}
export function waterTower(x: number, y: number, z: number) {
  let s = ''; const r = 0.38;
  for (const [dx, dy] of [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]]) s += ln(iso(x + dx, y + dy, z), iso(x + dx * 0.85, y + dy * 0.85, z + 0.5), INK, 1.1);
  s += cyl(x, y, z + 0.5, r, 0.75, '#b07d52', '#9a6a44');
  const b = iso(x, y, z + 0.5), rx = 1.2247 * r * S, ry = 0.7071 * r * S;
  for (const k of [0.25, 0.52]) { const yy = b[1] - k * S; s += `<path d="M${f1(b[0] - rx)} ${f1(yy)}A${f1(rx)} ${f1(ry)} 0 0 0 ${f1(b[0] + rx)} ${f1(yy)}" fill="none" stroke-width=".6"/>`; }
  s += cone(x, y, z + 1.25, r * 1.06, 0.4, '#8b5f3e');
  return s;
}

export interface BldOpts {
  roof?: string; g0?: number; fh?: number; win?: string; glass?: boolean; lit?: number;
  noWinL?: boolean; noWinR?: boolean; colsL?: number; colsR?: number; ww?: number; wh?: number;
  door?: 'L' | 'R'; stoop?: 'L'; fire?: 'L' | 'R';
  extraFaces?: (FL: Face, FR: Face) => string; extraTop?: string;
  cornice?: boolean; corniceC?: string; tower?: boolean; tu?: number; tv?: number; chimney?: boolean;
  /* styled buildings (styles.ts) */
  style?: Style; floors?: number; ground?: Ground; fronts?: 'L' | 'R' | 'LR'; trim?: string; ghost?: boolean;
  /** stable key (the street address) for per-building colour choices */
  key?: string;
}
export function bld(x: number, y: number, w: number, d: number, h: number, c: string, o: BldOpts = {}) {
  let s = '';
  const roof = o.roof || mixc(c, '#ebe6dc', 0.6);
  s += box(x, y, 0, w, d, h, c, { top: roof });
  const FL = faceL(x, y, 0, w, d), FR = faceR(x, y, 0, w, d);
  const g0 = o.g0 ?? 0.45, fh = o.fh || 1.1;
  const nf = Math.max(1, Math.floor((h - g0 - 0.3) / fh + 0.02));
  const win = o.win || C_WIN;
  if (o.glass) {
    for (const F of [FL, FR]) {
      const n = Math.max(2, Math.round(F.L / 0.45));
      for (let i = 1; i < n; i++) { const u = (F.L * i) / n; s += ln(F.at(u, 0.2), F.at(u, h - 0.15), dk(c, 0.18), 0.5); }
      for (let v = 0.2; v < h - 0.2; v += 0.62) s += ln(F.at(0, v), F.at(F.L, v), lt(c, 0.45), 0.9, 'stroke-opacity=".9"');
    }
  } else {
    if (!o.noWinL) s += windowsSVG(FL, o.colsL || Math.max(1, Math.round(w / 0.95)), nf, g0, g0 + nf * fh, o.ww || 0.34, o.wh || 0.52, win, o.lit);
    if (!o.noWinR) s += windowsSVG(FR, o.colsR || Math.max(1, Math.round(d / 0.95)), nf, g0, g0 + nf * fh, o.ww || 0.34, o.wh || 0.52, win, o.lit);
  }
  if (o.door === 'L') s += frect(FL, w * 0.5 - 0.2, 0, w * 0.5 + 0.2, 0.85, '#5b3d2e', 'stroke-width=".6"');
  if (o.door === 'R') s += frect(FR, d * 0.5 - 0.2, 0, d * 0.5 + 0.2, 0.85, '#5b3d2e', 'stroke-width=".6"');
  if (o.stoop === 'L') {
    const u = w * 0.32; s += frect(FL, u - 0.22, 0.55, u + 0.22, 1.45, '#4a3428', 'stroke-width=".6"');
    for (let k = 0; k < 3; k++) s += box(x + u - 0.28, y + d + 0.15 * (2 - k), 0.18 * k, 0.56, 0.18 + 0.15 * k, 0.18, '#9a8a76', { top: '#bfb19c' });
  }
  if (o.fire) { const F = o.fire === 'L' ? FL : FR; s += fireEscape(F, F.L * 0.55, F.L * 0.92, g0 + fh * 0.95, fh, Math.max(1, nf - 1)); }
  if (o.extraFaces) s += o.extraFaces(FL, FR);
  if (o.cornice !== false) s += box(x - 0.07, y - 0.07, h - 0.02, w + 0.14, d + 0.14, 0.17, o.corniceC || dk(c, 0.12), { top: roof });
  if (o.tower) s += waterTower(x + w * (o.tu ?? 0.35), y + d * (o.tv ?? 0.4), h + 0.15);
  if (o.chimney) s += box(x + w * 0.7, y + d * 0.2, h, 0.35, 0.35, 0.7, '#9c4f3c');
  if (o.extraTop) s += o.extraTop;
  return s;
}
export function houseSVG(x: number, y: number, w: number, d: number, h: number, c: string, rc: string) {
  let s = box(x, y, 0, w, d, h, c, { noTop: true });
  const rh = 1.0, ym = y + d / 2;
  const A = iso(x - 0.1, y - 0.1, h), B = iso(x + w + 0.1, y - 0.1, h), Cc = iso(x + w + 0.1, y + d + 0.1, h), D = iso(x - 0.1, y + d + 0.1, h), R0 = iso(x - 0.1, ym, h + rh), R1 = iso(x + w + 0.1, ym, h + rh);
  s += poly([A, B, R1, R0], dk(rc, 0.12));
  s += poly([iso(x + w, y, h), iso(x + w, ym, h + rh), iso(x + w, y + d, h)], lt(c, 0.04));
  s += poly([R0, R1, Cc, D], rc);
  const FL = faceL(x, y, 0, w, d), FR = faceR(x, y, 0, w, d);
  s += frect(FL, w * 0.22 - 0.2, 0, w * 0.22 + 0.2, 0.95, '#6b4a36', 'stroke-width=".6"');
  s += frect(FL, w * 0.55, 0.45, w * 0.85, 0.95, C_WIN, 'stroke-width=".55"');
  s += frect(FL, w * 0.15, 1.35, w * 0.45, 1.85, C_WIN, 'stroke-width=".55"');
  s += frect(FL, w * 0.58, 1.35, w * 0.88, 1.85, C_WIN, 'stroke-width=".55"');
  s += frect(FR, d * 0.25, 0.5, d * 0.5, 1.0, C_WIN, 'stroke-width=".55"');
  s += frect(FR, d * 0.38, h + 0.15, d * 0.62, h + 0.55, C_WIN, 'stroke-width=".55"');
  return s;
}

/* --- street furniture & life --- */
export function treeSVG(x: number, y: number, s = 1, c?: string) {
  c = c || pick(TREES);
  const b = iso(x, y, 0), t = iso(x, y, 1.05 * s), R = 0.55 * S * s;
  return `<ellipse cx="${f1(b[0])}" cy="${f1(b[1])}" rx="${f1(R * 0.95)}" ry="${f1(R * 0.45)}" fill="rgba(70,55,30,.13)" stroke="none"/>` +
    ln(b, [t[0], t[1] + R * 0.25], '#7a5236', 2.6 * s) +
    `<circle cx="${f1(t[0] - R * 0.45)}" cy="${f1(t[1] + R * 0.05)}" r="${f1(R * 0.62)}" fill="${dk(c, 0.1)}"/>` +
    `<circle cx="${f1(t[0] + R * 0.42)}" cy="${f1(t[1] + R * 0.1)}" r="${f1(R * 0.6)}" fill="${dk(c, 0.05)}"/>` +
    `<circle cx="${f1(t[0])}" cy="${f1(t[1] - R * 0.35)}" r="${f1(R * 0.72)}" fill="${c}"/>` +
    `<circle cx="${f1(t[0] - R * 0.22)}" cy="${f1(t[1] - R * 0.6)}" r="${f1(R * 0.24)}" fill="${lt(c, 0.3)}" stroke="none"/>`;
}
export function lampSVG(x: number, y: number) {
  const b = iso(x, y, 0), t = iso(x, y, 1.45);
  return ln(b, t, INK, 1.3) + `<circle cx="${f1(t[0])}" cy="${f1(t[1])}" r="2.1" fill="#fff1b8" stroke-width=".8"/>`;
}
export const benchSVG = (x: number, y: number, axis: Axis) =>
  axis === 'x' ? box(x - 0.35, y - 0.11, 0, 0.7, 0.22, 0.22, '#a2724a') : box(x - 0.11, y - 0.35, 0, 0.22, 0.7, 0.22, '#a2724a');
export const hydrantSVG = (x: number, y: number) => cyl(x, y, 0, 0.07, 0.24, '#d9473a', '#e86a5c', 'stroke-width=".6"');

export interface PersonOpts { shirt?: string; pants?: string; skin?: string; hair?: string }
export function personSVG(o: PersonOpts = {}) {
  const shirt = o.shirt || pick(SHIRTS), pants = o.pants || pick(PANTS), skin = o.skin || pick(SKIN), hair = o.hair || pick(HAIR);
  return `<ellipse cx="0" cy="0" rx="3.4" ry="1.5" fill="rgba(0,0,0,.13)" stroke="none"/>` +
    `<path d="M-1.5 -.4L-1.3 -6.6M1.5 -.4L1.3 -6.6" stroke="${pants}" stroke-width="2.2"/>` +
    `<rect x="-2.9" y="-13.6" width="5.8" height="8.2" rx="2.4" fill="${shirt}" stroke-width=".7"/>` +
    `<circle cx="0" cy="-16.4" r="2.8" fill="${skin}" stroke-width=".7"/>` +
    `<path d="M-2.85 -16.6a2.85 2.85 0 0 1 5.7 0z" fill="${hair}" stroke="none"/>`;
}

export interface CarOpts { len?: number; bus?: boolean; taxi?: boolean; z?: number; onTop?: boolean }
export function carSVG(axis: Axis, color: string, o: CarOpts = {}) {
  const L = o.len || 1.5, Wd = 0.78, [w, d] = axis === 'x' ? [L, Wd] : [Wd, L];
  let s = `<ellipse cx="0" cy="3" rx="${axis === 'x' ? 20 : 16}" ry="7" fill="rgba(0,0,0,.12)" stroke="none"/>`;
  s += box(-w / 2, -d / 2, 0.14, w, d, 0.36, color);
  if (o.bus) {
    s = `<ellipse cx="0" cy="3" rx="28" ry="10" fill="rgba(0,0,0,.12)" stroke="none"/>` + box(-w / 2, -d / 2, 0.14, w, d, 0.9, color, { top: '#f4f4f4' });
    const F = axis === 'x' ? faceL(-w / 2, -d / 2, 0.14, w, d) : faceR(-w / 2, -d / 2, 0.14, w, d);
    for (let u = 0.25; u < F.L - 0.3; u += 0.42) s += frect(F, u, 0.42, u + 0.32, 0.72, '#bfd9ea', 'stroke-width=".5"');
    s += frect(F, 0.1, 0.12, F.L - 0.1, 0.24, '#3f7fbf', 'stroke="none"');
  } else {
    const cw = axis === 'x' ? 0.78 : Wd * 0.84, cd = axis === 'x' ? Wd * 0.84 : 0.78;
    s += box(-cw / 2 - (axis === 'x' ? 0.1 : 0), -cd / 2 - (axis === 'y' ? 0.1 : 0), 0.5, cw, cd, 0.27, color, { L: '#bcd8ea', R: '#a7c7de', top: lt(color, 0.2) });
    if (o.taxi) { const p = iso(-(axis === 'x' ? 0.1 : 0), -(axis === 'y' ? 0.1 : 0), 0.8); s += `<rect x="${f1(p[0] - 3)}" y="${f1(p[1] - 3)}" width="6" height="3" rx="1" fill="#fff8d8" stroke-width=".6"/>`; }
  }
  const wz = 0.14;
  const wh = (x: number, y: number) => { const p = iso(x, y, wz); return `<ellipse cx="${f1(p[0])}" cy="${f1(p[1])}" rx="2.6" ry="2.6" fill="#2b2a2a" stroke="none"/>`; };
  if (axis === 'x') s += wh(-w / 2 + 0.32, d / 2) + wh(w / 2 - 0.32, d / 2) + wh(w / 2, -d / 2 + 0.2);
  else s += wh(w / 2, -d / 2 + 0.32) + wh(w / 2, d / 2 - 0.32) + wh(-w / 2 + 0.2, d / 2);
  return s;
}
export function boatSVG(kind: 'ferry' | 'tour' | 'tug') {
  let s = '';
  if (kind === 'ferry') { // axis y
    s += `<ellipse cx="0" cy="6" rx="38" ry="14" fill="#e6f3fb" stroke="none" opacity=".7"/>`;
    s += box(-0.65, -1.8, -0.5, 1.3, 3.6, 0.42, '#e8792f', { top: '#f4a463' });
    s += box(-0.5, -1.3, -0.08, 1.0, 2.6, 0.42, '#f6efe3', { R: '#e2d8c8' });
    const F = faceR(-0.5, -1.3, -0.08, 1.0, 2.6); for (let u = 0.2; u < 2.4; u += 0.34) s += frect(F, u, 0.14, u + 0.22, 0.3, '#9cc4dc', 'stroke-width=".5"');
    s += box(-0.3, -0.5, 0.34, 0.6, 1.0, 0.3, '#e8792f', { top: '#f4a463' });
    s += cyl(0, 0.15, 0.64, 0.12, 0.35, '#3b3836');
  } else if (kind === 'tour') { // axis x
    s += `<ellipse cx="-6" cy="6" rx="34" ry="11" fill="#e6f3fb" stroke="none" opacity=".7"/>`;
    s += box(-1.4, -0.5, -0.5, 2.8, 1.0, 0.4, '#f7f5f0', { L: '#2f6fb0' });
    s += box(-1.0, -0.38, -0.1, 2.0, 0.76, 0.38, '#f7f5f0');
    const F = faceL(-1.0, -0.38, -0.1, 2.0, 0.76); for (let u = 0.12; u < 1.85; u += 0.3) s += frect(F, u, 0.12, u + 0.2, 0.28, '#9cc4dc', 'stroke-width=".5"');
    s += box(-0.4, -0.25, 0.28, 0.9, 0.5, 0.25, '#f7f5f0', { top: '#d9473a' });
  } else { // tug, axis x
    s += `<ellipse cx="-4" cy="5" rx="22" ry="8" fill="#e6f3fb" stroke="none" opacity=".7"/>`;
    s += box(-0.8, -0.38, -0.5, 1.6, 0.76, 0.42, '#c0392b', { top: '#3b3836' });
    s += box(-0.35, -0.26, -0.08, 0.75, 0.52, 0.42, '#f2c230');
    s += cyl(0.05, 0, 0.34, 0.1, 0.32, '#3b3836');
  }
  return s;
}
export function cloudSVG(w: number) {
  const h = w * 0.32;
  return `<path d="M${-w / 2} ${h * 0.2}c${-w * 0.08} ${-h * 0.6} ${w * 0.12} ${-h * 0.9} ${w * 0.22} ${-h * 0.55}c${w * 0.05} ${-h * 0.75} ${w * 0.32} ${-h * 0.85} ${w * 0.38} ${-h * 0.2}c${w * 0.12} ${-h * 0.5} ${w * 0.34} ${-h * 0.25} ${w * 0.3} ${h * 0.25}c${w * 0.12} ${h * 0.1} ${w * 0.06} ${h * 0.55} ${-w * 0.08} ${h * 0.5}h${-w * 0.74}c${-w * 0.12} 0 ${-w * 0.14} ${-h * 0.45} ${-w * 0.08} ${-h * 0.5}z" fill="#ffffff" stroke-width="1.2" opacity=".96"/>`;
}
