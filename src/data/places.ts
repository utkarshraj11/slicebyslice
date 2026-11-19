/* =====================================================================
   YOUR REVIEWS LIVE HERE
   For each spot fill in:
     rating : a number out of RATING_MAX (e.g. 8.5); leave null until you decide
     review : your write-up (plain text, line breaks are kept)
     photos : up to two images, e.g. "photos/joes-1.jpg" (files in public/photos/)
   ===================================================================== */
export const RATING_MAX = 10;

export type HoodId = 'hoboken' | 'midtown' | 'village' | 'fidi' | 'dumbo' | 'midwood';

export interface Place {
  id: string;
  hood: HoodId;
  name: string;
  address: string;
  rating: number | null;
  review: string;
  photos: [string | null, string | null];
}

export interface Hood { name: string; sub: string; color: string }

export const PLACES: Place[] = [
  { id: 'bennys', hood: 'hoboken', name: "Benny Tudino's", address: '622 Washington St, Hoboken, NJ 07030', rating: null, review: '', photos: [null, null] },
  { id: 'basiles', hood: 'hoboken', name: "Basile's Pizza", address: '89 Washington St, Hoboken, NJ 07030', rating: null, review: '', photos: [null, null] },
  { id: 'panello', hood: 'hoboken', name: 'Panello', address: '720 Monroe St, Hoboken, NJ 07030', rating: null, review: '', photos: [null, null] },
  { id: 'pops', hood: 'midtown', name: "Pop's Pizza", address: '975 8th Ave, New York, NY 10019', rating: null, review: '', photos: [null, null] },
  { id: 'lazzaras', hood: 'midtown', name: "Lazzara's Pizza Cafe", address: '221 W 38th St (2nd floor), New York, NY 10018', rating: null, review: '', photos: [null, null] },
  { id: 'lindustrie', hood: 'village', name: "L'Industrie Pizzeria", address: '104 Christopher St, New York, NY 10014', rating: null, review: '', photos: [null, null] },
  { id: 'mamas', hood: 'village', name: "Mama's Too", address: '325 Bleecker St, New York, NY 10014', rating: null, review: '', photos: [null, null] },
  { id: 'johns', hood: 'village', name: "John's of Bleecker Street", address: '278 Bleecker St, New York, NY 10014', rating: null, review: '', photos: [null, null] },
  { id: 'joes', hood: 'village', name: "Joe's Pizza", address: '7 Carmine St, New York, NY 10014', rating: null, review: '', photos: [null, null] },
  { id: 'upside', hood: 'fidi', name: 'Upside Pizza', address: '65 Wall St, New York, NY 10005', rating: null, review: '', photos: [null, null] },
  { id: 'ignazios', hood: 'dumbo', name: "Ignazio's Pizza", address: '4 Water St, Brooklyn, NY 11201', rating: null, review: '', photos: [null, null] },
  { id: 'grimaldis', hood: 'dumbo', name: "Grimaldi's Pizzeria", address: '1 Front St, Brooklyn, NY 11201', rating: null, review: '', photos: [null, null] },
  { id: 'difara', hood: 'midwood', name: 'Di Fara Pizza', address: '1424 Avenue J, Brooklyn, NY 11230', rating: null, review: '', photos: [null, null] },
];

export const HOODS: Record<HoodId, Hood> = {
  hoboken: { name: 'Hoboken', sub: 'New Jersey', color: '#7fb2d9' },
  midtown: { name: 'Midtown West', sub: 'Manhattan', color: '#f2c230' },
  village: { name: 'West Village', sub: 'Manhattan', color: '#e9806a' },
  fidi: { name: 'Financial District', sub: 'Manhattan', color: '#9fc28a' },
  dumbo: { name: 'DUMBO', sub: 'Brooklyn', color: '#c58ad1' },
  midwood: { name: 'Midwood', sub: 'Brooklyn', color: '#f0a35e' },
};
export const HOOD_IDS = Object.keys(HOODS) as HoodId[];
export const isHood = (s: string): s is HoodId => s in HOODS;

/** Order of the list's neighborhood groups (west to east, north to south). */
export const HOOD_ORDER: HoodId[] = ['hoboken', 'midtown', 'village', 'fidi', 'dumbo', 'midwood'];

/** Image src for a photo path; resolves relative paths against the app's base URL. */
export const photoSrc = (p: string) => (/^(data:|https?:|\/)/.test(p) ? p : import.meta.env.BASE_URL + p);
