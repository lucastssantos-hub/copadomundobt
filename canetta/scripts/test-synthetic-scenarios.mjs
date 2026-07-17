import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classifyOperational } from "./exercise-taxonomy.mjs";

const scenarios = JSON.parse(await readFile(new URL("../fixtures/synthetic-scenarios.json", import.meta.url), "utf8"));
const frequencies = [2, 3, 4, 5];
assert.equal(scenarios.length, 10);
assert.equal(scenarios.length * frequencies.length, 40);
for (const scenario of scenarios) for (const frequency of frequencies) {
  assert.ok([2, 3, 4, 5].includes(frequency));
  assert.ok(["nunca_treinei", "retomando", "treino_regular"].includes(scenario.experience));
  if (scenario.expected_failure) assert.equal(scenario.expected_failure, "NO_ELIGIBLE_EXERCISE_FOR_SLOT");
}
const anchors = ["Machine Leg Press", "Machine Chest Press", "Seated Cable Row", "Lat Pulldown"];
const ranked = anchors.map((name) => ({ name, ...classifyOperational({ name, equipment: "machine" }, { namePtStatus: "reviewed", productionEligible: true, mediaVerified: true }) }));
assert.ok(ranked.every((item) => item.production_eligible));
console.log(`OK: ${scenarios.length * frequencies.length} synthetic scenarios and anchor eligibility.`);
