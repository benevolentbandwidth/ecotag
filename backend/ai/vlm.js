// vlm.js
// Vision-language-model dispatcher. Selects a provider at server start
// based on VLM_PROVIDER (google | openai) and exposes a single
// extractTagFromImage(dataUrl) entry point that callers use regardless of
// which provider is active.

import dotenv from "dotenv";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { TagSchema, TagJsonSchema } from "./schema.js";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const SYSTEM_PROMPT = `You are an expert at reading clothing care/composition tags.
Step 1: Read ALL visible text on the tag exactly as printed and put it in the "ocr_text" field.
Step 2: Using the ocr_text you just extracted, you MUST populate the structured fields below. Do NOT return null or [] if the information is present in the ocr_text.
  • country  – the country of origin or manufacture. Only null if truly not visible.
  • materials – an array of {fiber, pct} objects for the fabric composition. Parse percentages and fiber names from ocr_text (e.g. "80%SILK" → {fiber:"Silk",pct:80}). Only [] if truly not visible.
  • care – an object with exactly four keys: washing, drying, ironing, dry_cleaning. Each key must be present and set to one of the allowed values below, or null if not visible.
    - washing: machine_wash_cold, machine_wash_warm, machine_wash_hot, machine_wash_gentle, hand_wash_cold, hand_wash_warm
    - drying: tumble_dry_low, tumble_dry_medium, tumble_dry_high, lay_flat_to_dry, line_dry, do_not_tumble_dry
    - ironing: iron_low, iron_medium, iron_high, do_not_iron
    - dry_cleaning: dry_clean, dry_clean_only
IMPORTANT: If ocr_text contains country or material info, you MUST extract it into the structured fields. Do not leave them null/empty when the data is in ocr_text.
Return ONLY the JSON object. Do not return care as a string. Be precise with percentages, fiber names, and care keys.`;

const USER_PROMPT =
  "First read ALL visible text on this clothing tag image, then extract the country, materials, and care instructions from it.";

const DEFAULT_MODELS = {
  google: "gemini-2.5-pro",
  openai: "gpt-4o",
};

const SUPPORTED_PROVIDERS = new Set(["google", "openai"]);

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 500;

export function getVLMConfig() {
  const provider = (process.env.VLM_PROVIDER ?? "google").toLowerCase();
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new Error(
      `Unknown VLM_PROVIDER: "${provider}". Expected "google" or "openai".`,
    );
  }
  const model = process.env.VLM_MODEL ?? DEFAULT_MODELS[provider];
  return { provider, model };
}

const PROVIDER_API_KEYS = {
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  openai: "OPENAI_API_KEY",
};

export function checkVLMStartupConfig() {
  const provider = (process.env.VLM_PROVIDER ?? "google").toLowerCase();
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    console.warn(
      `[VLM] Unknown VLM_PROVIDER: "${provider}". Expected "google" or "openai". VLM requests will fail.`,
    );
    return;
  }
  const keyVar = PROVIDER_API_KEYS[provider];
  if (!process.env[keyVar]) {
    console.warn(
      `[VLM] ${keyVar} is not set; ${provider} requests will fail until it is provided.`,
    );
  }
}

function shouldRetry(err) {
  if (!err) return false;
  const status = err.status ?? err.statusCode ?? err.response?.status;
  if (status === 429) return true;
  if (typeof status === "number" && status >= 500 && status < 600) return true;
  const code = err.code ?? err.cause?.code;
  return code === "ETIMEDOUT" || code === "ECONNRESET" || code === "ENOTFOUND";
}

async function withRetries(fn) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_RETRIES || !shouldRetry(err)) throw err;
      const delay = BASE_DELAY_MS * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

let openaiClient = null;
function getOpenAIClient() {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

let geminiClient = null;
function getGeminiClient() {
  if (geminiClient) return geminiClient;
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Image must be a base64 data URL");
  return { mimeType: match[1], data: match[2] };
}

async function callOpenAI(dataUrl, model) {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          { type: "text", text: USER_PROMPT },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "clothing_tag", strict: true, schema: TagJsonSchema },
    },
  });
  return JSON.parse(response.choices[0].message.content);
}

async function callGemini(dataUrl, model) {
  const client = getGeminiClient();
  const { mimeType, data } = parseDataUrl(dataUrl);
  console.log("[VLM] Calling Gemini", { model, mimeType, dataSize: data.length });
  try {
    const response = await client.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data } },
            { text: USER_PROMPT },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
    });
    console.log("[VLM] Gemini succeeded");
    return JSON.parse(response.text);
  } catch (err) {
    console.error("[VLM] Gemini call failed:", err.message || err);
    throw err;
  }
}

export async function extractTagFromImage(dataUrl) {
  const { provider, model } = getVLMConfig();
  const call = provider === "google" ? callGemini : callOpenAI;
  const raw = await withRetries(() => call(dataUrl, model));
  return TagSchema.parse(raw);
}

// Test seam: lets unit tests reset cached SDK clients between env changes.
export function __resetClientsForTest() {
  openaiClient = null;
  geminiClient = null;
}
