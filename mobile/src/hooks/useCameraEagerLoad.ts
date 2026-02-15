import { useEffect, useState } from "react";
import { Camera } from "expo-camera";
import type { PermissionStatus } from "expo-camera";
import type { PerformanceMetricsAPI } from "./usePerformanceMetrics";

export interface CameraWarmupState {
  permissionStatus: PermissionStatus | null;
  isWarmedUp: boolean;
}

export function useCameraEagerLoad(
  metrics: PerformanceMetricsAPI,
): CameraWarmupState {
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus | null>(null);
  const [isWarmedUp, setIsWarmedUp] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function warmup() {
      metrics.mark("eagerWarmupStart");

      const { status } = await Camera.requestCameraPermissionsAsync();

      if (!cancelled) {
        setPermissionStatus(status);
        setIsWarmedUp(true);
        metrics.mark("eagerWarmupEnd");
      }
    }

    warmup();

    return () => {
      cancelled = true;
    };
  }, [metrics]);

  return { permissionStatus, isWarmedUp };
}
