"use client";

import { useState } from "react";

/**
 * Interactive registration trend chart.
 *
 * Still a hand-rolled SVG (no charting library), but client-side so hovering a
 * day shows a tooltip with its date + count — making spikes easy to read.
 * The peak day is highlighted automatically.
 */
export function TrendChart({
  data,
  height = 150,
}: {
  data: Array<{ date: string; count: number }>;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-navy-400">Belum ada data.</p>;
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const width = 100; // viewBox units
  const padY = 8;
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((d, i) => ({
    x: i * step,
    y: height - padY - (d.count / max) * (height - padY * 2),
    ...d,
  }));

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  const total = data.reduce((s, d) => s + d.count, 0);
  // Index of the peak day, so we can call out the biggest spike.
  const peakIdx = data.reduce((best, d, i) => (d.count > data[best].count ? i : best), 0);

  const fmtDay = (iso: string) =>
    new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(iso + "T00:00:00"));

  const shown = active ?? peakIdx;
  const sp = points[shown];
  // Tooltip x in percent, clamped so it doesn't overflow the edges.
  const tipLeft = Math.min(88, Math.max(12, (sp.x / width) * 100));

  return (
    <figure className="relative">
      {/* Tooltip */}
      <div
        className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-navy-900 px-2.5 py-1.5 text-center text-white shadow-lg"
        style={{ left: `${tipLeft}%` }}
      >
        <p className="text-[0.65rem] font-semibold text-navy-200">{fmtDay(sp.date)}</p>
        <p className="text-sm font-extrabold leading-none tnum">
          {sp.count} <span className="text-[0.65rem] font-normal text-navy-300">pendaftar</span>
        </p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ height }}
        className="w-full touch-none"
        role="img"
        aria-label={`Tren pendaftaran ${data.length} hari, total ${total} pendaftar`}
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gold-400)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--color-gold-400)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill="url(#trend-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-gold-500)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Vertical guide + marker for the active/peak day */}
        <line
          x1={sp.x}
          y1={0}
          x2={sp.x}
          y2={height}
          stroke="var(--color-navy-300)"
          strokeWidth="0.5"
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={sp.x}
          cy={sp.y}
          r="2.4"
          fill="var(--color-coral-500)"
          stroke="#fff"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />

        {/* Invisible hover zones per day */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - step / 2}
            y={0}
            width={step}
            height={height}
            fill="transparent"
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            tabIndex={0}
            role="button"
            aria-label={`${fmtDay(p.date)}: ${p.count} pendaftar`}
            style={{ cursor: "pointer", outline: "none" }}
          />
        ))}
      </svg>

      <figcaption className="mt-2 flex justify-between text-[0.7rem] font-semibold text-navy-400">
        <span>{fmtDay(data[0].date)}</span>
        <span className="text-coral-600">
          Puncak: {data[peakIdx].count} ({fmtDay(data[peakIdx].date)})
        </span>
        <span>{fmtDay(data[data.length - 1].date)}</span>
      </figcaption>
    </figure>
  );
}
