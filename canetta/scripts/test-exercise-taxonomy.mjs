import assert from "node:assert/strict";
import { classifyOperational } from "./exercise-taxonomy.mjs";

const cases = [
  ["Machine Leg Press", "knee_dominant", "knee_dominant", "multi_joint"],
  ["Kneeling Squat", "complementary", "complementary", "multi_joint"],
  ["Cable Pull Through", "hip_dominant", "hip_hinge", "multi_joint"],
  ["Assisted Close Grip Chin-Up", "vertical_pull", "vertical_pull", "multi_joint"],
  ["Cable Biceps Curl", "accessory", "biceps", "single_joint"],
  ["Clean and Press", "complementary", "complementary", "hybrid"]
];
for (const [name, pattern, family, jointClass] of cases) {
  const result = classifyOperational({ name, equipment: "cable" });
  assert.equal(result.primary_pattern, pattern, `${name}: pattern`);
  assert.equal(result.movement_family, family, `${name}: family`);
  assert.equal(result.joint_class, jointClass, `${name}: joint class`);
}
assert.equal(classifyOperational({ name: "Machine Chest Press" }).production_eligible, false);
assert.equal(classifyOperational({ name: "Machine Chest Press" }, { namePtStatus: "reviewed", productionEligible: true, mediaVerified: true }).production_eligible, true);
assert.equal(classifyOperational({ name: "Clean and Press" }, { namePtStatus: "reviewed", productionEligible: true, mediaVerified: true }).production_eligible, false);
console.log(`OK: ${cases.length + 3} deterministic taxonomy assertions.`);
