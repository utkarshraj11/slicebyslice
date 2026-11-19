# Slice by Slice: NYC + Hoboken pizza review map

A personal pizza-review site. It shows an animated, isometric, "drawn in code" map of New York City and Hoboken, inspired by an isometric San Francisco animation. Each neighborhood is a floating city block. Each pizzeria the owner visited is a storefront with a pin. Clicking a pin opens a review card with a rating, a written review and two photos.

It's a **Vite + React + TypeScript** app. (It started as a single `index.html`; that original is kept as `legacy.html` for reference.) The only outside resource is Google Fonts (Fraunces and DM Sans), and the page falls back to system fonts without it.

```bash
pnpm install
pnpm dev        # dev server
pnpm build      # typecheck + production build to dist/ (static, base './', host anywhere)
pnpm typecheck
pnpm lots <hood>   # refetch real building data for a neighborhood (streets in tools/areas.mjs), see "Real buildings"
```

```
index.html                 Vite entry (fonts + #root)
src/data/places.ts         RATING_MAX, PLACES, HOODS, TOUR: the content
src/data/lots.ts           Lot / Street types + lot(street, houseNo) and side(street, from, to) lookups
src/data/lots/<hood>.ts    GENERATED real lot data per neighborhood (pnpm lots <hood>); don't hand-edit
src/engine/iso.ts          iso math, view rotation, seeded RNG, SVG-string primitives (box, face(dir), frect, ftext, gtext, gableRoof…)
src/engine/parts.ts        buildings, storefronts, trees, people, cars, boats, clouds
src/engine/styles.ts       building styles (rowhouse, tenement, loft, prewar, modern, frame) + real lot → drawing params
src/engine/tile.ts         class Tile (builder API) + Item/Mover/AABB types
src/engine/hoods/*.ts      one build<Neighborhood>() per tile (+ liberty decor)
src/engine/bridge.ts       Brooklyn Bridge (BR world coords): river span + anchorage() for the two shore tiles
src/engine/water.ts        water outline + waves
src/engine/scene.ts        depth sorting (rel/topo/moverIndex), mounting tiles, pins, labels
src/engine/map.ts          createMap(): camera, pointer/wheel/pinch, animation loop, rotation rebuild, x-ray
src/store.ts               UI state + actions (openPlace, focusHood, tour…) + hash routing
src/components/*.tsx       MapView, ReviewCard, ListPanel, HoodBar, Compass, Grain, icons
src/styles.css             all CSS
public/photos/             put review photos here (empty for now)
tools/preview.mjs          headless-Chrome screenshot/smoke-test script (Playwright)
tools/areas.mjs            which real streets / house-number ranges each tile shows
tools/fetch-lots.mjs       PLUTO + Building Footprints (NYC) or OpenStreetMap (Hoboken) → src/data/lots/<hood>.ts
```

**React vs. engine split.** React renders only the chrome (header, buttons, card, list, hood bar) and an empty `<svg>` shell. The ~12k-element scene is built as SVG strings and mounted imperatively by `createMap()` in a `MapView` effect. Don't move the scene into JSX: per-frame mover re-slotting and the "never move tile nodes" rule depend on direct DOM control. State lives in `store.ts` (a tiny external store read with `useSyncExternalStore`), so the camera can read which panels are open synchronously when it refits. The map reports taps through callbacks, and the store calls `map.refit()`, `setActivePin()`, `setOverview()` and `setRotation()`. `mountScene()` reseeds the RNG, so builds are deterministic (and React StrictMode's double mount is harmless; `destroy()` empties the layers).

---

## Current state and open items

- All 13 places are on the map with **empty `rating`, `review` and `photos`**. The card shows "coming soon" placeholders. The owner still needs to supply this content.
- Ratings are assumed to be **out of 10** (`RATING_MAX`). The owner hasn't confirmed this scale.
- The owner said prices are hard to recall, so **prices were left out on purpose**.
- The owner said they "have changes". Ask what they are before refactoring anything.
- A previous version is published as a claude.ai artifact. That copy won't update automatically. Host `dist/` anywhere static, such as GitHub Pages, Netlify or Vercel.
- **To do later: smooth rotation.** Drag-to-turn snaps to quarter turns, because the engine rebuilds and depth-sorts the scene per 90° view. Free rotation (like April Zhu's Pocket City) would need a canvas/3D renderer.
- **Streets are drawn about half their real width** (Bleecker's roadway is 1.3 units ≈ 16 ft; real ≈ 30 ft), while cars and people are now real size. So narrow streets hold one lane, and Washington St (Hoboken) has no parking lanes. Widening streets means re-laying every hood's facade lines.
- Known pre-existing quirk (also in the original): on mobile the hidden, empty neighborhood bar peeks out as a small blob above the bottom buttons.
- **Every neighborhood is built from real data on its real street layout (Nov 2026)**, schematic: real streets in real order, each pizzeria on its real block and side of the street, real neighbours and nearby landmarks; long stretches between clusters are shortened. Each hood file's header comment says what's real and what's composite. The owner asked for this ("Benny Tudino's is on the other side of Basile's", "Panello is on a different block", "riverfront behind Benny's", "a basketball court across the road from Joe's").
- **Hoboken floors are estimates**: OSM has footprints and addresses but no storey counts or dates there; missing addresses are filled with typical brownstones.
- Still invented, not data: Midtown's buildings east of 8th Ave, FiDi's Pine St towers, the Midtown and Times Square fillers, the north-of-Avenue-J houses in Midwood (real houses from two blocks north).

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

### Coordinate system and view rotation (read this before drawing anything)

```js
const S = 22, CX = cos(30°), HY = .5;
iso0(x, y, z) => [(x - y) * CX * S, (x + y) * HY * S - z * S]   // view coords → SVG user units
iso(x, y, z)  => iso0(...rot(x, y), z)                           // world coords (what you normally use)
```

- **World: +x = south, +y = west, +z = up** (Manhattan's grid; each tile snaps its own street grid to it: the Village to Bleecker St, Hoboken to Washington St, DUMBO and Midwood to true north). One unit ≈ 12.5 ft (`FT = 0.08`); a storey ≈ 0.9 units.
- **The view rotates in 90° steps** (`setRot(k)`, k = 0 looks from the south-west; 1 from the north-west; 2 north-east; 3 south-east). `rot()` turns world coords into view coords before projection. Rotating **rebuilds the whole scene** (`map.setRotation`, behind a short fade), so all geometry is computed per rotation, never cached across one.
- **Draw by compass side, never by screen side.** `face(x,y,z,w,d, dir)` returns the face on world side `dir` (`'N' | 'E' | 'S' | 'W'`), with `hidden: true` when it points away from the viewer; `frect`, `ftext`, `storefront`, `awning`, `fireEscape` draw nothing on hidden faces. `faceL`/`faceR` are legacy aliases for the W and S faces. `box()` rotates itself. `visibleFaces()` gives the (two) faces you can see. `gableRoof()` and `viewSide()` handle roofs and other view-dependent pieces.
- **A face's `u` runs left→right as seen standing in front of that facade**, whatever the rotation: W face from north to south, E from south to north, S from west to east, N from east to west. So storefront positions (`u0`/`u1`) never change with rotation.
- Ground text that reads from any side: `gtext()` / `t.streetName()`; `road(..., {name})` paints the street name.

### World layout (world coordinates)

| Tile | x0 | y0 | size (x × y) | Street spine / notes |
|---|---|---|---|---|
| midtown | 0 | 4 | 34 × 30 | 8th Ave along x; Columbus Circle, Pop's, Hearst Tower; (shortened) Times Square, Port Authority; W 39th/38th lofts, Lazzara's; ESB backdrop |
| village | 40 | 4 | 46 × 40 | Bleecker St along x (Christopher → Carmine); 6th Ave and the West 4th St courts on the east; West St, Hudson River Park and Pier 45 on the west |
| fidi | 88 | 4 | 24 × 35 | Wall St along y (Broad → South St); NYSE, Federal Hall, Hanover Sq; bridge's Manhattan anchorage |
| hoboken | 2 | 57 | 44 × 38 | Washington St along x (8th → Newark); riverfront on the east edge; Monroe St on the west. Its south end (Newark St, the Terminal) faces Christopher St across the Hudson, as in life |
| dumbo | 88 | -30 | 22 × 20 | Water/Front St along y, Old Fulton along x; park and bridge's Brooklyn anchorage on the north |
| midwood | 118 | -46 | 16 × 16 | Avenue J along y, E 15th/16th along x; the B/Q in an open cut |
| liberty | 116 | 36 | 6 | Decoration only: Statue of Liberty island, no pins |

- **Island plate** (`water.ts`): everything sits on one bounded plate, `ISLAND` (a stepped outline hugging every tile), top at `Z_PLATE` (−0.45) with earth-coloured sides. Tiles are low plinths on it (`thick` defaults to 0.45); the water is painted flat on its surface.
- Water (`water.ts`): East River y −10..4, Hudson y 44.5..57 (both along x; the Hudson is the wider, as in life), the harbour x 112..132. `WATER` is the outline (teal, darker toward the banks via clipped wide strokes), `WATER_RECTS` scatters waves, `BOATS` are the routes.
- **Brooklyn Bridge** (`bridge.ts`, `BR`): deck along y at world x 90.6–92.6; anchorages at y `BR.ya` (Brooklyn) and `BR.yb` (Manhattan), towers at `BR.t1`/`BR.t2`, shores at `BR.shoreB`/`BR.shoreM`. `bridgeSVG()` is the top-level river span; `anchorage(t, 'brooklyn' | 'manhattan')` draws each shore's anchorage, deck and ramp into DUMBO and FiDi. Moving the bridge means changing `BR` (and keeping both tiles' x ranges under it).

### `Tile` builder API

`new Tile(id, x0, y0, size | [W, D], opts)`. Coordinates are local (0..W along x, 0..D along y) and get offset by the tile's origin. **Ground layer**, drawn flat with no depth sorting:

`road(x,y,w,d,axis,{line,name,nameAt})`, `streetName`, `cobble`, `plaza`, `grass`, `circ`, `xwalk`, `rect`, `flat(points)`, `rail(...)`

**Objects**, which get an AABB and are depth-sorted:

- `face(lots, facing, at, from, to, {depth, pizzas, corners, over, fit})`: **the main way to build a street.** One side of a street from real lots in walking order (`side(street, from, to)` picks them by house number and parity). `facing` is the compass side the facades face (toward the street); `at` is the facade line. Lots get their real (compressed) frontage and the last one is cut at `to`, or `fit: true` scales them to fill exactly. `corners: {num: 'N'}` gives a corner lot a second street front; `pizzas: {placeId: {...storefront opts}}` turns the pizzeria's lot (`lot.place`) into its storefront; `over: {num: {...}}` overrides per lot (`ghost`, `style`, `faces`, `ground`…). `row()` is the same with hand-made items.
- `pizza(id, x,y,w,d,h, color, {front, sign, signSize, awn, signBg, signFg, base, u0, u1, faces, b})` draws a storefront building **and registers the pin** (`t.pins[id]`: position, storefront compass side for auto-rotation, screen rect for x-ray). `front` is compass letters (`'E'`, `'SW'`; legacy `'L'`/`'R'` = W/S). Every place id needs exactly one registration.
- `b(x,y,w,d,h,color,opts)`: a building; with `style:` set it's drawn by `styledBld()` (use that for anything new). `lot(l, x,y,w,d, opts)` places one real lot at an explicit footprint.
- `house`, `tree`, `lamp`, `bench`, `hydrant`, `person`, `crowd`, `queue`, `parked`, `cart`, `subway`, `flagpole`, `fence`, and `add(x0,y0,x1,y1,svg,{above, small})` for custom shapes (`small` = never x-rayed).

**Streetscape** (`t.streetscape()`, run automatically for every tile after its builder): from the roads registered by `road()` it draws sidewalk bands and kerbs (broken where another road crosses), plants street trees every ~40 ft where nothing stands (never near a crossing or a pizzeria storefront), and puts traffic `signal()`s on two corners of each crossing of a wide road. It then runs `checkTraffic()`, which `console.warn`s `[layout] …` for any car, bus, walker or parked car whose path runs through a building or (cars) leaves the carriageway; `pnpm shots` prints these, so keep it at zero. Roads have no outline of their own; the kerbs are their edges.

**Moving things:** `car(axis, a, b, c, speed, color, {taxi,bus,len,z,onTop})` loops from `a` to `b` along `axis` at the other coordinate `c` (cars are real size: 1.25 × 0.5 units, buses 3.2 × 0.68; keep `c ± 0.25` inside the road); `walker(axis, a, b, c, speed, {svg})` walks back and forth. Positions are world coords; the map projects them through the current rotation every frame.

### Depth sorting

- Every object has an AABB **in view space** (`Tile.add` converts with `rotAABB`, so it's only valid for the rotation it was built in). `rel(a,b)` says A is behind B if `a.x1 <= b.x0` or `a.y1 <= b.y0`. `topo()` sorts each tile's static items once, breaking ties by center sum.
- Moving objects are re-slotted every frame by `moverIndex()`.
- Flags: `above: true` (bridge decks, the Avenue J bridge) draws in front of anything under it; `onTop: true` on a mover draws it after whatever it rides on; `behindAll` marks the water.
- **Never re-append or move tile `<g>` nodes after mounting** (it restarts the intro "drop" animation); a rotation replaces everything instead, with the intro switched off (`no-intro`).
- Random choices come from a seeded generator, reseeded on every build, so each rotation is deterministic. Per-building colours use an address hash, not the RNG.

### Fog of war

`engine/fog.ts`, like GTA's map or Pixel Chennai: the neighbourhood tiles, the Statue of Liberty, the Brooklyn Bridge and `LIT_AREAS` (Lower Manhattan from the Village to the Battery, the harbour, the East River and Brooklyn from DUMBO to Midwood) are lit; everything else on the island fades into the paper. `fogSVG()` fills the `#fog` layer (between `#scene` and `#sky`, `pointer-events: none`) with a paper-coloured sheet masked by stepped rings around each lit box's screen outline (grown by 7 / 4 / 1.8 / 0.4 units, up to the tile's `top`, so towers stay lit). `contextSVG()` draws a dim grid of flat city blocks on dry land outside the tiles, under the fog, so unexplored land reads as city. Strength and colour: `#fog .fog` in `styles.css` (for a GTA-style dark void, set its `fill` to a dark slate). A new neighbourhood tile is lit automatically.

### Distance fade

When a review card is open, `fade()` in `map.ts` classes every static object by its view-space distance from the pizzeria (`fadeLevel`: < 6 units full detail, then `f1`/`f2`/`f3`). The CSS turns those into a solid pale "context massing" wash (grayscale + sepia filter, not transparency, so faded buildings don't show through each other); the farthest band also fades. Movers can't take the wash, so they only fade (`FADE_OP`). Ground (roads, parks, water) stays in full colour.

### Occlusion: x-ray, and the near-side rule

With real heights, the buildings across the street from a storefront hide it (Wall St is a canyon). When a review card is open, `map.ts` **x-rays** every static object drawn after the pizzeria whose box overlaps its storefront rectangle (class `xray`, faded to 14%). Opening a place also **auto-rotates** the view so its storefront faces you (`rotShowing`) and zooms to the area around it (`placeBounds`). So layouts can be true to life; you don't need to lower near-side buildings for the open card.

The old rule still matters for the plain neighbourhood view: a near-side box whose street-side corner is `(x1, y0)` covers a far storefront on the line `y = yf` only at `x ≤ x1 − y0 + yf`, up to height `h − (y0 − yf)`. Check every change with screenshots, from more than one rotation.

### Real buildings (data → styles)

1. **Which streets**: `tools/areas.mjs` lists, per hood, the streets and house-number ranges the tile shows.
2. **Fetch**: `pnpm lots <hood>` (`tools/fetch-lots.mjs`) writes every lot on those stretches (both sides, house-number order) to `src/data/lots/<hood>.ts`. NYC: GeoSearch marks each pizzeria's tax lot (`place`), PLUTO gives frontage, depth, floors, class, year, corner; Building Footprints gives roof height. Hoboken: OpenStreetMap footprints (frontage/depth measured along the street in Hoboken's grid); floors/year missing (`est`), filled in `hoods/hoboken.ts`. Public, keyless APIs.
3. **Lay out**: hood files call `t.face(side(street, from, to), facing, …)`. The street grid is hand-composed from measured OpenStreetMap geometry (each hood's header comment lists the real order and the pizzerias' real positions); widths and order are real; long stretches between clusters are shortened or skipped.
4. `fromLot()` maps a lot to drawing parameters:
   - **width** = `frontage(ft)`: `0.08` units/ft up to 30 ft, wider buildings compressed. **Depth** the same, capped per face.
   - **storeys**: `numfloors`, towers above 12 compressed (`drawnFloors`); **storey height** from the measured roof height, clamped. Ground floor: 2.75 for pizzerias (room for the sign), 2.2 for shops, 1.5 for stoops, 1.05 for porches.
   - **style** (`styleOf`): L/E/F/G → `loft`; D/O/H/R with 8+ floors (or any 15+) → `prewar` before 1955, else `modern`; A/B up to 3 floors from 1890 → `frame`; ≤4 floors pre-1880 → `rowhouse`; otherwise `tenement`. `.5` floors on rowhouses/frame houses → attic with dormers. Shops for S*, K*, O*, *7 classes.
   - **fire escape** on tenements before 1920; **water tank** above six storeys; **colours** by address hash.
5. `styledBld()` draws every visible side by compass: **street facades** (`fronts`) with bays, sills, lintels, shopfronts or stoop/door/porch, cornice; the **rear** (opposite the street) with plain windows; **party walls** blank (optional `ghost` ad); roofs with bulkhead, skylight, chimney, tank, or gables and dormers; tall prewar buildings get a podium and set-back tower. Facade parts are batched into a few `<path>`s.

### Camera and UI

- The camera is `{cx, cy, w}` in SVG user units and drives the `viewBox`. `fit(bounds)` frames bounds minus the screen areas covered by the panel, header, neighborhood bar and (whole-map view) a left margin for labels (`occlusion()`). `flyTo()` eases with a slight zoom-out bump.
- `targetFor()` frames the open place's surroundings (`placeBounds`), else one tile, else the whole map. On phones (< 760px) the whole map frames Manhattan and Brooklyn only.
- **Rotation UI**: drag pans; right-drag or shift-drag turns the view (every ~110px of horizontal drag is a quarter turn, via `cb.onTurn`); touch drags pan and pinch zooms. The compass (`components/Compass.tsx`) has rotate buttons and a north needle; clicking the needle resets to k = 0. Keys `Q`/`E`.
- **Scale bar and zoom** (`MapView.tsx`): `applyCam` reports a round scale length and zoom % through `cb.onScale` (written straight to the DOM, since it runs every camera frame); the +/− buttons call `map.zoomBy()`. The scale is the drawing scale (1 unit = 12.5 ft); distances between neighbourhoods are shortened, so it's only true within a block. `state.rot` in the store; `openPlace` auto-rotates; the tour picks each hood's best rotation (`bestRot`).
- Pins and labels live in screen-scaled layers (`#pins`, `#labels`). Pin tags show only when zoomed in (`near`). `LABEL_AT` picks the screen corner each label hangs from.
- State: `mode`, `curHood`, `curPlace`, `listOpen`, `listBy`, `touring`, `rot`. URL hash: `#<placeId>` or `#<hoodId>`. Keys: Esc, ←/→, Enter on a pin, Q/E.
- `prefers-reduced-motion` stops movers, intro animations and the rotation fade.

### Visual style

Cream paper background (`#f3efe5`) with a canvas-generated grain overlay. Ink outlines in `#2e2b29` on objects; ground (`flat()`: roads, grass, plazas) gets soft brown edges instead. Tree crowns are clusters of leaf blobs outlined in a deep shade of the leaf colour. Flat fills, with top faces lightened and R faces darkened (`lt` and `dk`). Tomato accent `#d9473a`. Buttons and panels use a 1.5px ink border and a hard offset shadow (`box-shadow: 3px 3px 0 ink`). Fonts: Fraunces 800 for headings and DM Sans for UI text. Keep new shapes in this style: outlined, flat, slightly toy-like.

**Don't draw** real brand logos, copyrighted characters or copies of public artworks. For example, the Charging Bull statue was left out on purpose. Generic landmarks and architecture are fine.

---

## Previewing and testing

```bash
pnpm exec playwright install chromium            # once
pnpm build && pnpm shots             # whole map + every neighborhood, desktop (serves dist/)
pnpm shots --mobile                  # same at 390×844
pnpm shots --place joes              # opens a review card
pnpm shots --url http://localhost:5173   # shoot the running dev server instead
pnpm shots --hood dumbo --zoom 6 [--at x,y]   # zoom in N wheel steps at 2x to judge cars, people, kerbs
```

Screenshots go to `shots/`. Navigation in the script uses the URL hash. The script prints any console or page errors and a rough frame rate. The scene has about 12k SVG elements and runs at about 60fps in headless Chrome without a GPU. The hood view is too far out to judge facade detail: zoom with the mouse wheel in `pnpm dev`, or screenshot at `deviceScaleFactor: 2` after a few `mouse.wheel` steps. Look at the screenshots after **any** change to geometry or layout, because depth and overlap bugs only show up visually, and check more than one rotation (press `q` in the page, or set `location.hash` to a place to trigger auto-rotation).
