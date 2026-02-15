import { useCallback, useMemo, useRef } from "react";

export type MetricEvent =
  | "cameraOpenStart"
  | "cameraOpenEnd"
  | "captureStart"
  | "captureEnd"
  | "uploadStart"
  | "uploadEnd"
  | "eagerWarmupStart"
  | "eagerWarmupEnd";

export interface ScanMetrics {
  cameraOpenStart: number | null;
  cameraOpenEnd: number | null;
  captureStart: number | null;
  captureEnd: number | null;
  uploadStart: number | null;
  uploadEnd: number | null;
  eagerWarmupStart: number | null;
  eagerWarmupEnd: number | null;
}

export interface ComputedMetrics {
  cameraOpenMs: number | null;
  captureMs: number | null;
  uploadMs: number | null;
  eagerWarmupMs: number | null;
}

function createEmptyMetrics(): ScanMetrics {
  return {
    cameraOpenStart: null,
    cameraOpenEnd: null,
    captureStart: null,
    captureEnd: null,
    uploadStart: null,
    uploadEnd: null,
    eagerWarmupStart: null,
    eagerWarmupEnd: null,
  };
}

function computeDeltas(m: ScanMetrics): ComputedMetrics {
  const delta = (start: number | null, end: number | null) =>
    start != null && end != null ? end - start : null;

  return {
    cameraOpenMs: delta(m.cameraOpenStart, m.cameraOpenEnd),
    captureMs: delta(m.captureStart, m.captureEnd),
    uploadMs: delta(m.uploadStart, m.uploadEnd),
    eagerWarmupMs: delta(m.eagerWarmupStart, m.eagerWarmupEnd),
  };
}

export interface PerformanceMetricsAPI {
  mark: (event: MetricEvent) => void;
  getRaw: () => ScanMetrics;
  getComputed: () => ComputedMetrics;
  reset: () => void;
  logToConsole: () => void;
}

export function usePerformanceMetrics(): PerformanceMetricsAPI {
  const metricsRef = useRef<ScanMetrics>(createEmptyMetrics());

  const mark = useCallback((event: MetricEvent) => {
    metricsRef.current[event] = performance.now();
  }, []);

  const getRaw = useCallback(() => ({ ...metricsRef.current }), []);

  const getComputed = useCallback(
    () => computeDeltas(metricsRef.current),
    [],
  );

  const reset = useCallback(() => {
    metricsRef.current = createEmptyMetrics();
  }, []);

  const logToConsole = useCallback(() => {
    const computed = computeDeltas(metricsRef.current);
    const fmt = (ms: number | null) =>
      ms != null ? `${ms.toFixed(1)}ms` : "—";

    console.log("[EcoTag Metrics]", {
      cameraOpen: fmt(computed.cameraOpenMs),
      capture: fmt(computed.captureMs),
      upload: fmt(computed.uploadMs),
      eagerWarmup: fmt(computed.eagerWarmupMs),
    });
  }, []);

  return useMemo(
    () => ({ mark, getRaw, getComputed, reset, logToConsole }),
    [mark, getRaw, getComputed, reset, logToConsole],
  );
}
