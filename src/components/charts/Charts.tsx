import type React from "react";
import { useState } from "react";
import { monthLong, monthShort } from "../../lib/format";
import { useWidth } from "./useWidth";

/*
 * Small hand-drawn SVG charts for the landing page. One scale places marks,
 * ticks and labels; one y-axis per chart; 2px lines, a 10% area wash, bars no
 * wider than 24px with 4px rounded ends. Colours are the two validated series
 * tokens (--chart-1 indigo, --chart-2 gold); text stays in the text colours.
 */

export type SeriesColor = 1 | 2;

const seriesVar = (c: SeriesColor) => `var(--chart-${c})`;

function niceTicks(min: number, max: number, count = 4) {
  if (max === min) max = min + 1;
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 1e6; v += step) ticks.push(+v.toFixed(6));
  return ticks;
}

export const Swatch: React.FC<{ color: SeriesColor }> = ({ color }) => (
  <i className="inline-block size-2.5 rounded-[2px]" style={{ background: seriesVar(color) }} />
);

export const Legend: React.FC<{ items: { color: SeriesColor; label: string }[] }> = ({ items }) => (
  <div className="flex flex-wrap gap-3.5 text-xs text-gray-700">
    {items.map((i) => (
      <span key={i.label} className="inline-flex items-center gap-1.5">
        <Swatch color={i.color} />
        {i.label}
      </span>
    ))}
  </div>
);

type TipRow = { color: SeriesColor; label: string; value: string };

const Tooltip: React.FC<{ x: number; width: number; title: string; rows: TipRow[] }> = ({ x, width, title, rows }) => (
  <div
    aria-hidden="true"
    className="shell-pop pointer-events-none absolute top-0 z-10 min-w-[150px] rounded-lg px-2.5 py-2 text-xs"
    style={{ left: Math.min(Math.max(x - 80, 0), Math.max(0, width - 170)), animationDuration: "120ms" }}
  >
    <div className="mb-1 text-gray-500">{title}</div>
    {rows.map((r) => (
      <div key={r.label} className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-gray-700">
          <Swatch color={r.color} />
          {r.label}
        </span>
        <strong className="shell-num font-semibold text-gray-900">{r.value}</strong>
      </div>
    ))}
  </div>
);

export type LineSeries = { name: string; color: SeriesColor; values: (number | null)[] };

export const LineChart: React.FC<{
  months: string[];
  series: LineSeries[];
  height?: number;
  yMin?: number;
  yMax?: number;
  formatAxis: (v: number) => string;
  formatValue: (v: number) => string;
  endLabels?: boolean;
  area?: boolean;
}> = ({ months, series, height = 260, yMin, yMax, formatAxis, formatValue, endLabels = true, area = true }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const W = Math.max(260, width);
  const H = height;
  const m = { t: 10, r: endLabels ? 60 : 14, b: 26, l: 50 };
  const n = months.length;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const ticks = niceTicks(yMin ?? Math.min(0, ...all), yMax ?? Math.max(1, ...all));
  const top = ticks[ticks.length - 1];
  const bottom = ticks[0];
  const x = (i: number) => m.l + (n <= 1 ? 0 : (i * (W - m.l - m.r)) / (n - 1));
  const y = (v: number) => m.t + (1 - (v - bottom) / (top - bottom)) * (H - m.t - m.b);
  const every = W < 520 ? 2 : 1;

  const paths = series.map((s) => {
    const segments: string[] = [];
    let current = "";
    s.values.forEach((v, i) => {
      if (v == null) {
        if (current) segments.push(current);
        current = "";
        return;
      }
      current += `${current ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    });
    if (current) segments.push(current);
    return segments;
  });

  // End labels pushed apart so two series ending close together stay readable.
  const ends: { s: LineSeries; ty: number; value: number }[] = [];
  series.forEach((s) => {
    const value = s.values[n - 1];
    if (value == null) return;
    let ty = y(value) + 4;
    for (const other of ends) if (Math.abs(other.ty - ty) < 14) ty = other.ty + (ty > other.ty ? 14 : -14);
    ends.push({ s, ty, value });
  });

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) * W) / rect.width;
    const i = Math.round(((px - m.l) / (W - m.l - m.r)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const label = series
    .map((s) => `${s.name}: ${s.values.map((v, i) => `${monthShort(months[i])} ${v == null ? "none" : formatValue(v)}`).join(", ")}`)
    .join(". ");

  return (
    <div ref={ref} className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} height={H} className="block w-full overflow-visible" role="img" aria-label={label}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="chart-axis">
              {formatAxis(t)}
            </text>
          </g>
        ))}
        {months.map((mo, i) =>
          i % every === 0 || i === n - 1 ? (
            <text key={mo} x={x(i)} y={H - 6} textAnchor="middle" className="chart-axis">
              {monthShort(mo)}
            </text>
          ) : null,
        )}
        {area &&
          series.map((s, k) =>
            paths[k].map((d, j) => {
              const pts = d.trim().split(/[ML]/).filter(Boolean);
              const first = pts[0].trim().split(" ")[0];
              const last = pts[pts.length - 1].trim().split(" ")[0];
              return (
                <path
                  key={`a${k}${j}`}
                  d={`${d}L${last} ${y(Math.max(bottom, 0))} L${first} ${y(Math.max(bottom, 0))} Z`}
                  fill={seriesVar(s.color)}
                  opacity={0.1}
                />
              );
            }),
          )}
        {series.map((s, k) =>
          paths[k].map((d, j) => (
            <path key={`l${k}${j}`} d={d} fill="none" stroke={seriesVar(s.color)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          )),
        )}
        {ends.map(({ s, ty, value }) => (
          <g key={s.name}>
            <circle cx={x(n - 1)} cy={y(value)} r={4.5} fill={seriesVar(s.color)} stroke="var(--color-white)" strokeWidth={2} />
            {endLabels && (
              <text x={x(n - 1) + 10} y={ty} className="chart-end">
                {formatAxis(value)}
              </text>
            )}
          </g>
        ))}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={H - m.b} stroke="var(--color-gray-500)" opacity={0.5} shapeRendering="crispEdges" />
            {series.map((s) =>
              s.values[hover] == null ? null : (
                <circle key={s.name} cx={x(hover)} cy={y(s.values[hover] as number)} r={4.5} fill={seriesVar(s.color)} stroke="var(--color-white)" strokeWidth={2} />
              ),
            )}
          </g>
        )}
        <rect
          x={m.l - 8}
          y={0}
          width={W - m.l - m.r + 16}
          height={H}
          fill="transparent"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover != null && (
        <Tooltip
          x={(x(hover) * width) / W}
          width={width}
          title={monthLong(months[hover])}
          rows={series.map((s) => ({ color: s.color, label: s.name, value: s.values[hover] == null ? "—" : formatValue(s.values[hover] as number) }))}
        />
      )}
    </div>
  );
};

export const BarChart: React.FC<{
  months: string[];
  values: number[];
  name: string;
  height?: number;
  formatAxis?: (v: number) => string;
  formatValue: (v: number) => string;
}> = ({ months, values, name, height = 190, formatAxis = (v) => String(v), formatValue }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const W = Math.max(240, width);
  const H = height;
  const m = { t: 10, r: 8, b: 26, l: 40 };
  const n = values.length;
  const ticks = niceTicks(0, Math.max(1, ...values));
  const top = ticks[ticks.length - 1];
  const band = (W - m.l - m.r) / n;
  const bw = Math.min(24, band * 0.56);
  const y = (v: number) => m.t + (1 - v / top) * (H - m.t - m.b);
  const every = W < 420 ? 2 : 1;

  return (
    <div ref={ref} className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        height={H}
        className="block w-full overflow-visible"
        role="img"
        aria-label={`${name}: ${values.map((v, i) => `${monthShort(months[i])} ${formatValue(v)}`).join(", ")}`}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="chart-axis">
              {formatAxis(t)}
            </text>
          </g>
        ))}
        {values.map((v, i) => {
          const cx = m.l + band * (i + 0.5);
          const x0 = cx - bw / 2;
          const y0 = y(v);
          const base = y(0);
          const r = Math.min(4, (base - y0) / 2);
          const d = v <= 0
            ? ""
            : `M${x0} ${base} L${x0} ${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} L${x0 + bw - r} ${y0} Q${x0 + bw} ${y0} ${x0 + bw} ${y0 + r} L${x0 + bw} ${base} Z`;
          const current = i === n - 1;
          return (
            <g key={months[i]}>
              {d && <path d={d} fill={seriesVar(current ? 2 : 1)} opacity={hover != null && hover !== i ? 0.55 : 1} />}
              <rect
                x={m.l + band * i}
                y={m.t}
                width={band}
                height={H - m.t - m.b}
                fill="transparent"
                onPointerEnter={() => setHover(i)}
                onPointerDown={() => setHover(i)}
              />
              {(i % every === 0 || current) && (
                <text x={cx} y={H - 6} textAnchor="middle" className="chart-axis">
                  {monthShort(months[i])}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <Tooltip
          x={((m.l + band * (hover + 0.5)) * width) / W}
          width={width}
          title={hover === n - 1 ? `${monthLong(months[hover])} so far` : monthLong(months[hover])}
          rows={[{ color: hover === n - 1 ? 2 : 1, label: name, value: formatValue(values[hover]) }]}
        />
      )}
    </div>
  );
};

/** Sorted horizontal bars in one hue, for a breakdown. */
export const HBarList: React.FC<{ items: { label: string; value: number }[]; format: (v: number) => string }> = ({ items, format }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="grid gap-2.5">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-3 text-xs">
          <span className="truncate text-gray-700" title={item.label}>
            {item.label}
          </span>
          <span className="flex h-2.5">
            <span
              className="h-2.5 min-w-[2px] rounded-r"
              style={{ width: `${(item.value / max) * 100}%`, background: seriesVar(1) }}
            />
          </span>
          <span className="shell-num min-w-16 text-right font-semibold text-gray-900">{format(item.value)}</span>
        </div>
      ))}
    </div>
  );
};

export const Sparkline: React.FC<{ values: (number | null)[]; color?: SeriesColor }> = ({ values, color = 1 }) => {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length < 2) return null;
  const W = 96;
  const H = 28;
  const n = values.length;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const x = (i: number) => 1 + (i * (W - 8)) / (n - 1);
  const y = (v: number) => 3 + (1 - (v - min) / (max - min || 1)) * (H - 7);
  const pts = values.map((v, i) => (v == null ? null : ([x(i), y(v)] as const))).filter((p): p is readonly [number, number] => !!p);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg className="h-7 w-24 shrink-0" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <path d={`${d} L${last[0]} ${H} L${pts[0][0]} ${H} Z`} fill={seriesVar(color)} opacity={0.1} />
      <path d={d} fill="none" stroke={seriesVar(color)} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={seriesVar(color)} stroke="var(--color-white)" strokeWidth={1.5} />
    </svg>
  );
};
