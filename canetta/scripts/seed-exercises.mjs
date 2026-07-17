import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { classifyOperational } from "./exercise-taxonomy.mjs";

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
  const name = String(exercise.name || "").trim();
  const namePt = translateExerciseName(name);
  const taxonomy = classifyOperational(exercise, { namePtStatus: "automatic", productionEligible: false, mediaVerified: Boolean(exercise.image && exercise.gif_url) });
  return {
    external_id: String(exercise.id),
    name,
    name_pt: namePt,
    name_pt_status: "automatic",
    taxonomy_status: "automatic",
    difficulty_level: classifyDifficulty(exercise),
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
    ...taxonomy,
    attribution: exercise.attribution ?? "Media © Gym visual. See dataset license/notice.",
    source: "hasaneyldrm/exercises-dataset",
    updated_at: new Date().toISOString()
  };
}

const PHRASE_TRANSLATIONS = [
  ["assisted parallel close grip pull-up", "barra fixa assistida com pegada fechada"],
  ["assisted chest dip", "mergulho assistido para peito"],
  ["resistance band", "elástico"],
  ["single leg", "unilateral"],
  ["pull-up", "barra fixa"],
  ["push-up", "flexão"],
  ["sit-up", "abdominal"],
  ["side bend", "inclinação lateral"],
  ["russian twist", "abdominal russo"],
  ["mountain climber", "escalador"],
  ["face pull", "puxada para a face"],
  ["step-up", "subida no banco"],
  ["hip thrust", "elevação de quadril"],
  ["deadlift", "levantamento terra"],
  ["front raise", "elevação frontal"],
  ["lateral raise", "elevação lateral"],
  ["leg raise", "elevação de pernas"],
  ["calf raise", "elevação de panturrilha"]
];

const WORD_TRANSLATIONS = new Map(Object.entries({
  "3/4": "3/4", "45°": "45°", air: "aérea", all: "mobilidade", alternate: "alternado", alternating: "alternado", ankle: "tornozelo", archer: "arqueiro", arm: "braço", assisted: "assistido", back: "costas", barbell: "barra", bench: "banco", bicycle: "bicicleta", bodyweight: "peso corporal", body: "corpo", bridge: "ponte", bulgarian: "búlgaro", cable: "cabo", calf: "panturrilha", chest: "peito", close: "fechada", crunch: "abdominal", dead: "terra", decline: "declinado", dumbbell: "halter", elevated: "elevado", extension: "extensão", external: "externo", fly: "crucifixo", front: "frontal", glute: "glúteo", glutes: "glúteos", hamstring: "posterior de coxa", hanging: "suspenso", heel: "calcanhar", hip: "quadril", incline: "inclinado", jump: "salto", kettlebell: "kettlebell", knee: "joelho", lateral: "lateral", leg: "perna", lying: "deitado", machine: "máquina", military: "militar", neck: "pescoço", overhead: "acima da cabeça", parallel: "paralelas", plank: "prancha", prone: "de bruços", pull: "puxada", pulldown: "puxada", push: "empurrada", raise: "elevação", rear: "posterior", reverse: "reverso", romanian: "romeno", row: "remada", seated: "sentado", shoulder: "ombro", side: "lateral", sit: "sentar", squat: "agachamento", standing: "em pé", stretch: "alongamento", sumo: "sumô", thigh: "coxa", throw: "arremesso", triceps: "tríceps", upright: "vertical", walking: "caminhando", wall: "parede", wide: "aberta", wrist: "punho" }));

function translateExerciseName(name) {
  let translated = name.toLowerCase();
  for (const [from, to] of PHRASE_TRANSLATIONS) translated = translated.replaceAll(from, to);
  translated = translated.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
  return translated.split(" ").map((word) => WORD_TRANSLATIONS.get(word) || word).join(" ");
}

function classifyDifficulty(exercise) {
  const text = `${exercise.name || ""} ${exercise.equipment || ""} ${exercise.category || ""}`.toLowerCase();
  const advanced = ["muscle up", "handstand", "planche", "human flag", "pistol squat", "dragon flag", "snatch", "clean and jerk", "kipping", "archer pull", "archer push", "one arm", "single arm", "depth jump", "turkish get up"].some((token) => text.includes(token));
  if (advanced) return "avancado";
  const beginner = ["assisted", "machine", "seated", "lying", "wall", "stretch", "ankle circles", "heel touch", "bird dog", "dead bug", "glute bridge", "bodyweight squat", "march"].some((token) => text.includes(token));
  if (beginner) return "iniciante";
  return "intermediario";
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
