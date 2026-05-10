#!/usr/bin/env node
/**
 * Validates root-level changelog.json for this Pages repo (no deps).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const changelogPath = path.join(root, "changelog.json");

function fail(msg) {
  console.error("[changelog] ERROR:", msg);
  process.exit(1);
}

const raw = fs.readFileSync(changelogPath, "utf8");
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  fail(`Invalid JSON: ${e.message}`);
}

if (typeof data.updatedAt !== "string" || !data.updatedAt) {
  fail("missing or invalid updatedAt (ISO8601 string)");
}

const disc = data.plannedDisclaimer;
if (typeof disc !== "string" || disc.trim().length < 80) {
  fail(
    "plannedDisclaimer must be a substantive customer-facing disclaimer (at least ~80 characters)."
  );
}

if (!Array.isArray(data.entries) || data.entries.length < 3) {
  fail("entries must be an array with at least 3 releases for a credible public changelog");
}

const seenIds = new Set();
for (const [i, e] of data.entries.entries()) {
  const p = `entries[${i}]`;
  for (const f of ["id", "publishedAt", "customerTitle", "summary"]) {
    if (typeof e[f] !== "string" || !e[f]) {
      fail(`${p}.${f} must be a non-empty string`);
    }
  }
  if (seenIds.has(e.id)) fail(`duplicate entries.id: ${e.id}`);
  seenIds.add(e.id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.publishedAt)) {
    fail(`${p}.publishedAt must be YYYY-MM-DD`);
  }
  for (const k of ["whatsNew", "improvements", "fixes"]) {
    if (e[k] == null) continue;
    if (!Array.isArray(e[k]) || !e[k].every((x) => typeof x === "string")) {
      fail(`${p}.${k} must be an array of strings`);
    }
  }
}

if (!Array.isArray(data.planned)) {
  fail("planned must be an array");
}

for (const [i, pr] of data.planned.entries()) {
  const prefix = `planned[${i}]`;
  if (typeof pr.title !== "string" || !pr.title) fail(`${prefix}.title required`);
  if (typeof pr.notes !== "string" || !pr.notes) fail(`${prefix}.notes required`);
  if (
    typeof pr.confidence !== "string" ||
    !["low", "medium", "high"].includes(pr.confidence)
  ) {
    fail(`${prefix}.confidence must be one of low | medium | high`);
  }
}

console.log("[changelog] OK:", data.entries.length, "entries,", data.planned.length, "planned items");
