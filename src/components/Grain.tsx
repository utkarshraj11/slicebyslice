import { useMemo } from 'react';

/** Paper-grain overlay, generated once on a canvas. */
export function Grain() {
  const bg = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 180;
    const g = c.getContext('2d'); if (!g) return undefined;
    const d = g.createImageData(180, 180);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 200 + Math.random() * 55;
      d.data[i] = v; d.data[i + 1] = v * 0.97; d.data[i + 2] = v * 0.9; d.data[i + 3] = Math.random() < 0.5 ? 18 : 0;
    }
    g.putImageData(d, 0, 0);
    return `url(${c.toDataURL()})`;
  }, []);
  return <div id="grain" style={{ backgroundImage: bg }} />;
}
