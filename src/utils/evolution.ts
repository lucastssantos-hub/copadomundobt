import { Assessment, AxisScores, AXES, FundamentalAxis, Student } from '../types/students';

export interface AxisTrend {
  axis: FundamentalAxis;
  current: number | null;
  previous: number | null;
  delta: number | null;
}

function sortByDateDesc(assessments: Assessment[]): Assessment[] {
  return [...assessments].sort((a, b) => b.date.localeCompare(a.date));
}

/** Nota atual por eixo: valor da avaliação mais recente que contém o eixo. */
export function currentProfile(assessments: Assessment[]): AxisScores {
  const sorted = sortByDateDesc(assessments);
  const profile: AxisScores = {};
  for (const axis of AXES) {
    const found = sorted.find(a => a.scores[axis] != null);
    if (found) profile[axis] = found.scores[axis];
  }
  return profile;
}

/** Perfil anterior: para cada eixo, o penúltimo valor registrado. */
export function previousProfile(assessments: Assessment[]): AxisScores {
  const sorted = sortByDateDesc(assessments);
  const profile: AxisScores = {};
  for (const axis of AXES) {
    const withAxis = sorted.filter(a => a.scores[axis] != null);
    if (withAxis.length >= 2) profile[axis] = withAxis[1].scores[axis];
  }
  return profile;
}

export function axisTrends(assessments: Assessment[]): AxisTrend[] {
  const current = currentProfile(assessments);
  const previous = previousProfile(assessments);
  return AXES.map(axis => {
    const cur = current[axis] ?? null;
    const prev = previous[axis] ?? null;
    return {
      axis,
      current: cur,
      previous: prev,
      delta: cur != null && prev != null ? Number((cur - prev).toFixed(1)) : null,
    };
  });
}

/** Média geral (0–5) de um perfil; null se nenhum eixo avaliado. */
export function overallScore(profile: AxisScores): number | null {
  const values = AXES.map(a => profile[a]).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1));
}

/** Série histórica de um eixo (mais antiga → mais recente) para sparkline. */
export function axisSeries(assessments: Assessment[], axis: FundamentalAxis): { date: string; value: number }[] {
  return sortByDateDesc(assessments)
    .filter(a => a.scores[axis] != null)
    .map(a => ({ date: a.date, value: a.scores[axis] as number }))
    .reverse();
}

export interface GroupAxisStat {
  axis: FundamentalAxis;
  average: number | null;
  ratedStudents: number;
}

export interface GroupInsights {
  axisStats: GroupAxisStat[];
  focusAxes: FundamentalAxis[]; // 2 eixos mais fracos da turma
  outliers: { student: Student; overall: number; diff: number }[]; // destoando da média
  groupOverall: number | null;
}

const OUTLIER_THRESHOLD = 0.8;

export function groupInsights(
  students: Student[],
  assessmentsByStudent: Map<string, Assessment[]>
): GroupInsights {
  const profiles = students.map(s => ({
    student: s,
    profile: currentProfile(assessmentsByStudent.get(s.id) ?? []),
  }));

  const axisStats: GroupAxisStat[] = AXES.map(axis => {
    const values = profiles
      .map(p => p.profile[axis])
      .filter((v): v is number => v != null);
    return {
      axis,
      average: values.length > 0 ? Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1)) : null,
      ratedStudents: values.length,
    };
  });

  const rated = axisStats.filter(s => s.average != null);
  const focusAxes = [...rated]
    .sort((a, b) => (a.average as number) - (b.average as number))
    .slice(0, 2)
    .map(s => s.axis);

  const overalls = profiles
    .map(p => ({ student: p.student, overall: overallScore(p.profile) }))
    .filter((p): p is { student: Student; overall: number } => p.overall != null);

  const groupOverall = overalls.length > 0
    ? Number((overalls.reduce((s, p) => s + p.overall, 0) / overalls.length).toFixed(1))
    : null;

  const outliers = groupOverall == null
    ? []
    : overalls
        .map(p => ({ ...p, diff: Number((p.overall - groupOverall).toFixed(1)) }))
        .filter(p => Math.abs(p.diff) >= OUTLIER_THRESHOLD)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  return { axisStats, focusAxes, outliers, groupOverall };
}
