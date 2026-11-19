/* Real tax-lot data, generated per neighborhood by `pnpm lots <hood>` (see tools/areas.mjs):
   NYC PLUTO + Building Footprints, or OpenStreetMap footprints for Hoboken. */

export interface Lot {
  addr: string;
  /** house number (letters as hundredths: 5A = 5.01) */
  num: number;
  /** street frontage and depth of the building, in feet */
  front: number | null;
  depth: number | null;
  /** storeys; a .5 means an attic storey (e.g. 2.5 = Federal house with dormers) */
  floors: number | null;
  /** roof height in feet */
  roof: number | null;
  year: number | null;
  /** PLUTO building class, e.g. C7 = walk-up with stores, S3 = 3-family with store, D = elevator apartments */
  cls: string;
  corner: boolean;
  /** id of the pizzeria on this lot */
  place?: string;
  /** floors estimated (no source data) */
  est?: boolean;
}
/** All fetched lots on one street, both sides, in house-number order. */
export type Street = Lot[];

/** One lot by house number, e.g. lot(V['BLEECKER STREET'], 323). */
export function lot(street: Street, houseNo: number): Lot {
  const l = street.find(l => l.num === houseNo);
  if (!l) throw new Error(`No lot ${houseNo} on that street (${street[0]?.addr ?? 'empty'})`);
  return l;
}
/**
 * One side of a street between two house numbers (inclusive), in the order you walk from `from` to `to`.
 * Side is picked by parity: NYC and Hoboken keep odd and even numbers on opposite sides.
 */
export function side(street: Street, from: number, to: number): Lot[] {
  const odd = Math.floor(from) % 2 === 1, lo = Math.min(from, to), hi = Math.max(from, to);
  const out = street.filter(l => Math.floor(l.num) % 2 === (odd ? 1 : 0) && l.num >= lo && l.num <= hi);
  return from <= to ? out : out.reverse();
}
