import { readFile, mkdir, writeFile } from "node:fs/promises";
import { classifyOperational } from "./exercise-taxonomy.mjs";

const input = process.argv[2] || "/private/tmp/canetta-exercises-dataset/data/exercises.json";
const outputDir = process.argv[3] || "/private/tmp/canetta_enrichment_parts";
const data = JSON.parse(await readFile(input, "utf8"));

const phrases = [
  ["assisted parallel close grip pull-up", "barra fixa assistida com pegada fechada"], ["assisted chest dip", "mergulho assistido para peito"],
  ["resistance band", "elástico"], ["single leg", "unilateral"], ["pull-up", "barra fixa"], ["push-up", "flexão"],
  ["sit-up", "abdominal"], ["side bend", "inclinação lateral"], ["russian twist", "abdominal russo"], ["mountain climber", "escalador"],
  ["face pull", "puxada para a face"], ["step-up", "subida no banco"], ["hip thrust", "elevação de quadril"], ["deadlift", "levantamento terra"],
  ["front raise", "elevação frontal"], ["lateral raise", "elevação lateral"], ["leg raise", "elevação de pernas"], ["calf raise", "elevação de panturrilha"]
];

const words = new Map(Object.entries({ "air": "aérea", "all": "mobilidade", "alternate": "alternado", "alternating": "alternado", "ankle": "tornozelo", "archer": "arqueiro", "arm": "braço", "assisted": "assistido", "back": "costas", "barbell": "barra", "bench": "banco", "bicycle": "bicicleta", "bodyweight": "peso corporal", "body": "corpo", "bridge": "ponte", "bulgarian": "búlgaro", "cable": "cabo", "calf": "panturrilha", "chest": "peito", "close": "fechada", "crunch": "abdominal", "dead": "terra", "decline": "declinado", "dumbbell": "halter", "elevated": "elevado", "extension": "extensão", "fly": "crucifixo", "front": "frontal", "glute": "glúteo", "glutes": "glúteos", "hamstring": "posterior de coxa", "hanging": "suspenso", "heel": "calcanhar", "hip": "quadril", "incline": "inclinado", "jump": "salto", "kettlebell": "kettlebell", "knee": "joelho", "lateral": "lateral", "leg": "perna", "lying": "deitado", "machine": "máquina", "military": "militar", "neck": "pescoço", "overhead": "acima da cabeça", "parallel": "paralelas", "plank": "prancha", "prone": "de bruços", "pull": "puxada", "pulldown": "puxada", "push": "empurrada", "raise": "elevação", "rear": "posterior", "reverse": "reverso", "romanian": "romeno", "row": "remada", "seated": "sentado", "shoulder": "ombro", "side": "lateral", "sit": "sentar", "squat": "agachamento", "standing": "em pé", "stretch": "alongamento", "sumo": "sumô", "thigh": "coxa", "throw": "arremesso", "triceps": "tríceps", "upright": "vertical", "walking": "caminhando", "wall": "parede", "wide": "aberta", "wrist": "punho" }));

function translate(name) {
  let value = name.toLowerCase();
  for (const [from, to] of phrases) value = value.replaceAll(from, to);
  return value.replace(/[()]/g, "").replace(/\s+/g, " ").trim().split(" ").map((word) => words.get(word) || word).join(" ");
}

function classify(exercise) {
  const value = `${exercise.name || ""} ${exercise.equipment || ""} ${exercise.category || ""}`.toLowerCase();
  if (["muscle up", "handstand", "planche", "human flag", "pistol squat", "dragon flag", "snatch", "clean and jerk", "kipping", "archer pull", "archer push", "one arm", "single arm", "depth jump", "turkish get up"].some((token) => value.includes(token))) return "avancado";
  if (["assisted", "machine", "seated", "lying", "wall", "stretch", "ankle circles", "heel touch", "bird dog", "dead bug", "glute bridge", "bodyweight squat", "march"].some((token) => value.includes(token))) return "iniciante";
  return "intermediario";
}

const escapeSql = (value) => value.replaceAll("\\", "\\\\").replaceAll("'", "''");
const sqlText = (value) => `'${escapeSql(String(value ?? ""))}'`;
const sqlArray = (values) => `array[${(values ?? []).map((value) => sqlText(value)).join(",")}]::text[]`;
await mkdir(outputDir, { recursive: true });
for (let index = 0; index < data.length; index += 100) {
  const rows = data.slice(index, index + 100).map((exercise) => {
    const taxonomy = classifyOperational(exercise, { namePtStatus: "automatic", productionEligible: false, mediaVerified: Boolean(exercise.image && exercise.gif_url) });
    return `update public.canetta_exercises set name_pt=${sqlText(translate(exercise.name))}, name_pt_status='automatic', taxonomy_status='automatic', difficulty_level='${classify(exercise)}', primary_pattern=${sqlText(taxonomy.primary_pattern)}, secondary_patterns=${sqlArray(taxonomy.secondary_patterns)}, movement_family=${sqlText(taxonomy.movement_family)}, joint_class=${sqlText(taxonomy.joint_class)}, session_role=${sqlText(taxonomy.session_role)}, exercise_tier=${sqlText(taxonomy.exercise_tier)}, valid_slots=${sqlArray(taxonomy.valid_slots)}, valid_session_types=${sqlArray(taxonomy.valid_session_types)}, technical_complexity=${taxonomy.technical_complexity}, balance_demand=${taxonomy.balance_demand}, mobility_demand=${taxonomy.mobility_demand}, setup_complexity=${taxonomy.setup_complexity}, progression_clarity=${taxonomy.progression_clarity}, unsupervised_suitability=${taxonomy.unsupervised_suitability}, is_hybrid=${taxonomy.is_hybrid}, is_unilateral=${taxonomy.is_unilateral}, requires_spotter=${taxonomy.requires_spotter}, media_verified=${taxonomy.media_verified}, production_eligible=false, context_scores='{}'::jsonb, taxonomy_version='2026-07-17.v1', updated_at=now() where external_id='${escapeSql(String(exercise.id))}';`;
  }).join("\n");
  await writeFile(`${outputDir}/part-${String(index / 100).padStart(2, "0")}.sql`, `${rows}\n`);
}
console.log(`Generated ${Math.ceil(data.length / 100)} enrichment parts for ${data.length} exercises.`);
