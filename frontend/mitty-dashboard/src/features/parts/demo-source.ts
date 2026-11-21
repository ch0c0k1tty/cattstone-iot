import type { HistoryPoint, PartsDataSource, PartsSnapshot, ReadingValue } from "./types";

const now = Date.now();
const history = (values: number[], minutesApart = 15): HistoryPoint[] => values.map((value, i) => ({
  at: new Date(now - (values.length - i - 1) * minutesApart * 60_000).toISOString(),
  value,
}));

const seed: PartsSnapshot = {
  updatedAt: new Date(now).toISOString(),
  hub: { id: "hub-1", name: "Mitty Hub", status: "online" },
  nodes: [
    { id: "node-1", name: "Window Bud", status: "online", sockets: [
      { id: "a0", label: "Socket 1", partId: "soil-1" },
      { id: "d1", label: "Socket 2", partId: "pump-1" },
      { id: "a2", label: "Socket 3", partId: null },
    ], fallbackActions: ["Turn the pump off if the hub connection is lost", "Limit each watering cycle to 15 seconds"] },
    { id: "node-2", name: "Shelf Bud", status: "online", sockets: [
      { id: "i2c0", label: "Socket 1", partId: "temp-1" },
      { id: "pwm1", label: "Socket 2", partId: "light-1" },
    ], fallbackActions: ["Turn the light off if the hub connection is lost"] },
  ],
  parts: [
    { id: "soil-1", name: "Soil moisture", type: "Capacitive moisture sensor", kind: "sensor", status: "online", nodeId: "node-1", socket: "a0", usedBy: ["Basil"], metrics: [
      { id: "moisture", label: "Moisture", kind: "reading", value: 42, unit: "%", format: "level", min: 0, max: 100, thresholds: [{ value: 30, label: "Watering threshold" }], history: history([65, 63, 61, 59, 58, 55, 51, 47, 42]) },
    ] },
    { id: "pump-1", name: "Water pump", type: "5V pump", kind: "actor", status: "online", nodeId: "node-1", socket: "d1", usedBy: ["Basil"], metrics: [
      { id: "power", label: "Power", kind: "control", value: "off", usual: "off", options: [{ value: "off", label: "Off" }, { value: "on", label: "On" }], format: "band", writable: true, history: [
        { at: new Date(now - 35 * 60_000).toISOString(), value: "off" },
        { at: new Date(now - 22 * 60_000).toISOString(), value: "on" },
        { at: new Date(now - 21 * 60_000).toISOString(), value: "off" },
      ] },
    ] },
    { id: "temp-1", name: "Air sensor", type: "Temperature and humidity", kind: "sensor", status: "online", nodeId: "node-2", socket: "i2c0", usedBy: ["Shelf plants"], metrics: [
      { id: "temperature", label: "Temperature", kind: "reading", value: 21.8, unit: "°C", format: "line", history: history([20.4, 20.8, 21.1, 21.9, 22.3, 22.1, 22.0, 21.9, 21.8]) },
      { id: "humidity", label: "Humidity", kind: "reading", value: 56, unit: "%", format: "level", min: 0, max: 100, history: history([60, 59, 58, 58, 56, 55, 55, 56, 56]) },
    ] },
    { id: "light-1", name: "Grow light", type: "Dimmable grow light", kind: "actor", status: "online", nodeId: "node-2", socket: "pwm1", usedBy: ["Shelf plants"], metrics: [
      { id: "brightness", label: "Brightness", kind: "control", value: 70, unit: "%", min: 0, max: 100, usual: 0, format: "band", writable: true, history: history([0, 0, 40, 40, 70, 70, 70, 70, 70]) },
    ] },
  ],
  routines: [
    { id: "basil", name: "Basil", partIds: ["soil-1", "pump-1"] },
    { id: "shelf", name: "Shelf plants", partIds: ["temp-1", "light-1"] },
  ],
};

const clone = <T,>(value: T): T => structuredClone(value);

/** In-memory demo only. No hardware commands are sent. */
export function createDemoPartsSource(): PartsDataSource {
  let data = clone(seed);
  return {
    async getSnapshot() { return clone(data); },
    async setControl(partId: string, metricId: string, value: ReadingValue) {
      const metric = data.parts.find((p) => p.id === partId)?.metrics.find((m) => m.id === metricId);
      if (!metric || !metric.writable) throw new Error("Control is not available");
      if (metric.options && !metric.options.some((option) => option.value === value)) throw new Error("Invalid control value");
      if (typeof value === "number" && ((metric.min !== undefined && value < metric.min) || (metric.max !== undefined && value > metric.max))) throw new Error("Value outside allowed range");
      metric.value = value;
      metric.history.push({ at: new Date().toISOString(), value, source: "person" });
      data.updatedAt = new Date().toISOString();
    },
  };
}
