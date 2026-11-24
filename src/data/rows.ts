/* Each pizzeria and the buildings either side of it, as they stand, left to right as seen from the street in front.
   Frontage, depth (metres) and storeys come from the tax records and footprints (NYC PLUTO and Building Footprints, NJ
   MOD-IV parcels and OpenStreetMap: `node tools/fetch-real.mjs` prints them); walls, windows, shopfronts and awnings are
   read off street photos (Mapillary and Wikimedia Commons, CC BY-SA). The map builds them true to width and storeys
   (towers compressed like the rest of the skyline) and crops a neighbour where the map's block is shorter than the
   real one. Roof colours are the aerial photo's (src/data/real.json).

   look: style brick (lintels, sills) | brown (pale trims) | stone (string courses) | glass; bays = windows across a
   storey; band = shopfront sign band(s), one per shop; escape = fire escape iron; winAwn = awnings over the windows. */
import type { Row } from '../world/kit';

export const ROWS: Record<string, Row> = {
  // Washington St, west side, between 6th and 7th (Mapillary, Sept 2020)
  bennys: {
    left: [{ addr: '618 Washington St', w: 13.3, d: 18, storeys: 3, wall: '#cdc5b8', roof: '#b4bcaf', cornice: '#a99f92',
      look: { style: 'stone', bays: 6, trim: '#e9e2d6', band: ['#232326', '#232326'], frame: '#2b2b2e' } }], // painted, two-storey bays, black shop signs
    self: { addr: '622 Washington St', w: 6.9, d: 18, storeys: 3, wall: '#b4513b', roof: '#a7aea1', cornice: null,
      look: { bays: 3, winAwn: '#2f5d3c', band: '#b8322a', frame: '#b4a58c' }, // red brick, green awnings on every window, stone-clad shop
      sign: "BENNY TUDINO'S", awn: ['#8a2b2b', '#8a2b2b'] },
    right: [{ addr: '624 Washington St', w: 4.6, d: 18, storeys: 3, wall: '#bdb3a4', roof: '#74786e', cornice: null,
      look: { bays: 2, band: '#1e2126', frame: '#2b2e33' }, awn: ['#1e2126', '#1e2126'] }], // buff brick, Hoboken Lock & Supply
  },
  // Washington St, east side, at the Newark St corner (Mapillary, Sept 2020)
  basiles: {
    corner: 'right',
    left: [{ addr: '91 Washington St', w: 8.1, d: 18, storeys: 4, wall: '#a5463c', roof: '#bec1b6', cornice: '#3f322c',
      look: { bays: 3, trim: '#e3d9c8', band: '#1f1f22', frame: '#2a2a2d' }, awn: ['#9a3b2b', '#9a3b2b'] }], // tiled canopy over Curry Up Now
    self: { addr: '89 Washington St', w: 8.1, d: 31.6, storeys: 3, wall: '#b24b41', roof: '#e2e8da', cornice: '#463630',
      look: { bays: 3, trim: '#ece4d4', band: '#a82219', frame: '#8c1d17' }, // painted red brick, the shop wraps the corner
      sign: "BASILE'S", awn: ['#2f6b4f', '#f4efe3'] },
    right: [],
  },
  // Monroe St, west side: Monroe Center, an old factory in three parts along the block (Mapillary, Sept 2020)
  panello: {
    maxD: 3.2,
    left: [
      { addr: '720 Monroe St, glass atrium', w: 10, d: 14, storeys: 5, wall: '#a8bfcc', roof: '#c9d3d6', cornice: null, look: { style: 'glass', trim: '#a13b2c' } },
      { addr: '720 Monroe St, Art Deco loft', w: 40, d: 40, storeys: 5, wall: '#c9a979', roof: '#a6a085', cornice: null, look: { style: 'stone', bays: 8, trim: '#8e949a' } },
    ],
    self: { addr: '720 Monroe St, brick loft', w: 24, d: 30, storeys: 5, wall: '#9b4737', roof: '#a6a085', cornice: null,
      look: { bays: 6, trim: '#d8cfc2', band: ['#2d5a3d', '#2d5a3d', '#2d5a3d'], frame: '#5a2a22' }, // big steel loft windows, green awnings
      sign: 'PANELLO', awn: ['#2d5a3d', '#2d5a3d'], shopAt: [0, 6] },
    right: [],
  },
  // 8th Ave, west side, at W 57th St: the base of Central Park Place (Commons 2023; Mapillary 2019)
  pops: {
    corner: 'left',
    left: [],
    self: { addr: '301 W 57th St (975 8th Ave)', w: 29.3, d: 30, storeys: 56, wall: '#3e4a48', roof: '#858784', cornice: null,
      look: { style: 'glass', trim: '#2c3533', band: '#b0302a', frame: '#2a2d2e' }, // dark green-grey tower
      sign: "POP'S PIZZA", awn: ['#d9473a', '#fff6e6'], shopAt: [14, 20] },
    // the real neighbour, 4 Columbus Circle (8 storeys of granite and glass offices), would stand where the map's block
    // already ends at Central Park South: the map has no 58th St
    right: [],
  },
  // W 38th St, north side, between 7th and 8th (Mapillary 2014 and 2020; Lazzara's own facade not seen in a photo)
  lazzaras: {
    left: [{ addr: '223 W 38th St (post office)', w: 30, d: 27, storeys: 2, wall: '#d3cdc1', roof: '#515e68', cornice: '#bdb6a9',
      look: { style: 'stone', bays: 8, band: '#2c4f8c', frame: '#3b3f45' } }],
    self: { addr: '221 W 38th St', w: 6.4, d: 16, storeys: 5, wall: '#b48a63', roof: '#324452', cornice: '#6e5a48',
      look: { bays: 3, band: '#2f3a48' }, sign: "LAZZARA'S", awn: ['#2f3a48', '#efe1c8'] },
    right: [{ addr: '209 W 38th St', w: 36.3, d: 27, storeys: 12, wall: '#d8d0c0', roof: '#2a3b49', cornice: '#bfb6a5',
      look: { style: 'stone', bays: 10, band: '#3a3a3a' } }], // pale loft building
  },
  // Christopher St, south side, between Bleecker and Bedford (storeys and widths from the records; facades not seen in a photo)
  lindustrie: {
    left: [{ addr: '98 Christopher St', w: 8.3, d: 16, storeys: 6, wall: '#a65a42', roof: '#636c73', look: { bays: 3, band: '#2f3a48', escape: '#2b2724' } }],
    self: { addr: '100-104 Christopher St', w: 21.4, d: 20, storeys: 5, wall: '#8f4c3a', roof: '#c5c5c3', cornice: '#4f3c33',
      look: { bays: 6, band: ['#2f3a48', '#5b3d2e', '#2f3a48'], escape: '#2b2724' },
      sign: "L'INDUSTRIE", awn: ['#2f3a48', '#f4efe3'], shopAt: [15.4, 21.4] },
    right: [{ addr: '106 Christopher St', w: 17.4, d: 22, storeys: 5, wall: '#c2a27c', roof: '#c1c1c0', look: { bays: 5, band: '#5b3d2e' } }],
  },
  // Bleecker St, east side, at the Christopher St corner (Mapillary, July 2018)
  mamas: {
    corner: 'left',
    left: [],
    self: { addr: '323-325 Bleecker St', w: 11.7, d: 19, storeys: 6, wall: '#c65a43', roof: '#b3aeab', cornice: '#5b3a30',
      look: { bays: 4, trim: '#d9cbb8', band: '#efe6d6', frame: '#3a3a3d' }, // red-painted brick on the corner
      sign: "MAMA'S TOO", awn: ['#d9473a', '#fff6e6'] },
    right: [{ addr: '317 Bleecker St', w: 22.2, d: 30, storeys: 6, wall: '#d8c49c', roof: '#9e9b9a', cornice: '#9c8a6c',
      look: { bays: 8, trim: '#efe5cf', band: '#a8363e', escape: '#3f7a52' } }], // buff brick, green fire escapes
  },
  // Bleecker St, west side, between Morton and Jones (Commons, 2021 and Sept 2022)
  johns: {
    left: [],
    self: { addr: '272-278 Bleecker St', w: 22.4, d: 15.5, storeys: 6, wall: '#7c3a2c', roof: '#c0c2c2', cornice: '#5a463c',
      look: { bays: 7, trim: '#e4ddcf', band: '#8e1f25', frame: '#7a1c22', escape: '#2b2724' }, // dark brick, pale stone bands, to the Morton St corner
      sign: "JOHN'S", signFg: '#b8322a', awn: ['#6f1d27', '#6f1d27'], shopAt: [15.4, 22.4] },
    right: [{ addr: '280 Bleecker St', w: 7.5, d: 12, storeys: 4, wall: '#ebe5d8', roof: '#5f686d', cornice: '#8a2a2a',
      look: { style: 'stone', bays: 3, trim: '#d6cfc2', band: '#2f6b4f', escape: '#8a2a2a' }, awn: ['#2f6b4f', '#2f6b4f'] }], // white, red cornice and fire escape
  },
  // Carmine St, north side, by Sixth Ave (Commons, 2022; Mapillary 2014)
  joes: {
    corner: 'right',
    left: [{ addr: '11 Carmine St', w: 7.5, d: 27, storeys: 5, wall: '#c29a6c', roof: '#bbbbbd', cornice: '#7d6448',
      look: { bays: 3, trim: '#e8dcc4', band: '#3a3a3d' } }], // buff brick
    self: { addr: '7 Carmine St', w: 13.2, d: 26, storeys: 5, wall: '#8d4b39', roof: '#7b797c', cornice: '#4a3830',
      look: { bays: 5, band: ['#f3eee4', '#3f6e8c'], frame: '#2e2b29', escape: '#2b2724' },
      sign: "JOE'S PIZZA", signFg: '#c0302a', awn: ['#6d2a2c', '#6d2a2c'], shopAt: [2.5, 8] },
    right: [{ addr: '301 Sixth Ave', w: 11, d: 15.5, storeys: 3, wall: '#c8a26b', roof: '#7e838d', cornice: null, hip: '#7fa392',
      look: { bays: 4, band: '#1f4f8a' } }], // yellow brick, green copper roof, on the Sixth Ave corner
  },
  // Wall St, south side, between Pearl and Hanover: the foot of 63 Wall St (Commons, 2025 and 2026)
  upside: {
    left: [{ addr: '67 Wall St', w: 43.9, d: 40, storeys: 25, wall: '#6b5446', roof: '#535458', cornice: null,
      look: { style: 'stone', bays: 12, trim: '#5a463a', band: '#3a3330', frame: '#2e2a28' } }], // brown brick tower
    self: { addr: '63 Wall St (65 Wall St)', w: 34.3, d: 40, storeys: 37, wall: '#6e5444', roof: '#5a5450', cornice: null,
      look: { style: 'stone', bays: 10, trim: '#5c463a', band: '#d9473a', frame: '#3a302b' }, // dark brown brick, Art Deco
      sign: 'UPSIDE', awn: ['#d9473a', '#d9473a'], shopAt: [0, 6] },
    right: [],
  },
  // Water St, south side, at the Old Fulton St corner, under the Brooklyn Bridge (Mapillary, Aug 2023)
  ignazios: {
    corner: 'right',
    left: [],
    self: { addr: '4 Water St', w: 19.5, d: 15, storeys: 6, wall: '#9b4a39', roof: '#8a8b88', cornice: '#5b4f45',
      look: { bays: 6, trim: '#e3d9c8', band: '#2f6b4f', frame: '#3a2e28' }, // red brick warehouse, now flats
      sign: "IGNAZIO'S", awn: ['#2f6b4f', '#f4efe3'], shopAt: [13.5, 19.5] },
    right: [],
  },
  // Front St, north side, at the Old Fulton St corner: the 1869 Long Island Safe Deposit Co. building (Commons, 2023)
  grimaldis: {
    corner: 'left',
    left: [],
    self: { addr: '1 Front St', w: 11.8, d: 10.4, storeys: 2, h: 3.5, wall: '#ecebe6', roof: '#a3a7a7', cornice: '#dedcd5',
      look: { style: 'stone', rows: 2, bays: 3, trim: '#c9c7c0' }, shop: false, // white cast iron, tall arched windows on both floors
      sign: "GRIMALDI'S", awn: null, shopAt: [0, 5] }, // its door is on the corner
    right: [{ addr: '5 Front St', w: 8.7, d: 20, storeys: 3, wall: '#a24d3a', roof: '#717980', cornice: '#e6dccb',
      look: { bays: 3, band: '#6b4a35', frame: '#3a2e28' }, awn: ['#8a6a4a', '#8a6a4a'] }], // red brick, 1834
  },
  // Avenue J, south side, at the E 15th St corner (Mapillary, Nov 2019)
  difara: {
    corner: 'left',
    left: [],
    self: { addr: '1424 Avenue J', w: 5.9, d: 20, storeys: 4, wall: '#8a5040', roof: '#cacbca', cornice: '#5b4f45',
      look: { bays: 2, band: '#f1ece2', frame: '#3a2e28' }, // brown brick on the corner
      sign: 'DI FARA', awn: ['#7a2e2a', '#efe1c8'] },
    right: [{ addr: '1422 Avenue J', w: 6, d: 17, storeys: 3, wall: '#b9ad9a', roof: '#d9d7d5', cornice: '#8a7f74', look: { bays: 2, band: '#3a3a3d' } }],
  },
};
