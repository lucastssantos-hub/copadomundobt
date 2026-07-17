import { readFile, readdir } from "node:fs/promises";
const directory = new URL("../fixtures/golden-plans/", import.meta.url);
const files = (await readdir(directory)).filter((file) => file.endsWith(".json"));
if (files.length < 4) throw new Error("At least four golden plans are required.");
for (const file of files) {
  const plan = JSON.parse(await readFile(new URL(file, directory), "utf8"));
  if (!plan.template || !Array.isArray(plan.sessions) || !plan.sessions.length) throw new Error(`${file}: invalid golden plan shape`);
  for (const session of plan.sessions) if (!session.day || !Array.isArray(session.patterns) || !session.patterns.length) throw new Error(`${file}: invalid session`);
}
console.log(`OK: ${files.length} golden plan fixtures are structurally valid.`);
