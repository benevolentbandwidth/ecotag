import Constants from "expo-constants";
import { ScanResponse } from "../types/api";

// In dev, derive the API host from Expo's dev server connection.
// This automatically uses the same LAN IP that Expo uses, so every
// developer's phone reaches their own machine — no hardcoded IPs.
function getApiBase(): string {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.86.53:8081"
    const host = hostUri?.split(":")[0] ?? "localhost";
    return `http://${host}:8000`;
  }
  return "http://localhost:8000"; // replace with production URL later
}

const API_BASE = getApiBase();

// Module-level pending image store to avoid passing large base64 via route params
let pendingImage: string | null = null;

export function setPendingScanImage(base64: string): void {
  pendingImage = base64;
}

export function consumePendingScanImage(): string | null {
  const image = pendingImage;
  pendingImage = null;
  return image;
}

export async function submitScan(
  imageBase64: string,
  opts?: { weight_g?: number; washes_per_month?: number },
): Promise<ScanResponse> {
  const res = await fetch(`${API_BASE}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_base64: imageBase64,
      weight_g: opts?.weight_g ?? null,
      washes_per_month: opts?.washes_per_month ?? null,
    }),
  });

  if (!res.ok) {
    throw new Error(`Scan request failed: ${res.status}`);
  }

  return res.json() as Promise<ScanResponse>;
}
