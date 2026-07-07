export type FundamentalAxis =
  | 'saque'
  | 'devolucao'
  | 'ataque'
  | 'defesa'
  | 'tatico'
  | 'consistencia';

export const AXES: FundamentalAxis[] = [
  'saque',
  'devolucao',
  'ataque',
  'defesa',
  'tatico',
  'consistencia',
];

export const AXIS_CONFIG: Record<FundamentalAxis, { label: string; short: string; color: string; hint: string }> = {
  saque: { label: 'Saque', short: 'SAQ', color: '#3B82F6', hint: 'Consistência, variação e efetividade do saque' },
  devolucao: { label: 'Devolução', short: 'DEV', color: '#8B5CF6', hint: 'Qualidade da devolução de saque' },
  ataque: { label: 'Ataque', short: 'ATA', color: '#EF4444', hint: 'Smash, definição e agressividade na rede' },
  defesa: { label: 'Defesa', short: 'DEF', color: '#06B6D4', hint: 'Lob, recuperação e leitura defensiva' },
  tatico: { label: 'Tático', short: 'TAT', color: '#EC4899', hint: 'Posicionamento, cobertura e construção do ponto' },
  consistencia: { label: 'Consistência', short: 'CON', color: '#22C55E', hint: 'Regularidade, controle de erros não forçados' },
};

export type StudentLevel = 'iniciante' | 'intermediario' | 'avancado';

export const LEVEL_CONFIG: Record<StudentLevel, { label: string; color: string }> = {
  iniciante: { label: 'Iniciante', color: '#22C55E' },
  intermediario: { label: 'Intermediário', color: '#F59E0B' },
  avancado: { label: 'Avançado', color: '#EF4444' },
};

export const LEVELS: StudentLevel[] = ['iniciante', 'intermediario', 'avancado'];

export interface Student {
  id: string;
  name: string;
  level: StudentLevel;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  level: StudentLevel;
  weekdays: number[]; // 0 = domingo ... 6 = sábado
  time?: string;
  studentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type AxisScores = Partial<Record<FundamentalAxis, number>>; // 1–5 por eixo avaliado

export interface Assessment {
  id: string;
  studentId: string;
  groupId?: string;
  date: string;
  scores: AxisScores;
  note?: string;
}

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
