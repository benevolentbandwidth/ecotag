import Constants from "expo-constants";
import { TagApiResponse } from "../types/api";

export interface NormalizedApiError {
  status: number;
  code?: string;
  message: string;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

// Order of precedence:
// 1) EXPO_PUBLIC_API_BASE_URL
// 2) Expo dev host IP with backend port 3001
// 3) localhost fallback
function getApiBase(): string {
  const configuredBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (configuredBase) {
    return stripTrailingSlash(configuredBase);
  }

  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.86.53:8081"
    const host = hostUri?.split(":")[0] ?? "localhost";
    return `http://${host}:3001`;
  }

  return "http://localhost:3001";
}

const API_BASE = getApiBase();
const TAG_ENDPOINT = `${API_BASE}/api/tag`;

// Module-level pending image URI store to avoid passing large route params
let pendingImage: string | null = null;

export function setPendingScanImage(imageUri: string): void {
  pendingImage = imageUri;
}

export function consumePendingScanImage(): string | null {
  const image = pendingImage;
  pendingImage = null;
  return image;
}

function inferMimeType(imageUri: string): string {
  const normalized = imageUri.toLowerCase();
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".jpeg") || normalized.endsWith(".jpg")) {
    return "image/jpeg";
  }
  return "application/octet-stream";
}

function inferFilename(imageUri: string): string {
  const parsed = imageUri.split("/").pop();
  if (parsed && parsed.includes(".")) return parsed;
  const mime = inferMimeType(imageUri);
  if (mime === "image/png") return "upload.png";
  return "upload.jpg";
}

function normalizeErrorPayload(
  status: number,
  statusText: string,
  body: unknown,
): NormalizedApiError {
  if (body && typeof body === "object") {
    const json = body as {
      error?: { code?: string; message?: string };
      message?: string;
    };
    const code = json.error?.code;
    const message = json.error?.message ?? json.message;
    if (typeof message === "string" && message.length > 0) {
      return { status, code, message };
    }
  }

  return {
    status,
    message:
      statusText || `Request failed with status ${status || 0}. Try again.`,
  };
}

export async function tagImage(imageUri: string): Promise<TagApiResponse> {
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    name: inferFilename(imageUri),
    type: inferMimeType(imageUri),
  } as any);

  let res: Response;
  try {
    res = await fetch(TAG_ENDPOINT, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    throw {
      status: 0,
      message: "Unable to reach backend. Check API base URL and try again.",
    } satisfies NormalizedApiError;
  }

  const rawBody = await res.text();
  let jsonBody: unknown = null;
  if (rawBody) {
    try {
      jsonBody = JSON.parse(rawBody);
    } catch {
      jsonBody = null;
    }
  }

  if (!res.ok) {
    if (jsonBody) {
      throw normalizeErrorPayload(res.status, res.statusText, jsonBody);
    }
    throw {
      status: res.status,
      message:
        rawBody || res.statusText || `Request failed with status ${res.status}`,
    } satisfies NormalizedApiError;
  }

  if (!jsonBody || typeof jsonBody !== "object") {
    throw {
      status: res.status,
      message: "Received a non-JSON response from backend.",
    } satisfies NormalizedApiError;
  }

  const parsed = jsonBody as Partial<TagApiResponse>;
  if (!parsed.parsed || !parsed.emissions) {
    throw {
      status: res.status,
      message: "Backend response is missing expected fields.",
    } satisfies NormalizedApiError;
  }

  return parsed as TagApiResponse;
}
