import React, { createContext, useContext } from "react";
import {
  PerformanceMetricsAPI,
  usePerformanceMetrics,
} from "../hooks/usePerformanceMetrics";

const MetricsContext = createContext<PerformanceMetricsAPI | null>(null);

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const metrics = usePerformanceMetrics();
  return (
    <MetricsContext.Provider value={metrics}>
      {children}
    </MetricsContext.Provider>
  );
}

export function useMetrics(): PerformanceMetricsAPI {
  const ctx = useContext(MetricsContext);
  if (!ctx) {
    throw new Error("useMetrics must be used within a MetricsProvider");
  }
  return ctx;
}
