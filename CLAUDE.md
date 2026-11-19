# Slice by Slice: NYC + Hoboken pizza review map

A personal pizza-review site. It shows a pixel-art, isometric 3D map of New York City and Hoboken, in the style of isometriccities.com's landmark dioramas: one connected little city on a floating diorama plate, Hoboken across the Hudson on the west, Manhattan in the middle, Brooklyn across the East River on the east. Each pizzeria the owner visited is a storefront with a pin. Clicking a pin opens a review card with a rating, a written review and two photos.

It's a **Vite + React + TypeScript + three.js** app. (It started as a single SVG `index.html`, kept as `legacy.html`; the later SVG engine built from real tax-lot data lives on the `main` / `visual-refresh` branches.) The only outside resource is Google Fonts (Fraunces and DM Sans), and the page falls back to system fonts without it.

```bash
pnpm install
pnpm dev        # dev server
pnpm build      # typecheck + production build to dist/ (static, base './', host anywhere)
pnpm typecheck
```

```
index.html                 Vite entry (fonts + #root)
src/data/places.ts         RATING_MAX, PLACES, HOODS, TOUR: the content
src/world/compass.ts       Dir, quarter-turn view rotation (thetaOf, visibleAt, rotShowing)
src/world/kit.ts           class World: the builder (land, road, building, pizza, house, tree, car, boat, context…), pixel facade textures, seeded RNG
src/world/layout.ts        buildWorld(): the whole map, hand-placed, one commented section per neighbourhood + landmarks
src/world/map.ts           createMap(): renderer + pixel pass, lighting/time of day, camera framing and swings, input, DOM pins/labels, cutaway
src/store.ts               UI state + actions (openPlace, focusHood, list, rotation) + hash routing
src/components/*.tsx       MapView, ReviewCard, ListPanel, HoodBar, Compass, Grain, icons
src/styles.css             all CSS
public/photos/             put review photos here (empty for now)
tools/preview.mjs          headless-Chrome screenshot/smoke-test script (Playwright, software WebGL)
```

**React vs. engine split.** React renders only the chrome (header, buttons, card, list, hood bar) plus an empty `#map` host and `.overlay` div. `createMap()` (in a `MapView` effect) owns the canvas and puts the pins and neighbourhood labels into the overlay as real `<button>`s, re-projected every frame. State lives in `store.ts` (a tiny external store read with `useSyncExternalStore`), so the camera can read which panels are open synchronously when it refits. The map reports taps through callbacks, and the store calls `map.refit()`, `setActivePin()`, `setOverview()`, `setRotation()`; `MapView` calls `setTime()` and `zoomBy()`. `buildWorld()` reseeds the RNG, so builds are deterministic (and React StrictMode's double mount is harmless; `destroy()` disposes the renderer).

---

## Current state and open items

- All 13 places are on the map with **empty `rating`, `review` and `photos`**. The card shows "coming soon" placeholders. The owner still needs to supply this content.
- Ratings are assumed to be **out of 10** (`RATING_MAX`). The owner hasn't confirmed this scale.
- The owner said prices are hard to recall, so **prices were left out on purpose**.
- A previous version is published as a claude.ai artifact. That copy won't update automatically. Host `dist/` anywhere static, such as GitHub Pages, Netlify or Vercel.
- **Pixel-diorama rewrite (Nov 2026, branch `pixel-islands`)**, asked for by the owner after the SVG map "didn't look great": matching real scale was hurting the design, so the map is now hand-placed and shortened, with one or two famous landmarks per neighbourhood, but still one connected map in real geography ("hoboken to left of manhattan, dumbo and brooklyn to the right"). Each pizzeria stays on its real street and side (the owner's earlier asks still hold: Benny Tudino's across Washington St from Basile's, Panello on Monroe St, the riverfront behind Benny's, a basketball court across the road from Joe's).
- Landmarks: Hoboken Terminal and clock tower; Central Park, Columbus Circle, Hearst Tower, Port Authority, Times Square billboards (brand-free), the Empire State Building; Hudson River Park and Pier 45, Washington Square and its arch, the West 4th St courts; the Stock Exchange, Federal Hall, the Battery and Castle Clinton; the Brooklyn Bridge; Brooklyn Bridge Park and the carousel, the DUMBO clock tower building; Prospect Park; the B/Q cut and Avenue J station; the Statue of Liberty.
- Outside the six neighbourhoods, Brooklyn is "context city" (`World.context`): pale, low, merged into one mesh.
- **Rotation** is free: drag left/right to turn (asked for by the owner, like Pocket City). The store still keeps the nearest quarter view (`state.rot`) for Q/E, the compass buttons and auto-rotating to a storefront, which swing smoothly to exact quarter views.
- Known pre-existing quirk: on mobile the hidden, empty neighborhood bar peeks out as a small blob above the bottom buttons; the scale bar overlaps the header text in the phone overview.
- Performance: every hood building is its own mesh (a few hundred draw calls, rendered twice by the pixel pass, plus shadows). 60 fps on an Apple M5 GPU; not yet measured on a phone. If phones struggle, merge static buildings per neighbourhood like `context()` does.


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

1. **Data** (`src/data/places.ts`): `RATING_MAX`, `PLACES`, `HOODS` (name, subtitle, dot color), `HOOD_ORDER` (order of the list's neighborhood groups).
2. **Builder kit** (`world/kit.ts`): `World` collects meshes into `root`, plus `pins`, `hoods` (bounds), `movers`, `windows` (materials lit at night) and `glow` (always lit).
3. **The map** (`world/layout.ts`): one hand-placed section per neighbourhood. They read like a layout script; keep it that way.
4. **Live map** (`world/map.ts`): rendering, camera, input, overlay.
5. **UI** (`src/store.ts`, `src/App.tsx`, `src/components/`): review card (with an "Open in Google Maps" link built from name + address), list panel, neighborhood bar, hash routing, keyboard. The guided tour was removed at the owner's request (Nov 2026).

### World coordinates

- **x = east, z = south, y = up.** 1 unit ≈ 4 m ≈ one storey; a block is ~6 units, a street 2–4. Shortened everywhere: the scale bar is only true within a block.
- Landmasses (`W.land`): New Jersey x −76..−38; Manhattan x −30..12 (Central Park z −74..−62, Midtown −60..−24, Village −22..12, FiDi 14..40, the Battery to 46); Brooklyn x 22..68, z 6..76 (DUMBO z 8..32, Midwood x 44..68, z 50..76); Liberty Island x −24..−14, z 56..66. Rivers are the gaps: the Hudson x −38..−30, the East River x 12..22. All of it sits on one diorama plate whose top (y −1) is the harbour water.
- The Brooklyn Bridge runs along x at z 19.6..24 from the FiDi anchorage (x 2..8) to the DUMBO one (x 30..35), towers in the river at x 13.2 and 19.2.
- Neighbourhood bounds (`hood(id, x0, z0, x1, z1, y1)` in layout.ts) are what the camera frames and what a tap on the map resolves to; `y1` is the tallest thing in it.

### Builder API (`World`, all coordinates are min corners)

Ground (flat slabs, no shadow): `land`, `pave`, `park`, `slab(…, colour, top)`, `road(x0, z0, w, d)` (dashed centre line when ≥ 2.6 wide). Slab heights stack: pave 0.05 < park 0.08 < road 0.1.

Objects: `building(x0, z0, w, d, floors, wall, {fronts, shop, glass, tank, roof, cornice, y0})` (pixel facade textures; `fronts` get a shopfront when `shop`), `pizza(id, x0, z0, w, d, floors, wall, front, {sign, awn, glass, tank})` (building + awning + name sign + **registers the pin**; every place id needs exactly one), `storefront`, `house` (gabled frame house with porch), `tree`, `person`, `lamp`, `box`, `cyl`, `prism`, `at(mesh, x, y, z, ry)`. Layout helpers: `fillBlock` / `grid` (rows of buildings 0.8 back from the kerb on both long sides of each block, skipping reserved rects), `temple`, `billboard`, `trees`.

Movers: `car(axis, a, b, c, speed, colour, {bus, y})` loops from a to b along `axis` at the other coordinate c; `boat(...)` the same on the water.

`World.context(x0, z0, x1, z1, floors, skip)` fills an area with pale context blocks merged into a single mesh (one shared window tile; UVs scaled per face). Call `W.finish()` last.

### Rendering and look

- `WebGLRenderer` at the device pixel ratio (max 2) → `RenderPixelatedPass` (one art pixel = `PIXEL_CSS` = 1.5 CSS px; the owner found 3 too pixelated; outlines from depth and normal edges) → `OutputPass`. Textures are tiny canvases with `NearestFilter`: 4 px per unit, windows 1×2 px, some lit (an emissive mask).
- Light: hemisphere + one shadow-casting sun (`BasicShadowMap`, 2048², covers the whole plate). `TIMES` in map.ts: day / dusk / night set background, light colours, water colour, and how bright the lit windows and the glowing things are. The "Day / Dusk / Night" button calls `map.setTime(k)`.
- Palette: cream paper `#f3efe5` around the plate, teal water, brick / brownstone / limestone / glass building palettes in kit.ts, tomato accent `#d9473a`. Keep new things blocky and low-poly: boxes, cylinders, prisms, icosahedron trees.
- **Don't draw** real brand logos, copyrighted characters or copies of public artworks (no Charging Bull; Times Square billboards are abstract). Restaurant names on their own signs are fine. Don't copy isometriccities.com's images; match the technique, make our own models.

### Camera, input, overlay (`map.ts`)

- Orthographic camera at the true isometric tilt, looking at `target` (on the ground) from azimuth `theta` (`thetaOf(k)`: k = 0 from the south-west, 1 north-west, 2 north-east, 3 south-east); `viewH` is the visible height in world units.
- `fit(bounds, theta)` frames a box minus the screen areas covered by the header, panel and hood bar (`avail()`); `refit()` frames the open place (±11 units), else the neighbourhood, else the whole map (phones: Manhattan and Brooklyn). `flyTo` eases target, zoom (with a slight zoom-out bump) and theta together; `setRotation(k)` swings the short way round.
- Input, **orbit style** (the owner chose it over Google-Maps-style drag-to-pan): the camera orbits whatever is framed and travelling is done by clicking (a neighbourhood, a pin or building, the hood bar, "Whole map"), which flies there.
  - **Left-drag turns** freely (`TURN` rad/px, content follows the cursor). A flick coasts a little (`SPIN_MAX`, `SPIN_DECAY`: at most ~30°); a drag that stopped before release doesn't. `keepTheta` makes later framing keep the user's angle until a quarter turn is asked for (Q/E, compass buttons, auto-rotating to a storefront).
  - Wheel: a mouse wheel zooms at the cursor; a trackpad **pinch** (wheel + `ctrlKey`) zooms; a trackpad **two-finger swipe** pans. Browsers don't label the device, so `onWheel` guesses (pixel mode with sideways, fractional or small steps = trackpad): a `shortcut:` comment marks it.
  - Moving by hand is secondary: two-finger swipe, right/Shift-drag, arrow keys (when no card is open; ←/→ step between reviews when one is), two fingers on touch (pinch-zoom + pan). One finger on touch turns.
  - The view's centre is clamped to `PAN_LIMIT` (the plate), so the island can't be lost.
  - **Idle drift**: on the whole-map view with no panel open, after `IDLE` s without input the map turns slowly (`DRIFT` rad/s); any input stops it. Off with `prefers-reduced-motion` (as is the flick momentum).
  - The loop keeps the store's `state.rot` at the nearest quarter view (`onRotate`) whenever the angle crosses one.
- Taps: a pizzeria's projected outline on screen opens its review even when a nearer building hides it (its pin is always on top); otherwise the first *visible* raycast hit decides (raycasting ignores `.visible`, and the cutaway hides buildings): a pizzeria's meshes (`userData.place`, set in `pizza()`) or the pavement in front of it open the review, anything else resolves to a neighbourhood by its bounds.
- The compass needle follows the camera continuously: `apply()` writes the screen angle of north to the CSS variable `--north`.
- **Cutaway**: when a card is open, after the camera settles, every building between the camera and the open storefront whose screen box overlaps it is hidden (`cutaway()`), so layouts can stay true to life. Opening a place also auto-rotates so the storefront faces the camera (`rotShowing` in the store).
- Pins and labels are DOM buttons in `.overlay`, projected each frame; tags show when zoomed in (`.near`), labels only in the overview (`.ov`) and hang where a line from the neighbourhood's centre toward the camera crosses its edge (one point that moves smoothly with the view; picking the lowest edge midpoint made square neighbourhoods' labels flicker).
- `prefers-reduced-motion` freezes movers and makes camera moves instant.


## Previewing and testing

```bash
pnpm exec playwright install chromium            # once
pnpm build && pnpm shots             # whole map + every neighborhood, desktop (serves dist/)
pnpm shots --mobile                  # same at 390×844
pnpm shots --place joes              # opens a review card
pnpm shots --url http://localhost:5173   # shoot the running dev server instead
pnpm shots --hood dumbo --zoom 6 [--at x,y]   # zoom in N wheel steps at 2x
```

Screenshots go to `shots/`. Navigation in the script uses the URL hash. Headless Chrome runs WebGL in software (SwiftShader), so the printed frame rate is far below a real GPU's (on an Apple M5 via `chromium.launch({ channel: 'chrome', args: ['--use-angle=metal'] })` it holds 60 fps), and "GPU stall due to ReadPixels" warnings come from taking screenshots. Look at the screenshots after **any** layout change, from more than one rotation (press `q` in the page, or open a place to trigger auto-rotation).
