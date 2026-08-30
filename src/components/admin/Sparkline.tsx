/**
 * Registration trend sparkline.
 *
 * Hand-rolled SVG instead of a charting library: this is ~40 lines against
 * ~50KB of client JavaScript for Chart.js or Recharts, and it renders on the
 * server so the chart is in the initial HTML.
 */
export function Sparkline({
  data,
  height = 56,
}: {
  data: Array<{ date: string; count: number }>;
  height?: number;
}) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.count), 1);
  const width = 100; // viewBox units; scales to any container via CSS
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((d, i) => ({
    x: i * step,
    // Leave 4 units of headroom so the peak isn't clipped by the stroke.
    y: height - 4 - (d.count / max) * (height - 10),
  }));

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-14 w-full"
        role="img"
        aria-label={`Tren pendaftaran ${data.length} hari terakhir, total ${total} pendaftar`}
      >
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gold-400)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--color-gold-400)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill="url(#spark-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-gold-500)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Highlight the most recent day */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="1.8"
          fill="var(--color-coral-500)"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption className="mt-1 flex justify-between text-[0.65rem] font-semibold text-navy-400">
        <span>{data.length} hari terakhir</span>
        <span className="tnum">{total} pendaftar</span>
      </figcaption>
    </figure>
  );
}
