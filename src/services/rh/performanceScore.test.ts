import { describe, expect, it } from "vitest";
import { weightedCompetencyScore, weightedGoalAttainment } from "./performanceScore";
import { ICompetencyRating, IIndividualGoal } from "../../types/performanceReview";

const competency = (over: Partial<ICompetencyRating> = {}): ICompetencyRating => ({
  name: "Competência",
  weight: 1,
  selfScore: 0,
  managerScore: 0,
  ...over,
});

const goal = (over: Partial<IIndividualGoal> = {}): IIndividualGoal => ({
  description: "Meta",
  weight: 1,
  progressPercent: 0,
  ...over,
});

describe("weightedCompetencyScore", () => {
  it("returns 0 when there are no competencies", () => {
    expect(weightedCompetencyScore([], "managerScore")).toBe(0);
  });

  it("returns 0 when the total weight is 0", () => {
    expect(
      weightedCompetencyScore([competency({ weight: 0, managerScore: 5 })], "managerScore")
    ).toBe(0);
  });

  it("computes a weighted average by the chosen score key", () => {
    const items = [
      competency({ weight: 3, managerScore: 4, selfScore: 5 }),
      competency({ weight: 1, managerScore: 2, selfScore: 3 }),
    ];
    // manager: (4*3 + 2*1) / 4 = 14/4 = 3.5
    expect(weightedCompetencyScore(items, "managerScore")).toBe(3.5);
    // self: (5*3 + 3*1) / 4 = 18/4 = 4.5
    expect(weightedCompetencyScore(items, "selfScore")).toBe(4.5);
  });

  it("rounds to one decimal place", () => {
    const items = [
      competency({ weight: 1, managerScore: 4 }),
      competency({ weight: 1, managerScore: 3 }),
      competency({ weight: 1, managerScore: 3 }),
    ];
    // (4 + 3 + 3) / 3 = 3.333... -> 3.3
    expect(weightedCompetencyScore(items, "managerScore")).toBe(3.3);
  });
});

describe("weightedGoalAttainment", () => {
  it("returns 0 with no goals or zero total weight", () => {
    expect(weightedGoalAttainment([])).toBe(0);
    expect(weightedGoalAttainment([goal({ weight: 0, progressPercent: 80 })])).toBe(0);
  });

  it("computes weighted goal attainment as a percentage", () => {
    const goals = [
      goal({ weight: 3, progressPercent: 100 }),
      goal({ weight: 1, progressPercent: 20 }),
    ];
    // (100*3 + 20*1) / 4 = 320/4 = 80
    expect(weightedGoalAttainment(goals)).toBe(80);
  });
});
