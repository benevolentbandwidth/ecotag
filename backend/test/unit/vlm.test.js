import assert from "node:assert/strict";
import test from "node:test";

import { getVLMConfig } from "../../ai/vlm.js";
import { TagSchema, TagJsonSchema } from "../../ai/schema.js";

const ENV_KEYS = ["VLM_PROVIDER", "VLM_MODEL"];

function snapshot() {
  return Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
}

function restore(snap) {
  for (const k of ENV_KEYS) {
    if (snap[k] === undefined) delete process.env[k];
    else process.env[k] = snap[k];
  }
}

test("getVLMConfig defaults to google + gemini-2.5-pro", () => {
  const snap = snapshot();
  delete process.env.VLM_PROVIDER;
  delete process.env.VLM_MODEL;
  try {
    assert.deepEqual(getVLMConfig(), {
      provider: "google",
      model: "gemini-2.5-pro",
    });
  } finally {
    restore(snap);
  }
});

test("getVLMConfig honors VLM_PROVIDER=openai with gpt-4o default", () => {
  const snap = snapshot();
  process.env.VLM_PROVIDER = "openai";
  delete process.env.VLM_MODEL;
  try {
    assert.deepEqual(getVLMConfig(), { provider: "openai", model: "gpt-4o" });
  } finally {
    restore(snap);
  }
});

test("getVLMConfig VLM_MODEL overrides the default", () => {
  const snap = snapshot();
  process.env.VLM_PROVIDER = "google";
  process.env.VLM_MODEL = "gemini-2.5-flash";
  try {
    assert.deepEqual(getVLMConfig(), {
      provider: "google",
      model: "gemini-2.5-flash",
    });
  } finally {
    restore(snap);
  }
});

test("getVLMConfig accepts uppercase VLM_PROVIDER", () => {
  const snap = snapshot();
  process.env.VLM_PROVIDER = "OPENAI";
  delete process.env.VLM_MODEL;
  try {
    assert.equal(getVLMConfig().provider, "openai");
  } finally {
    restore(snap);
  }
});

test("getVLMConfig throws on unknown provider", () => {
  const snap = snapshot();
  process.env.VLM_PROVIDER = "claude";
  try {
    assert.throws(() => getVLMConfig(), /VLM_PROVIDER/);
  } finally {
    restore(snap);
  }
});

test("TagJsonSchema is OpenAI strict-mode compliant", () => {
  // OpenAI strict mode requires additionalProperties:false on every object
  // and every property in required.
  function assertStrict(node, path = "$") {
    if (!node || typeof node !== "object") return;
    if (node.type === "object") {
      assert.equal(
        node.additionalProperties,
        false,
        `${path}: additionalProperties must be false`,
      );
      const propKeys = Object.keys(node.properties ?? {});
      const required = node.required ?? [];
      for (const k of propKeys) {
        assert.ok(
          required.includes(k),
          `${path}.${k}: property must appear in required[]`,
        );
      }
      for (const [k, v] of Object.entries(node.properties ?? {})) {
        assertStrict(v, `${path}.${k}`);
      }
    }
    if (node.type === "array" && node.items) assertStrict(node.items, `${path}[]`);
    if (Array.isArray(node.anyOf)) {
      node.anyOf.forEach((c, i) => assertStrict(c, `${path}|anyOf[${i}]`));
    }
  }
  assertStrict(TagJsonSchema);
  // openai target should strip the $schema key.
  assert.equal(TagJsonSchema.$schema, undefined);
});

test("TagSchema validates a well-formed tag", () => {
  const sample = {
    ocr_text: "100% COTTON\nMADE IN PORTUGAL",
    country: "Portugal",
    materials: [{ fiber: "Cotton", pct: 100 }],
    care: {
      washing: "machine_wash_cold",
      drying: "line_dry",
      ironing: null,
      dry_cleaning: null,
    },
  };
  assert.deepEqual(TagSchema.parse(sample), sample);
});

test("TagSchema rejects unknown care enum values", () => {
  const bad = {
    ocr_text: "",
    country: null,
    materials: [],
    care: {
      washing: "wash_with_unicorn_tears",
      drying: null,
      ironing: null,
      dry_cleaning: null,
    },
  };
  assert.throws(() => TagSchema.parse(bad));
});
