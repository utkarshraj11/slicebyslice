# Slice by Slice: NYC + Hoboken pizza review map

A personal pizza-review site. It shows an animated, isometric, "drawn in code" map of New York City and Hoboken, inspired by an isometric San Francisco animation. Each neighborhood is a floating city block. Each pizzeria the owner visited is a storefront with a pin. Clicking a pin opens a review card with a rating, a written review and two photos.

It's a **Vite + React + TypeScript** app. (It started as a single `index.html`; that original is kept as `legacy.html` for reference.) The only outside resource is Google Fonts (Fraunces and DM Sans), and the page falls back to system fonts without it.

```bash
pnpm install
pnpm dev        # dev server
pnpm build      # typecheck + production build to dist/ (static, base './', host anywhere)
pnpm typecheck
pnpm lots <hood>   # refetch real building data for a neighborhood (NYC only), see "Real buildings"
```

```
index.html                 Vite entry (fonts + #root)
src/data/places.ts         RATING_MAX, PLACES, HOODS, TOUR: the content
src/data/lots.ts           Lot / BlockFace types + lot(face, houseNo) lookup
src/data/lots/<hood>.ts    GENERATED real lot data per neighborhood (pnpm lots <hood>); don't hand-edit
src/engine/iso.ts          iso math, seeded RNG, SVG-string primitives (box, faces, frect, ftext, cyl…)
src/engine/parts.ts        buildings, storefronts, trees, people, cars, boats, clouds
src/engine/styles.ts       building styles (rowhouse, tenement, loft, prewar) + real lot → drawing params
src/engine/tile.ts         class Tile (builder API) + Item/Mover/AABB types
src/engine/hoods/*.ts      one build<Neighborhood>() per tile (+ liberty decor)
src/engine/bridge.ts       Brooklyn Bridge geometry + river span
src/engine/water.ts        water outline + waves
src/engine/scene.ts        depth sorting (rel/topo/moverIndex), mounting tiles, pins, labels
src/engine/map.ts          createMap(): camera, pointer/wheel/pinch, animation loop
src/store.ts               UI state + actions (openPlace, focusHood, tour…) + hash routing
src/components/*.tsx       MapView, ReviewCard, ListPanel, HoodBar, Grain, icons
src/styles.css             all CSS
public/photos/             put review photos here (empty for now)
tools/preview.mjs          headless-Chrome screenshot/smoke-test script (Playwright)
tools/fetch-lots.mjs       pulls NYC GeoSearch + PLUTO + Building Footprints into src/data/lots/<hood>.ts
```

**React vs. engine split.** React renders only the chrome (header, buttons, card, list, hood bar) and an empty `<svg>` shell. The ~5k-element scene is built as SVG strings and mounted imperatively by `createMap()` in a `MapView` effect. Don't move the scene into JSX: per-frame mover re-slotting and the "never move tile nodes" rule depend on direct DOM control. State lives in `store.ts` (a tiny external store read with `useSyncExternalStore`), so the camera can read which panels are open synchronously when it refits. The map reports taps through callbacks, and the store calls `map.refit()`, `setActivePin()` and `setOverview()`. `mountScene()` reseeds the RNG, so builds are deterministic (and React StrictMode's double mount is harmless; `destroy()` empties the layers).

---

## Current state and open items

- All 13 places are on the map with **empty `rating`, `review` and `photos`**. The card shows "coming soon" placeholders. The owner still needs to supply this content.
- Ratings are assumed to be **out of 10** (`RATING_MAX`). The owner hasn't confirmed this scale.
- The owner said prices are hard to recall, so **prices were left out on purpose**.
- The owner said they "have changes". Ask what they are before refactoring anything.
- A previous version is published as a claude.ai artifact. That copy won't update automatically. Host `dist/` anywhere static, such as GitHub Pages, Netlify or Vercel.
- Known pre-existing quirk (also in the original): on mobile the hidden, empty neighborhood bar peeks out as a small blob above the bottom buttons.
- **Realism pilot (Nov 2026): only the West Village is built from real lot data.** DUMBO's two warehouses use the `loft` style; every other tile still uses the original invented buildings (`bld()`), so the Village is denser and taller than its neighbours until the rollout. Rollout order and open bits: Midtown/FiDi (`prewar`, `tenement`), DUMBO (`loft`), Midwood (needs a frame-house style), Hoboken (not in PLUTO: needs OpenStreetMap), Federal attic storeys with dormers (`floors` like 2.5) aren't drawn yet.

---

## Editing content (the most common task)

The review data is in `src/data/places.ts`, under the comment `YOUR REVIEWS LIVE HERE`:

```ts
export const RATING_MAX = 10;
export const PLACES: Place[] = [
  {id:'joes', hood:'village', name:"Joe's Pizza", address:"7 Carmine St, New York, NY 10014",
   rating:null, review:"", photos:[null,null]},
  ...
];
```

- `rating`: a number such as `8.5`, or `null`. Once it's set, the pin shows the number instead of the slice icon, the card fills in the slice meter, and "By rating" in the list ranks the place.
- `review`: plain text. Line breaks are kept (`white-space: pre-line`).
- `photos`: up to two image sources. Put files in `public/photos/` and use relative paths like `"photos/joes-1.jpg"` (resolved against the app's base URL by `photoSrc`), or `data:` URLs. Resize photos to about 1200px wide and under 300KB each.
- `id` is also the deep link. `#joes` opens that review directly. `#village`, `#dumbo` and the other neighborhood ids open a neighborhood.
- `hood` must be a key of `HOODS`: `hoboken`, `midtown`, `village`, `fidi`, `dumbo` or `midwood`.
- The order of `PLACES` is the order the card's Prev/Next buttons follow.

### Verified places (confirmed from web sources, Nov 2026)

| id | Name | Address | Neighborhood |
|---|---|---|---|
| bennys | Benny Tudino's | 622 Washington St, Hoboken, NJ 07030 | hoboken |
| basiles | Basile's Pizza | 89 Washington St, Hoboken, NJ 07030 (owner confirmed) | hoboken |
| panello | Panello | 720 Monroe St, Hoboken, NJ 07030 (Monroe Center) | hoboken |
| pops | Pop's Pizza | 975 8th Ave, New York, NY 10019 (not "Famous Pop's" at 840 8th Ave) | midtown |
| lazzaras | Lazzara's Pizza Cafe | 221 W 38th St, 2nd floor, New York, NY 10018 | midtown |
| lindustrie | L'Industrie Pizzeria | 104 Christopher St, New York, NY 10014 | village |
| mamas | Mama's Too | 325 Bleecker St, New York, NY 10014 (West Village location, not the Upper West Side original) | village |
| johns | John's of Bleecker Street | 278 Bleecker St, New York, NY 10014 | village |
| joes | Joe's Pizza | 7 Carmine St, New York, NY 10014 | village |
| upside | Upside Pizza | 65 Wall St, New York, NY 10005 | fidi |
| ignazios | Ignazio's Pizza | 4 Water St, Brooklyn, NY 11201 | dumbo |
| grimaldis | Grimaldi's Pizzeria | 1 Front St, Brooklyn, NY 11201 | dumbo |
| difara | Di Fara Pizza | 1424 Avenue J, Brooklyn, NY 11230 | midwood |

The owner's original list had misspellings (for example "Di Farra" and "Carmaine St"). The table above shows the corrected names.

---

## Architecture

1. **Data** (`src/data/places.ts`): `RATING_MAX`, `PLACES`, `HOODS` (name, subtitle, dot color), `TOUR` (order of the guided tour).
2. **Isometric drawing engine** (`engine/iso.ts`, `engine/parts.ts`): pure functions that return **SVG strings**.
3. **Tile builder** (`engine/tile.ts`) and **one `build<Neighborhood>()` per block** (`engine/hoods/`). The hood files keep the original compact one-line-per-object style on purpose; they read like a layout script.
4. **Brooklyn Bridge and water** (`engine/bridge.ts`, `engine/water.ts`), drawn as top-level scene items.
5. **Assembly and depth sorting** (`engine/scene.ts`): builds the DOM and orders everything back to front.
6. **Camera, input, animation loop** (`engine/map.ts`): viewBox pan/zoom/fly-to/framing; pointer, wheel, pinch; cars, walkers, boats, the train and clouds.
7. **UI** (`src/store.ts`, `src/App.tsx`, `src/components/`): review card, list panel, neighborhood bar, tour, hash routing, keyboard.

### Coordinate system (read this before drawing anything)

```js
const S = 22, CX = cos(30°), HY = .5;
iso(x, y, z) => [(x - y) * CX * S, (x + y) * HY * S - z * S]   // world → SVG user units
```

- **+x = south** (down-right on screen), **+y = west** (down-left), **+z = up**. One unit is about one storey's width, and a storey is about 1.1 units tall in the original tiles. Real-data buildings use `FT = 0.08` units per foot (a storey ≈ 0.9 units); see "Real buildings".
- The viewer looks from the +x/+y side. For a box `[x,x+w]×[y,y+d]×[z,z+h]`, the only visible faces are:
  - **L face** at `y+d`, facing +y, on the screen's lower-left (`faceL`)
  - **R face** at `x+w`, facing +x, on the screen's lower-right (`faceR`)
  - the top
- **A storefront must sit on an L or R face to be visible.** Put shops on the *far* side of a street so they face the viewer across it.
- Face helpers: `F.at(u, v, out)` maps face-local `u` (along the face, left to right on screen), `v` (height) and `out` (offset outward) to screen. `frect(F, …)` and `ftext(F, …)` draw a rectangle or skewed text on a face.

### World layout (world coordinates)

| Tile | x0 | y0 | size T | Notes |
|---|---|---|---|---|
| midtown | 0 | 22 | 16 | 8th Ave runs along x; 38th St along y; Columbus Circle; Empire State Building in the back-right corner |
| village | 20 | 22 | 16 | Bleecker St along x, Christopher St (cobblestones) along y, Carmine St |
| fidi | 40 | 22 | 16 | Wall St along y; Broad St plaza; stock exchange; Federal Hall; Brooklyn Bridge anchorage |
| dumbo | 40 | -2 | 16 | Water St (cobblestones); bridge anchorage and deck; carousel |
| hoboken | -2 | 45 | 16 | Waterfront promenade, Washington St, Monroe St, terminal clock tower |
| midwood | 60 | -4 | 10 | Avenue J, Q train embankment, small houses |
| liberty | 60 | 36 | 6 | Decoration only: Statue of Liberty island, no pins |

- Manhattan tiles sit along the x axis with 4-unit gaps between them.
- **East River**: y 14–22. **Hudson**: y 38–46. **Bay**: x 56–70. The outline is in `WATER`, and `WATER_RECTS` is used to scatter wave marks.
- **Brooklyn Bridge**: world x 41.5–43.5, towers at y `T1=15.3` and `T2=20.7`, cable height from `cableZ(y)`. It's split into three parts:
  - the DUMBO-side anchorage and deck: items in `buildDumbo`
  - the river span: `bridgeSVG()`, a top-level item
  - the FiDi anchorage and ramp: an item in `buildFidi`

  Moving the bridge means updating all three, plus the matching x position on both tiles.

### `Tile` builder API

Coordinates are local (0..T) and get offset by the tile's origin. **Ground layer**, drawn flat with no depth sorting:

`road(x,y,w,d,axis,{line})`, `cobble`, `plaza`, `grass`, `circ`, `xwalk`, `rect`, `flat(points)`, `rail(...)`

**Objects**, which get an AABB and are depth-sorted:

- `b(x,y,w,d,h,color,opts)`: a generic building. Options: `tower`, `fire:'L'|'R'`, `stoop:'L'`, `glass`, `g0`, `fh`, `colsL`/`colsR`, `noWinL`/`noWinR`, `door`, `extraFaces:(FL,FR)=>svg`, `chimney`, `roof`.
- `pizza(id, x,y,w,d,h, color, {front:'L'|'R'|'LR', sign, signSize, awn:[c1,c2], signBg, signFg, base, u0,u1, faces, b:{...bld opts}})` draws a storefront building **and registers the pin position for `PLACES[id]`**. Every place id needs exactly one `pizza(...)` call (directly or through `row()`). `base` is the shopfront's own colour, separate from the building's brick.
- `row(axis, at, from, to, items, maxDepth)` lays **real lots** side by side along a street (see "Real buildings"); `lot(l, x,y,w,d, opts)` places one at an explicit footprint.
- Any `b(...)` with `style:` set is drawn by `styledBld()` instead of `bld()`.
- `house`, `tree`, `lamp`, `bench`, `hydrant`, `person`, `crowd`, `queue`, `parked`, `cart`, `subway`, `flagpole`, and `add(x0,y0,x1,y1,svg,{above})` for custom shapes.

**Moving things:**

- `car(axis, a, b, c, speed, color, {taxi,bus,len,z,onTop})` loops from `a` to `b` along `axis` at the fixed other coordinate `c`, and fades in and out at the ends.
- `walker(axis, a, b, c, speed, {svg})` walks back and forth.

### Depth sorting

- Every object has an AABB (`x0..x1`, `y0..y1`). `rel(a,b)` says A is behind B if `a.x1 <= b.x0` or `a.y1 <= b.y0` (separating axis). `topo()` sorts each tile's static items once, breaking ties by center sum `x+y`.
- Moving objects are re-slotted every frame by `moverIndex()`, which calls `insertBefore` only when their slot changes.
- Flags:
  - `above: true` on raised things such as bridge decks makes them draw in front of anything under them.
  - `onTop: true` on a mover such as the train makes it draw after whatever it rides on.
  - `behindAll` marks the water.
- Top level: water first, then tiles and the bridge in topological order, computed once. Boats are inserted dynamically.
- **Never re-append or move tile `<g>` nodes after mounting.** Moving a node restarts its CSS intro "drop" animation.
- Random choices (people colors, lit windows, tree positions) come from a seeded generator (`seed`). Adding or removing objects shifts the random choices for everything built after them. That's harmless, but expect small visual changes.

### Layout pitfall (cost real time before)

In isometric view, a building on the **near side** of a street (larger x or y) covers the storefront across from it if it's tall. Three blocks had to be rearranged because of this:

- DUMBO: an open lot next to Grimaldi's.
- FiDi: a deeper plaza and lower buildings south of it, so the stock exchange flag shows.
- Hoboken: a park in front of Washington St, so Benny Tudino's shows.

Keep near-side buildings low, or leave gaps, and **check every change with screenshots** (`pnpm shots`). The same applies across tiles: tall buildings near a tile's back edge cover the front strip of the tile behind it. That's why the tallest buildings sit in the back-right corners.

A quick test before placing a near-side building with real height: a box whose nearest-to-the-street corner is `(x1, y0)` covers an L-face storefront on the line `y = yf` only at `x ≤ x1 − y0 + yf` (screen columns), and only up to height `h − (y0 − yf)` there. So in the Village, buildings south of Bleecker start at `y ≥ 11` (open corners in front: Christopher Park, Father Demo Square) to keep the 5–6 storey storefronts across the street visible.

### Real buildings (data → styles)

The West Village is built from real tax-lot data. The pipeline:

1. `pnpm lots <hood>` (`tools/fetch-lots.mjs`): for each place, NYC GeoSearch → tax lot (BBL), then PLUTO for that lot and up to 3 neighbours each side on the **same street and block** (house-number order), then roof heights from Building Footprints. Writes `src/data/lots/<hood>.ts`. Public, keyless APIs; NYC only (Hoboken isn't in PLUTO).
2. In the hood file, `lot(V.mamas, '323')` picks a lot by house number, and `t.row(...)` lays a run of them along a street in real order. The street grid stays hand-composed: a real 450 m stretch can't fit a 16-unit tile, so each pizzeria keeps its real building and its real next-door neighbours, and the composite joins the four block faces. Comments in `hoods/village.ts` say what's composite.
3. `fromLot()` (`styles.ts`) turns a lot into drawing parameters:
   - **width** = `frontage(ft)`: `0.08` units/ft up to 30 ft, wider buildings compressed (their bays just repeat), so narrow rowhouses next to big tenements keep their real rhythm. **Depth** the same, capped by the row.
   - **storeys** from `numfloors`; **storey height** from the measured roof height (minus a ~14 ft ground floor), clamped to the style's range. Ground floor: 2.75 for pizzerias (room for the sign), 2.2 for other shops, 1.5 for stoops.
   - **style** from PLUTO class + year (`styleOf`): L/E/F/G → `loft`; D/O/H/R with 8+ floors → `prewar`; ≤4 floors and pre-1880 → `rowhouse`; otherwise `tenement`. Shops on the ground floor for S*, K*, O* and *7 classes.
   - **fire escape** on the street facade for tenements before 1920; **water tank** only above six storeys (the real NYC rule).
   - **colours** are not in the data: picked per address from each style's palette by a hash, so they're stable and don't consume the scene RNG.
4. `styledBld()` draws: brick body; **street facades** (`fronts`) with window bays, sills, lintels (flat / hooded / arched), sash bars, shutters (some rowhouses), belt course, generic shopfronts or a stoop/door, cornice slab with brackets or dentils; **exposed party walls** blank and slightly darker, optionally with a faded painted ad (`ghost: true`, generic trades only); **roof** bulkhead, skylight, party-wall chimneys, tank. Each facade's repeated parts are batched into a few `<path>`s, so detail barely raises the element count.

Composite liberties in the Village: Christopher Park and Father Demo Square are placed at the corners in front; the 12-storey prewar in the back-right is a stand-in for buildings like 2 Cornelia St (12 fl, 1907), not a lot from the data.

### Camera and UI

- The camera is `{cx, cy, w}` in SVG user units and drives the `viewBox`. `fit(bounds)` frames bounds while subtracting the screen areas covered by the panel, header and neighborhood bar (`occlusion()`). `flyTo()` eases with a slight zoom-out bump in the middle.
- `targetFor()` frames either the whole map or one tile. Tile zoom is capped at `w >= W*0.66` so the small Midwood tile doesn't over-zoom.
- On phones (< 760px), the whole-map view frames only Manhattan and Brooklyn (`overviewBounds`), so Hoboken and Midwood peek in from the sides.
- Pins and neighborhood labels live in screen-scaled layers (`#pins`, `#labels`) and keep a roughly constant on-screen size (`applyCam`). Pin name tags show only when zoomed in (the `near` class). `LABEL_AT` sets which corner each neighborhood label hangs from.
- State: `mode` (`overview` or `hood`), `curHood`, `curPlace`, `listOpen`. Entry points: `showOverview()`, `focusHood(id)`, `openPlace(id)`, `openList()`, `startTour()`.
- URL hash routing: `#<placeId>` or `#<hoodId>`. Keyboard: Esc closes or backs out, ←/→ switch places while a card is open, and Enter on a focused pin opens it.
- `prefers-reduced-motion` stops the moving things and the intro animations.

### Visual style

Cream paper background (`#f3efe5`) with a canvas-generated grain overlay. Ink outlines in `#2e2b29` throughout. Flat fills, with top faces lightened and R faces darkened (`lt` and `dk`). Tomato accent `#d9473a`. Buttons and panels use a 1.5px ink border and a hard offset shadow (`box-shadow: 3px 3px 0 ink`). Fonts: Fraunces 800 for headings and DM Sans for UI text. Keep new shapes in this style: outlined, flat, slightly toy-like.

**Don't draw** real brand logos, copyrighted characters or copies of public artworks. For example, the Charging Bull statue was left out on purpose. Generic landmarks and architecture are fine.

---

## Previewing and testing

```bash
pnpm exec playwright install chromium            # once
pnpm build && pnpm shots             # whole map + every neighborhood, desktop (serves dist/)
pnpm shots --mobile                  # same at 390×844
pnpm shots --place joes              # opens a review card
pnpm shots --url http://localhost:5173   # shoot the running dev server instead
```

Screenshots go to `shots/`. Navigation in the script uses the URL hash. The script prints any console or page errors and a rough frame rate. The scene has about 5k SVG elements and runs at about 60fps in headless Chrome without a GPU. The hood view is too far out to judge facade detail: zoom with the mouse wheel in `pnpm dev`, or screenshot at `deviceScaleFactor: 2` after a few `mouse.wheel` steps. Look at the screenshots after **any** change to geometry or layout, because depth and overlap bugs only show up visually.
