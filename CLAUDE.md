# Slice by Slice: NYC + Hoboken pizza review map

A personal pizza-review site. It shows an animated, isometric, "drawn in code" map of New York City and Hoboken, inspired by an isometric San Francisco animation. Each neighborhood is a floating city block. Each pizzeria the owner visited is a storefront with a pin. Clicking a pin opens a review card with a rating, a written review and two photos.

**Everything is in one file, `index.html`.** It has no build step, no framework and no dependencies. The only outside resource is Google Fonts (Fraunces and DM Sans), and the page falls back to system fonts without it. To run it, open the file in a browser or serve the folder with any static server.

```
index.html        the whole site: CSS, data, drawing engine, UI
tools/preview.py  headless-Chrome screenshot/smoke-test script (Playwright)
photos/           put review photos here (empty for now)
```

---

## Current state and open items

- All 13 places are on the map with **empty `rating`, `review` and `photos`**. The card shows "coming soon" placeholders. The owner still needs to supply this content.
- Ratings are assumed to be **out of 10** (`RATING_MAX`). The owner hasn't confirmed this scale.
- The owner said prices are hard to recall, so **prices were left out on purpose**.
- The owner said they "have changes". Ask what they are before refactoring anything.
- A previous version is published as a claude.ai artifact. That copy won't update automatically. Host this folder anywhere static, such as GitHub Pages, Netlify or Vercel, or bring the file back to a Claude chat to republish it there.

---

## Editing content (the most common task)

The review data sits at the top of the `<script>`, under the comment `YOUR REVIEWS LIVE HERE`:

```js
const RATING_MAX = 10;
const PLACES = [
  {id:'joes', hood:'village', name:"Joe's Pizza", address:"7 Carmine St, New York, NY 10014",
   rating:null, review:"", photos:[null,null]},
  ...
];
```

- `rating`: a number such as `8.5`, or `null`. Once it's set, the pin shows the number instead of the slice icon, the card fills in the slice meter, and "By rating" in the list ranks the place.
- `review`: plain text. Line breaks are kept (`white-space: pre-line`).
- `photos`: up to two image sources. Use relative paths like `"photos/joes-1.jpg"`, which work on any static host and from `file://`, or `data:` URLs. **Remote image URLs won't load if the page is hosted as a claude.ai artifact**, because of its content security policy. Resize photos to about 1200px wide and under 300KB each.
- `id` is also the deep link. `index.html#joes` opens that review directly. `#village`, `#dumbo` and the other neighborhood ids open a neighborhood.
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

## Architecture (inside `index.html`)

The script runs top to bottom in these sections, each marked by a `/* ===== */` banner:

1. **Data**: `RATING_MAX`, `PLACES`, `HOODS` (name, subtitle, dot color), `TOUR` (order of the guided tour).
2. **Isometric drawing engine**: pure functions that return **SVG strings**.
3. **Tile builder** (`class Tile`) and **one `build<Neighborhood>()` function per block**.
4. **Brooklyn Bridge and water**, drawn as top-level scene items.
5. **Assembly and depth sorting**: builds the DOM and orders everything back to front.
6. **Camera**: viewBox-based pan, zoom, fly-to and framing.
7. **UI**: review card, list panel, neighborhood bar, tour, hash routing, keyboard, pointer, wheel and pinch.
8. **Animation loop**: cars, walkers, boats, the train and clouds.

### Coordinate system (read this before drawing anything)

```js
const S = 22, CX = cos(30°), HY = .5;
iso(x, y, z) => [(x - y) * CX * S, (x + y) * HY * S - z * S]   // world → SVG user units
```

- **+x = south** (down-right on screen), **+y = west** (down-left), **+z = up**. One unit is about one storey's width, and a storey is about 1.1 units tall.
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
- `pizza(id, x,y,w,d,h, color, {front:'L'|'R'|'LR', sign, signSize, awn:[c1,c2], signBg, signFg, u0,u1, faces, b:{...bld opts}})` draws a storefront building **and registers the pin position for `PLACES[id]`**. Every place id needs exactly one `pizza(...)` call.
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

Keep near-side buildings low, or leave gaps, and **check every change with screenshots** (`tools/preview.py`). The same applies across tiles: tall buildings near a tile's back edge cover the front strip of the tile behind it. That's why the tallest buildings sit in the back-right corners.

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
pip install playwright && python -m playwright install chromium
python tools/preview.py                    # whole map + every neighborhood, desktop
python tools/preview.py --mobile           # same at 390×844
python tools/preview.py --place joes       # opens a review card
```

Screenshots go to `shots/`. The script prints any console or page errors and a rough frame rate. The scene has about 5k SVG elements and runs at about 50fps in headless Chrome without a GPU. Look at the screenshots after **any** change to geometry or layout, because depth and overlap bugs only show up visually.
