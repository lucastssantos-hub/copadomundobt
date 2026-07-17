// Triagem de segurança do plano de treino.
// O gate é DETERMINÍSTICO (código, não IA): a IA nunca decide se pode treinar,
// apenas monta a sessão dentro do status liberado pelo gate.

export const RED_FLAGS = [
  "Dor ou pressão no peito",
  "Falta de ar em repouso ou desproporcional",
  "Desmaio ou quase desmaio",
  "Palpitação com tontura",
  "Inchaço súbito nas pernas",
  "Dor intensa na panturrilha",
  "Fraqueza súbita de um lado do corpo",
  "Confusão ou alteração de fala",
  "Dor abdominal intensa ou persistente",
  "Vômitos repetidos",
  "Não consigo manter líquidos no estômago",
  "Fezes escuras ou com sangue",
  "Hipoglicemia grave (precisei de ajuda)",
  "Queda com perda de consciência"
] as const;

export const CONDITIONS = [
  "Diabetes tipo 1",
  "Diabetes tipo 2",
  "Doença cardíaca (infarto, angina, arritmia, insuficiência)",
  "AVC ou AIT",
  "Hipertensão",
  "Doença renal",
  "Doença hepática",
  "Neuropatia ou perda de sensibilidade nos pés",
  "Osteoporose ou fratura por fragilidade",
  "Gestação",
  "Transtorno alimentar (atual ou anterior)",
  "Cirurgia recente (menos de 6 meses)",
  "Câncer em tratamento"
] as const;

export const PAIN_REGIONS = ["Joelho", "Lombar", "Ombro", "Quadril", "Tornozelo/pé", "Punho/cotovelo", "Pescoço"] as const;

export type AnamnesisData = {
  red_flags_today: string[];
  red_flags_recent: string[];
  conditions: string[];
  conditions_unsure: boolean;
  diabetes?: {
    usa_insulina: boolean;
    usa_secretagogo: boolean;
    protocolo_exercicio: boolean;
    hipoglicemia_exercicio: boolean;
  };
  gi: {
    impede_alimentacao: boolean;
    impede_hidratacao: boolean;
    impede_atividade: boolean;
    piora_com_movimento: boolean;
  };
  funcao: {
    caminhada_max: "<10 min" | "10-20 min" | "20-30 min" | "30+ min";
    sentar_levantar_sem_apoio: boolean;
    sobe_um_lance_escada: boolean;
    agacha_ate_cadeira: boolean;
  };
  dores: string[];
  dores_detalhe?: string | null;
};

export type GateStatus = "verde" | "amarelo" | "liberacao" | "vermelho" | "insuficiente";

export type GateResult = {
  status: GateStatus;
  motivos: string[];
};

const CLEARANCE_CONDITIONS = [
  "Doença cardíaca (infarto, angina, arritmia, insuficiência)",
  "AVC ou AIT",
  "Gestação",
  "Doença renal",
  "Cirurgia recente (menos de 6 meses)"
];

export function evaluateGate(data: AnamnesisData | null, consent: boolean): GateResult {
  if (!data || !Array.isArray(data.red_flags_today) || !data.gi || !data.funcao) {
    return { status: "insuficiente", motivos: ["Triagem de segurança não preenchida."] };
  }
  if (!consent) {
    return { status: "insuficiente", motivos: ["É preciso aceitar os limites do sistema antes de gerar o plano."] };
  }

  // VERMELHO: sinal de alarme presente hoje, ou incapacidade de hidratar.
  const redToday = [...data.red_flags_today];
  if (data.gi.impede_hidratacao) redToday.push("Não consegue manter líquidos");
  if (redToday.length) {
    return {
      status: "vermelho",
      motivos: redToday
    };
  }

  // LIBERAÇÃO CLÍNICA: sinal recente não investigado, condição que exige protocolo,
  // ou diabetes com insulina/secretagogo sem protocolo médico para exercício.
  const clearance: string[] = [];
  for (const flag of data.red_flags_recent ?? []) clearance.push(`Sintoma recente não investigado: ${flag}`);
  for (const condition of data.conditions ?? []) {
    if (CLEARANCE_CONDITIONS.includes(condition)) clearance.push(condition);
  }
  const hasDiabetes = (data.conditions ?? []).some((c) => c.startsWith("Diabetes"));
  if (hasDiabetes && data.diabetes && (data.diabetes.usa_insulina || data.diabetes.usa_secretagogo) && !data.diabetes.protocolo_exercicio) {
    clearance.push("Diabetes com insulina/secretagogo sem protocolo médico para exercício");
  }
  if (clearance.length) {
    return { status: "liberacao", motivos: clearance };
  }

  // AMARELO: sintomas GI limitando função, "não sei" em condições, ou hipoglicemia prévia no exercício.
  const caution: string[] = [];
  if (data.gi.impede_alimentacao) caution.push("Sintomas estão limitando a alimentação");
  if (data.gi.impede_atividade) caution.push("Sintomas estão limitando as atividades normais");
  if (data.gi.piora_com_movimento) caution.push("Sintomas pioram com movimento");
  if (data.conditions_unsure) caution.push("Condições de saúde não confirmadas (respondeu 'não sei')");
  if (data.diabetes?.hipoglicemia_exercicio) caution.push("Histórico de hipoglicemia durante exercício");
  if (caution.length) {
    return { status: "amarelo", motivos: caution };
  }

  return { status: "verde", motivos: [] };
}

export function anamnesisPromptSummary(data: AnamnesisData, gate: GateResult): string {
  const lines: string[] = [];
  lines.push(`Status da triagem de segurança: ${gate.status.toUpperCase()}${gate.motivos.length ? ` (motivos: ${gate.motivos.join("; ")})` : ""}`);
  lines.push(`Caminhada contínua tolerada hoje: ${data.funcao.caminhada_max}`);
  lines.push(`Senta e levanta sem apoio: ${data.funcao.sentar_levantar_sem_apoio ? "sim" : "não"} · Sobe 1 lance de escada: ${data.funcao.sobe_um_lance_escada ? "sim" : "não"} · Agacha até a cadeira: ${data.funcao.agacha_ate_cadeira ? "sim" : "não"}`);
  lines.push(`Condições de saúde relatadas: ${data.conditions.length ? data.conditions.join(", ") : "nenhuma relatada"}`);
  if (data.dores.length) {
    lines.push(`Regiões com dor que limita: ${data.dores.join(", ")}${data.dores_detalhe ? ` (detalhe: ${data.dores_detalhe})` : ""} — NÃO carregar essas regiões; escolher alternativas.`);
  }
  if (gate.status === "amarelo") {
    lines.push("REGRA DE SESSÃO: gerar APENAS sessões de baixa demanda (caminhada leve, mobilidade, força muito leve em pé/sentado), sem progressão nesta semana.");
  }
  return lines.join("\n");
}
