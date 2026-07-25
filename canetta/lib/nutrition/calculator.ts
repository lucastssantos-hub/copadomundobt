export interface NutritionFood {
  grams: number;
  kcalPer100g?: number | null;
  proteinPer100g?: number | null;
  carbsPer100g?: number | null;
  fatPer100g?: number | null;
  fiberPer100g?: number | null;
}

export interface NutritionTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

const value = (input: number | null | undefined) => Number.isFinite(input) ? Number(input) : 0;
const scaled = (per100g: number | null | undefined, grams: number) => value(per100g) * Math.max(0, grams) / 100;
const rounded = (input: number) => Math.round(input * 10) / 10;

/** Calcula totais apenas a partir dos valores versionados dos alimentos. A IA não calcula macros. */
export function calculateNutritionTotals(foods: NutritionFood[]): NutritionTotals {
  return foods.reduce<NutritionTotals>((totals, food) => ({
    calories: totals.calories + scaled(food.kcalPer100g, food.grams),
    proteinG: totals.proteinG + scaled(food.proteinPer100g, food.grams),
    carbsG: totals.carbsG + scaled(food.carbsPer100g, food.grams),
    fatG: totals.fatG + scaled(food.fatPer100g, food.grams),
    fiberG: totals.fiberG + scaled(food.fiberPer100g, food.grams)
  }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 });
}

export function roundNutritionTotals(totals: NutritionTotals): NutritionTotals {
  return {
    calories: rounded(totals.calories),
    proteinG: rounded(totals.proteinG),
    carbsG: rounded(totals.carbsG),
    fatG: rounded(totals.fatG),
    fiberG: rounded(totals.fiberG)
  };
}
