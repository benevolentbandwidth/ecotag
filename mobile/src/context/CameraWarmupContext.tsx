import React, { createContext, useContext } from "react";
import {
  CameraWarmupState,
  useCameraEagerLoad,
} from "../hooks/useCameraEagerLoad";
import { useMetrics } from "./MetricsContext";

const CameraWarmupContext = createContext<CameraWarmupState | null>(null);

export function CameraWarmupProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const metrics = useMetrics();
  const warmup = useCameraEagerLoad(metrics);

  return (
    <CameraWarmupContext.Provider value={warmup}>
      {children}
    </CameraWarmupContext.Provider>
  );
}

export function useCameraWarmup(): CameraWarmupState {
  const ctx = useContext(CameraWarmupContext);
  if (!ctx) {
    throw new Error(
      "useCameraWarmup must be used within a CameraWarmupProvider",
    );
  }
  return ctx;
}
