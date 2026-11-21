import { useMemo, useState, type PointerEvent } from "react";
import {
  AlertTriangle, ChevronDown, ChevronRight, CircleHelp,
  Droplets, Gauge, Lightbulb, Plug, Radio, RefreshCw, ShieldCheck,
  Thermometer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { createDemoPartsSource } from "@/features/parts/demo-source";
import { useParts } from "@/features/parts/use-parts";
import type { ConnectionStatus, Metric, Part, PartsDataSource, PartsSnapshot, ReadingValue } from "@/features/parts/types";

import { Render } from "@/lib/renders";

// Stable instance: swapping this prop is all that's needed to connect a real provider.
const demoSource = createDemoPartsSource();
const RANGES = [60, 360, 1440] as const;
const fmtTime = (time: number, range: number) => new Date(time).toLocaleTimeString([], {
  hour: "numeric", ...(range <= 60 ? { minute: "2-digit" as const } : {}),
});
const toMs = (at: string) => new Date(at).getTime();
const present = (value: ReadingValue, unit?: string) => value === null ? "—" :
  typeof value === "boolean" ? (value ? "On" : "Off") : `${value}${unit ? ` ${unit}` : ""}`;

function Status({ status }: { status: ConnectionStatus }) {
  return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
    <span className={`size-2 rounded-full ${status === "online" ? "bg-emerald-500" : status === "offline" ? "bg-amber-500" : "border border-muted-foreground"}`} />
    {status === "online" ? "Online" : status === "offline" ? "Offline" : "Unknown"}
  </span>;
}
function PartIcon({ part }: { part: Part }) {
  const name = `${part.type} ${part.name}`.toLowerCase();
  const I = (name.includes("pump") ? Droplets : 
            name.includes("light") ? Lightbulb :
            name.includes("temper") || name.includes("air") ? Thermometer : 
              name.includes("moist") ? Gauge : Plug);
  return <div className={`grid size-11 shrink-0 place-items-center rounded-xl border ${part.kind === "sensor" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-blue-500/10 text-blue-700 dark:text-blue-300"}`}><I className="size-5" /></div>;
}

function valueAt(metric: Metric, time: number): ReadingValue {
  const points = [...metric.history].sort((a, b) => toMs(a.at) - toMs(b.at));
  return points.filter((point) => toMs(point.at) <= time).at(-1)?.value ?? null;
}

/** Graph rendering is local presentation logic; it doesn't know anything about the hub API. */
function MetricStrip({ metric, from, to }: { metric: Metric; from: number; to: number }) {
  const points = [...metric.history].sort((a, b) => toMs(a.at) - toMs(b.at));
  const lastBefore = points.filter((p) => toMs(p.at) < from).at(-1);
  const windowPoints = [...(lastBefore ? [{ ...lastBefore, at: new Date(from).toISOString() }] : []), ...points.filter((p) => toMs(p.at) >= from && toMs(p.at) <= to)];
  const x = (t: number) => Math.max(0, Math.min(1000, ((t - from) / (to - from)) * 1000));
  const numeric = windowPoints.filter((p): p is typeof p & { value: number } => typeof p.value === "number");
  const lo = metric.min ?? Math.min(...numeric.map((p) => p.value), ...((metric.thresholds ?? []).map((p) => p.value)));
  const hi = metric.max ?? Math.max(...numeric.map((p) => p.value), ...((metric.thresholds ?? []).map((p) => p.value)));
  const span = Number.isFinite(hi - lo) ? Math.max(hi - lo, 1) : 1;
  const y = (value: number) => 90 - ((value - (Number.isFinite(lo) ? lo : 0)) / span) * 80;
  const band = metric.kind === "control" || metric.format === "band";
  const ticks = metric.kind === "moment" || metric.format === "ticks";

  return <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true" className="h-10 w-full overflow-visible">
    {ticks ? <>
      <line x1="0" x2="1000" y1="50" y2="50" stroke="currentColor" opacity=".18" />
      {windowPoints.filter((p) => p.value !== null).map((p, i) =>
        <rect key={i} x={x(toMs(p.at))} y="12" width="4" height="76" rx="2" className="fill-slate-500" />)}
    </> : band ? <>
      <rect x="0" y="35" width="1000" height="30" rx="8" className="fill-muted" />
      {windowPoints.map((point, i) => {
        const begin = x(toMs(point.at));
        const end = x(i + 1 < windowPoints.length ? toMs(windowPoints[i + 1].at) : to);
        const active = point.value !== null && point.value !== metric.usual && point.value !== "off" && point.value !== false && point.value !== 0;
        return active ? <rect key={i} x={begin} y="35" width={Math.max(3, end - begin)} height="30" rx="3" className={point.source === "person" ? "fill-cyan-500" : "fill-blue-400"} /> : null;
      })}
    </> : numeric.length ? <>
      {metric.thresholds?.map((threshold, i) => <line key={i} x1="0" x2="1000" y1={y(threshold.value)} y2={y(threshold.value)} stroke="currentColor" opacity=".35" strokeDasharray="8 8"><title>{threshold.label}: {threshold.value}</title></line>)}
      {metric.format === "level" && <polygon points={`0,100 ${numeric.map((p) => `${x(toMs(p.at))},${y(p.value)}`).join(" ")} 1000,${y(numeric.at(-1)!.value)} 1000,100`} className="fill-emerald-500/15" />}
      <polyline points={[...numeric.map((p) => `${x(toMs(p.at))},${y(p.value)}`), `1000,${y(numeric.at(-1)!.value)}`].join(" ")} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" className="text-emerald-600 dark:text-emerald-400" />
    </> : <line x1="0" x2="1000" y1="50" y2="50" stroke="currentColor" strokeDasharray="6 8" opacity=".25" />}
  </svg>;
}

function Control({ part, metric, disabled, commit }: {
  part: Part; metric: Metric; disabled: boolean;
  commit: (partId: string, metricId: string, value: ReadingValue) => Promise<void>;
}) {
  const [draft, setDraft] = useState(String(metric.value ?? metric.min ?? 0));
  if (!metric.writable) return <span className="font-mono text-sm tabular-nums">{present(metric.value, metric.unit)}</span>;
  if (metric.options?.length) return <Select value={String(metric.value ?? "")} disabled={disabled} onValueChange={(value) => { void commit(part.id, metric.id, value); }}>
    <SelectTrigger size="sm" className="h-8 w-28" aria-label={`Set ${part.name}: ${metric.label}`}><SelectValue placeholder="Choose" /></SelectTrigger>
    <SelectContent>{metric.options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
  </Select>;
  return <form className="flex items-center gap-1" onSubmit={(event) => {
    event.preventDefault();
    const number = Number(draft);
    if (!Number.isFinite(number) || (metric.min !== undefined && number < metric.min) || (metric.max !== undefined && number > metric.max)) return;
    void commit(part.id, metric.id, number);
  }}>
    <Input type="number" className="h-8 w-20" aria-label={`Set ${part.name}: ${metric.label}`} min={metric.min} max={metric.max} value={draft} onChange={(e) => setDraft(e.target.value)} disabled={disabled} />
    {metric.unit && <span className="text-xs text-muted-foreground">{metric.unit}</span>}
    <Button size="sm" variant="outline" type="submit" disabled={disabled}>Set</Button>
  </form>;
}

function PartRows({ part, from, to, cursor, disabled, commit }: {
  part: Part; from: number; to: number; cursor: number | null; disabled: boolean;
  commit: (partId: string, metricId: string, value: ReadingValue) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  return <div className="border-b py-3 last:border-b-0">
    <div className="grid gap-x-4 gap-y-2 lg:grid-cols-[190px_minmax(0,1fr)]">
      <div className="flex items-start gap-2">
        <PartIcon part={part} />
        <div className="min-w-0">
          <button className="inline-flex items-center gap-1 text-left font-medium hover:underline" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
            {expanded ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
            <span className="break-words">{part.name}</span>
          </button>
          <div><Status status={part.status} /></div>
        </div>
      </div>
      <div className="space-y-2">
        {part.metrics.map((metric) => <div key={metric.id} className="grid items-center gap-2 sm:grid-cols-[90px_minmax(0,1fr)_135px]">
          <div className="text-xs text-muted-foreground">{metric.label}</div>
          <MetricStrip metric={metric} from={from} to={to} />
          <div className="justify-self-end text-right">
            {cursor !== null ? <span className="font-mono text-sm text-muted-foreground tabular-nums">{present(valueAt(metric, cursor), metric.unit)}</span> :
              <Control part={part} metric={metric} disabled={disabled || part.status !== "online"} commit={commit} />}
          </div>
        </div>)}
      </div>
    </div>
    {expanded && <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground lg:ml-[206px]">
      <div className="font-medium text-foreground">{part.type}</div>
      <div>Connected to {part.nodeId} · {part.socket}</div>
      <div>Used by: {part.usedBy.join(", ") || "No builds"}</div>
      {part.description && <p className="mt-1">{part.description}</p>}
    </div>}
  </div>;
}

function RoutineStrips({ name, parts, from, to, cursor, setCursor, pending, commit }: {
  name: string; parts: Part[]; from: number; to: number; cursor: number | null;
  setCursor: (t: number | null) => void; pending: string | null;
  commit: (partId: string, metricId: string, value: ReadingValue) => Promise<void>;
}) {
  const place = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setCursor(ratio > .985 ? null : from + ratio * (to - from));
  };
  const ratio = cursor === null ? 1 : Math.max(0, Math.min(1, (cursor - from) / (to - from)));
  return <Card>
    <CardHeader className="pb-2"><CardTitle className="text-lg">{name}</CardTitle></CardHeader>
    <CardContent>
      {parts.map((part) => <PartRows key={part.id} part={part} from={from} to={to} cursor={cursor} disabled={pending !== null} commit={commit} />)}
      <div className="mt-3 space-y-2">
        <div className="flex justify-between pl-0 font-mono text-[11px] text-muted-foreground"><span>{fmtTime(from, to - from)}</span><span>{cursor === null ? "Now" : fmtTime(cursor, to - from)}</span><span>{fmtTime(to, to - from)}</span></div>
        <div role="slider" tabIndex={0} aria-label={`History cursor for ${name}`} aria-valuemin={Math.floor(from)} aria-valuemax={Math.ceil(to)} aria-valuenow={Math.round(cursor ?? to)} aria-valuetext={cursor === null ? "Now" : new Date(cursor).toLocaleString()}
          className="relative h-6 cursor-ew-resize touch-pan-y rounded-md bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); place(event); }}
          onPointerMove={(event) => { if (event.buttons === 1 && event.currentTarget.hasPointerCapture(event.pointerId)) place(event); }}
          onKeyDown={(event) => {
            const step = (to - from) / 100;
            if (event.key === "End") setCursor(null);
            else if (event.key === "Home") setCursor(from);
            else if (event.key === "ArrowLeft") setCursor(Math.max(from, (cursor ?? to) - step));
            else if (event.key === "ArrowRight") { const next = (cursor ?? to) + step; setCursor(next >= to ? null : next); }
            else return;
            event.preventDefault();
          }}>
          <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary" style={{ left: `${ratio * 100}%` }} />
          <div className="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background" style={{ left: `${ratio * 100}%` }} />
        </div>
        {cursor !== null && <Button variant="ghost" size="sm" onClick={() => setCursor(null)}>Return to now</Button>}
      </div>
    </CardContent>
  </Card>;
}

function Network({ data }: { data: PartsSnapshot }) {
  const [selected, setSelected] = useState<string | null>(null);
  const node = data.nodes.find((n) => n.id === selected);
  return <Card>
    <CardContent>
      <div className="flex flex-wrap items-center gap-2 sm:gap-5">
        <div className="inline-flex items-center gap-2">
          <Render name="hub-on" />
          <span className="font-medium">{data.hub.name}</span><Status status={data.hub.status} />
        </div>
        {data.nodes.map((n) => <Button key={n.id} size="sm" variant={selected === n.id ? "secondary" : "ghost"} onClick={() => setSelected(selected === n.id ? null : n.id)} aria-expanded={selected === n.id}>
          <Render name="bud-on" />
          {n.name}
          <Status status={n.status} />
          {selected === n.id ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </Button>)}
      </div>
      {node && <div className="grid gap-5 rounded-lg border bg-muted/30 p-4 md:grid-cols-[minmax(0,3fr)_minmax(220px,1fr)] network-item">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {node.sockets.map((socket) => {
            const part = data.parts.find((p) => p.id === socket.partId);
            return <div key={socket.id} className={`min-h-24 rounded-lg border p-3 ${part ? "bg-background" : "border-dashed"}`}>
              <div className="text-xs text-muted-foreground">{socket.label}</div>
              <div className="mt-2 text-sm font-medium">{part?.name ?? "Empty"}</div>
              {part && <Status status={part.status} />}
            </div>;
          })}
        </div>
        <div><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4" />Node safety behavior</div>
          {node.fallbackActions.length ? <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">{node.fallbackActions.map((action, i) => <li key={i}>{action}</li>)}</ul> : <p className="mt-2 text-xs text-muted-foreground">No fallback actions reported.</p>}
        </div>
      </div>}
    </CardContent>
  </Card>;
}

export function Parts({ source = demoSource }: { source?: PartsDataSource }) {
  const { data, loading, error, pending, refresh, setControl } = useParts(source);
  const [minutes, setMinutes] = useState<number>(1440);
  const [cursor, setCursor] = useState<number | null>(null);
  const to = data ? toMs(data.updatedAt) : Date.now();
  const from = to - minutes * 60_000;
  const partsById = useMemo(() => new Map(data?.parts.map((part) => [part.id, part]) ?? []), [data]);

  return <section className="space-y-6" aria-label="Parts">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-semibold tracking-tight">Parts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Readings, controls, and connections in your space.</p></div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1" role="group" aria-label="History range">
          {RANGES.map((r) => <Button key={r} size="sm" variant={r === minutes ? "secondary" : "outline"} aria-pressed={r === minutes} onClick={() => { setMinutes(r); setCursor(null); }}>{r === 60 ? "1 hour" : r === 360 ? "6 hours" : "1 day"}</Button>)}
        </div>
        <Button size="icon" variant="ghost" aria-label="Refresh parts" onClick={() => void refresh()}><RefreshCw className="size-4" /></Button>
      </div>
    </div>
    {error && <div role="alert" className="flex gap-2 rounded-lg border border-destructive/40 p-3 text-sm text-destructive"><AlertTriangle className="size-4 shrink-0" />{error}</div>}
    {loading && !data ? <div role="status" className="rounded-lg border p-8 text-muted-foreground">Loading parts…</div> : !data ? <div className="rounded-lg border p-8 text-muted-foreground">No hub data available. Check your data source.</div> : <>
      {source === demoSource && <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground"><CircleHelp className="size-4" />Demo data — commands change only the in-memory example, not physical hardware.</div>}
      {data.notices?.map((notice, index) => <div key={index} className="flex items-center gap-2 rounded-lg border p-3 text-sm"><AlertTriangle className="size-4" />{notice}</div>)}
      <Network data={data} />
      {data.routines.map((routine) => <RoutineStrips key={routine.id} name={routine.name}
        parts={routine.partIds.map((id) => partsById.get(id)).filter((p): p is Part => Boolean(p))}
        from={from} to={to} cursor={cursor} setCursor={setCursor} pending={pending} commit={setControl} />)}
      {!data.routines.length && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No builds have parts yet.</div>}
      <p className="text-xs text-muted-foreground">Last snapshot: {new Date(data.updatedAt).toLocaleString()}. Historical values are read-only.</p>
    </>}
  </section>;
}
