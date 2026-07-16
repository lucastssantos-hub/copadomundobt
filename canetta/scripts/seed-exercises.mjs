import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

async function loadLocalEnv() {
  try {
    const envRaw = await readFile(path.resolve(".env.local"), "utf8");
    for (const line of envRaw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index);
      const value = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local is optional; CI can provide real environment variables.
  }
}

await loadLocalEnv();

const datasetPath = process.argv[2] || process.env.CANETTA_EXERCISES_JSON || "./data/exercises.json";
const mediaBaseUrl = (process.env.CANETTA_EXERCISES_MEDIA_BASE_URL || "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset").replace(/\/$/, "");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

function normalizeExercise(exercise) {
  return {
    external_id: String(exercise.id),
    name: exercise.name,
    category: exercise.category ?? exercise.body_part ?? null,
    body_part: exercise.body_part ?? null,
    target_muscle: exercise.target ?? null,
    muscle_group: exercise.muscle_group ?? null,
    secondary_muscles: Array.isArray(exercise.secondary_muscles) ? exercise.secondary_muscles : [],
    equipment: exercise.equipment ?? null,
    instructions: exercise.instructions ?? {},
    instruction_steps: exercise.instruction_steps ?? {},
    image_url: exercise.image ? `${mediaBaseUrl}/${exercise.image}` : null,
    gif_url: exercise.gif_url ? `${mediaBaseUrl}/${exercise.gif_url}` : null,
    attribution: exercise.attribution ?? "Media © Gym visual. See dataset license/notice.",
    source: "hasaneyldrm/exercises-dataset",
    updated_at: new Date().toISOString()
  };
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

const raw = await readFile(path.resolve(datasetPath), "utf8");
const data = JSON.parse(raw);

if (!Array.isArray(data)) {
  console.error("Expected dataset JSON to be an array.");
  process.exit(1);
}

const rows = data.map(normalizeExercise);
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

let imported = 0;
for (const batch of chunk(rows, 250)) {
  const { error } = await supabase
    .from("canetta_exercises")
    .upsert(batch, { onConflict: "external_id" });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  imported += batch.length;
  console.log(`Imported ${imported}/${rows.length}`);
}

console.log(`Done. Seeded ${rows.length} exercises from ${datasetPath}.`);
