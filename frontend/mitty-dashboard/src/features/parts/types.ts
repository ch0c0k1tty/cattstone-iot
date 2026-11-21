/** UI-facing types, intentionally independent of the future hub wire format. */
export type ConnectionStatus = "online" | "offline" | "unknown";
export type PartKind = "sensor" | "actor";
export type ReadingValue = number | string | boolean | null;

export interface HistoryPoint {
  at: string; // ISO 8601 timestamp
  value: ReadingValue;
  source?: "system" | "person";
}

export interface Metric {
  id: string;
  label: string;
  kind: "reading" | "control" | "moment";
  value: ReadingValue;
  unit?: string;
  format?: "line" | "level" | "shade" | "band" | "ticks";
  min?: number;
  max?: number;
  usual?: ReadingValue;
  options?: Array<{ label: string; value: string }>;
  thresholds?: Array<{ value: number; label: string }>;
  history: HistoryPoint[];
  writable?: boolean;
}

export interface Part {
  id: string;
  name: string;
  type: string;
  kind: PartKind;
  status: ConnectionStatus;
  nodeId: string;
  socket: string;
  description?: string;
  usedBy: string[];
  metrics: Metric[];
}

export interface Socket {
  id: string;
  label: string;
  partId: string | null;
}
export interface Node {
  id: string;
  name: string;
  status: ConnectionStatus;
  sockets: Socket[];
  fallbackActions: string[];
}
export interface Hub {
  id: string;
  name: string;
  status: ConnectionStatus;
}
export interface Routine {
  id: string;
  name: string;
  partIds: string[];
}
export interface PartsSnapshot {
  updatedAt: string;
  hub: Hub;
  nodes: Node[];
  parts: Part[];
  routines: Routine[];
  notices?: string[];
}

/** The API adapter is the only thing that changes when endpoints are chosen. */
export interface PartsDataSource {
  getSnapshot(signal?: AbortSignal): Promise<PartsSnapshot>;
  setControl(partId: string, metricId: string, value: ReadingValue): Promise<void>;
}
