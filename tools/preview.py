#!/usr/bin/env python3
"""Screenshot + smoke test for Slice by Slice.

Usage:
  python tools/preview.py                 # overview + every neighborhood (desktop 1440x900)
  python tools/preview.py --mobile        # same at 390x844
  python tools/preview.py --place joes    # also open a review card
  python tools/preview.py --hood village  # only this neighborhood
  python tools/preview.py --chrome /usr/bin/google-chrome   # use a system Chrome

Writes PNGs to ./shots and prints console/page errors and an approximate fps.
"""
import argparse, asyncio, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
HOODS = ['hoboken', 'midtown', 'village', 'fidi', 'dumbo', 'midwood']


async def main(a):
    out = ROOT / 'shots'
    out.mkdir(exist_ok=True)
    url = (ROOT / 'index.html').as_uri()
    async with async_playwright() as p:
        kw = {'args': ['--no-sandbox']}
        if a.chrome:
            kw['executable_path'] = a.chrome
        b = await p.chromium.launch(**kw)
        if a.mobile:
            pg = await b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        else:
            pg = await b.new_page(viewport={'width': 1440, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
        pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        tag = 'm_' if a.mobile else ''

        await pg.goto(url)
        await pg.wait_for_timeout(2800)  # intro drop-in animation
        await pg.screenshot(path=str(out / f'{tag}overview.png'))

        for h in ([a.hood] if a.hood else HOODS):
            await pg.evaluate(f"focusHood('{h}')")
            await pg.wait_for_timeout(1800)
            await pg.screenshot(path=str(out / f'{tag}{h}.png'))

        if a.place:
            await pg.evaluate(f"openPlace('{a.place}')")
            await pg.wait_for_timeout(1800)
            await pg.screenshot(path=str(out / f'{tag}card_{a.place}.png'))

        fps = await pg.evaluate("""() => new Promise(r => { let n = 0; const t0 = performance.now();
            (function f(){ n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); })(); })""")
        count = await pg.evaluate("document.querySelectorAll('#map *').length")
        print(f'screenshots -> {out}')
        print(f'~{fps:.0f} fps, {count} SVG elements')
        print('errors:' if errs else 'no console errors')
        for e in errs:
            print('  ' + e)
        await b.close()


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--mobile', action='store_true')
    ap.add_argument('--place')
    ap.add_argument('--hood', choices=HOODS)
    ap.add_argument('--chrome', help='path to a Chrome/Chromium binary (optional)')
    asyncio.run(main(ap.parse_args()))
