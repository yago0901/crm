import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/dashboard", () => ({
  getMonthlyCashFlow: vi.fn(),
}));

import { getMonthlyCashFlow } from "../shared/dashboard";
import { getCashFlowForecast } from "./forecasting";

describe("getCashFlowForecast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty array when there is no history", async () => {
    vi.mocked(getMonthlyCashFlow).mockResolvedValue([]);

    expect(await getCashFlowForecast()).toEqual([]);
  });

  it("ignores the sem-data bucket and keeps historical months marked as not projected", async () => {
    vi.mocked(getMonthlyCashFlow).mockResolvedValue([
      { month: "sem-data", receitas: 999, despesas: 999, saldo: 0 },
      { month: "2026-06", receitas: 1000, despesas: 500, saldo: 500 },
      { month: "2026-07", receitas: 1200, despesas: 600, saldo: 600 },
    ]);

    const result = await getCashFlowForecast(2);

    const historical = result.filter((m) => !m.projected);
    expect(historical).toHaveLength(2);
    expect(historical.map((m) => m.month)).toEqual(["2026-06", "2026-07"]);
  });

  it("projects the requested number of future months, chronologically labeled", async () => {
    vi.mocked(getMonthlyCashFlow).mockResolvedValue([
      { month: "2026-05", receitas: 1000, despesas: 500, saldo: 500 },
      { month: "2026-06", receitas: 1100, despesas: 500, saldo: 600 },
      { month: "2026-07", receitas: 1200, despesas: 500, saldo: 700 },
    ]);

    const result = await getCashFlowForecast(2);
    const projected = result.filter((m) => m.projected);

    expect(projected).toHaveLength(2);
    expect(projected.map((m) => m.month)).toEqual(["2026-08", "2026-09"]);
    expect(projected[0].receitas).toBeGreaterThan(1200);
  });

  it("never projects negative revenue or expenses", async () => {
    vi.mocked(getMonthlyCashFlow).mockResolvedValue([
      { month: "2026-05", receitas: 300, despesas: 100, saldo: 200 },
      { month: "2026-06", receitas: 100, despesas: 100, saldo: 0 },
      { month: "2026-07", receitas: -100, despesas: 100, saldo: -200 },
    ]);

    const result = await getCashFlowForecast(1);
    const projected = result.find((m) => m.projected);

    expect(projected?.receitas).toBeGreaterThanOrEqual(0);
  });
});
