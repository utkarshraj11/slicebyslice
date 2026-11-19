/* Real tax-lot data (NYC PLUTO + Building Footprints), generated per neighborhood by `pnpm lots <hood>`. */

export interface Lot {
  addr: string;
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
  /** this is the pizzeria's lot */
  place?: boolean;
}

export interface BlockFace { street: string; lots: Lot[] }

/** Find a lot on a block face by its house number, e.g. lot(V.mamas, '327'). */
export function lot(face: BlockFace, houseNo: string): Lot {
  const l = face.lots.find(l => l.addr.split(' ')[0] === houseNo);
  if (!l) throw new Error(`No lot ${houseNo} on ${face.street}`);
  return l;
}
