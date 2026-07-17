import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const manifest = JSON.parse(await readFile(new URL("../config/essential-exercises.json", import.meta.url), "utf8"));
assert.ok(manifest.entries.length >= 15);
for (const entry of manifest.entries) {
  assert.ok(entry.slot && Array.isArray(entry.match) && entry.match.length > 0 && Number.isInteger(entry.priority));
}
console.log(`OK: ${manifest.entries.length} essential catalog slots are structurally valid.`);
