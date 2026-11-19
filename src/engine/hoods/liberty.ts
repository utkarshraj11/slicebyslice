import { Tile } from '../tile';
import { C_GRASS, iso, f1, box } from '../iso';

export function buildLiberty(): Tile {
  const t=new Tile('liberty',116,36,6,{slab:C_GRASS,top:4});
  t.flat([[1.2,2.2],[2.2,1.2],[3.8,1.2],[4.8,2.2],[4.8,3.8],[3.8,4.8],[2.2,4.8],[1.2,3.8]],'#e3dccc');
  t.tree(.6,.7,.8); t.tree(5.3,.8,.8); t.tree(.7,5.3,.8);
  const X=t.X(2.5),Y=t.Y(2.5);
  let s=box(X,Y,0,1,1,1.3,'#e3dccc')+box(X+.15,Y+.15,1.3,.7,.7,.25,'#d6cfbe');
  const p=iso(X+.5,Y+.5,1.55);
  s+=`<g transform="translate(${f1(p[0])},${f1(p[1])})" stroke-width=".9">
    <path d="M-7 0 L-4.5 -26 L4.5 -26 L7 0 Z" fill="#7fb7a4"/>
    <path d="M-4 -6 L-3 -20 M2 -4 L1.5 -18" stroke="#5f9a87" fill="none"/>
    <path d="M3.5 -25 L8 -40" stroke="#7fb7a4" stroke-width="3.2"/>
    <rect x="6" y="-44" width="4" height="4" fill="#7fb7a4"/>
    <path d="M8 -44 q-3 -4 0 -8 q3 4 0 8z" fill="#f2c230"/>
    <rect x="-8" y="-20" width="4" height="6" fill="#7fb7a4" transform="rotate(-12 -6 -17)"/>
    <circle cx="0" cy="-29" r="3.6" fill="#7fb7a4"/>
    <path d="M-4 -31 l-3 -3 M-1.5 -32.5 l-1 -4 M1.5 -32.5 l1 -4 M4 -31 l3 -3" stroke="#5f9a87" fill="none"/>
  </g>`;
  t.add(2.5,2.5,3.5,3.5,s);
  t.crowd(1.6,3.9,2.8,.7,3);
  return t;
}
