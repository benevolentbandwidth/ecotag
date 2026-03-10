import Constants from "expo-constants";
import { addScan } from "../storage/scans";
import { lookupCache, storeCache } from "../storage/imageCache";
import { ParsedTag, TagApiResponse } from "../types/api";

export interface TagImageResult {
  response: TagApiResponse;
  scanId: string;
}

export interface NormalizedApiError {
  status: number;
  code?: string;
  message: string;
}

interface GarmentMetadata {
  name: string | null;
  type: string | null;
}

function normalizeGarmentValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickDisplayName(
  parsedName: string | null,
  providedName: string | null,
): string {
  return providedName ?? parsedName ?? "Tag scan";
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
  if (normalized.endsWith(".heic")) return "image/heic";
  if (normalized.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function inferFilename(imageUri: string): string {
  const parsed = imageUri.split("/").pop();
  if (parsed && parsed.includes(".")) return parsed;
  const mime = inferMimeType(imageUri);
  if (mime === "image/png") return "upload.png";
  return "upload.jpg";
}

function makeScanId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildDisplayName(parsed: ParsedTag | undefined): string {
  const materials = parsed?.materials ?? [];
  const top = materials
    .slice()
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 2)
    .map((m) => `${m.pct}% ${m.fiber}`);

  return top.length > 0 ? top.join(" + ") : "Tag scan";
}

function recordScan(params: {
  success: 0 | 1;
  co2e_grams: number;
  display_name: string | null;
  category: string | null;
  error_code: string | null;
  result: unknown;
}): string {
  const id = makeScanId();
  try {
    addScan({
      id,
      created_at: Date.now(),
      success: params.success,
      co2e_grams: params.co2e_grams,
      display_name: params.display_name,
      category: params.category,
      error_code: params.error_code,
      result: params.result,
    });
  } catch (err) {
    console.warn("[EcoTag] Failed to write scan history:", err);
  }
  return id;
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

export async function tagImage(
  imageUri: string,
  garmentName = "",
  garmentType = "",
): Promise<TagImageResult> {
  const metadata: GarmentMetadata = {
    name: normalizeGarmentValue(garmentName),
    type: normalizeGarmentValue(garmentType),
  };

  const cached = await lookupCache(imageUri);
  if (cached) {
    const scanId = recordScan({
      success: 1,
      co2e_grams: Math.round(cached.emissions.total_kgco2e * 1000),
      display_name: pickDisplayName(buildDisplayName(cached.parsed), metadata.name),
      category: metadata.type,
      error_code: null,
      result: { parsed: cached.parsed, emissions: cached.emissions },
    });
    return { response: cached, scanId };
  }

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
    if (jsonBody && typeof jsonBody === "object") {
      const body = jsonBody as { error?: { code?: string; message?: string } };
      if (body.error) {
        recordScan({
          success: 0,
          co2e_grams: 0,
          display_name: pickDisplayName("Tag scan", metadata.name),
          category: metadata.type,
          error_code: body.error.code ?? null,
          result: { error: body.error },
        });
      }
    }

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

  const response = parsed as TagApiResponse;
  await storeCache(imageUri, response);
  const scanId = recordScan({
    success: 1,
    co2e_grams: Math.round(response.emissions.total_kgco2e * 1000),
    display_name: pickDisplayName(buildDisplayName(response.parsed), metadata.name),
    category: metadata.type,
    error_code: null,
    result: { parsed: response.parsed, emissions: response.emissions },
  });

  return { response, scanId };
}
