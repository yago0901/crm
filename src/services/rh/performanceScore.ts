import { ICompetencyRating, IIndividualGoal } from "../../types/performanceReview";

const round1 = (value: number) => Math.round(value * 10) / 10;

export function weightedCompetencyScore(
  competencies: ICompetencyRating[],
  key: "selfScore" | "managerScore"
): number {
  const totalWeight = competencies.reduce((sum, c) => sum + (c.weight || 0), 0);
  if (totalWeight <= 0) return 0;
  const weighted = competencies.reduce((sum, c) => sum + (c[key] || 0) * (c.weight || 0), 0);
  return round1(weighted / totalWeight);
}

export function weightedGoalAttainment(goals: IIndividualGoal[]): number {
  const totalWeight = goals.reduce((sum, g) => sum + (g.weight || 0), 0);
  if (totalWeight <= 0) return 0;
  const weighted = goals.reduce(
    (sum, g) => sum + (g.progressPercent || 0) * (g.weight || 0),
    0
  );
  return round1(weighted / totalWeight);
}
