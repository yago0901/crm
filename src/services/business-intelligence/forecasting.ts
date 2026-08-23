import { getMonthlyCashFlow } from "../shared/dashboard";
import { IMonthlyCashFlow } from "../financeiro/finance";

export interface IForecastMonth {
  month: string;
  receitas: number;
  despesas: number;
  saldo: number;
  projected: boolean;
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  const sumX = values.reduce((acc, _, i) => acc + i, 0);
  const sumY = values.reduce((acc, v) => acc + v, 0);
  const sumXY = values.reduce((acc, v, i) => acc + i * v, 0);
  const sumXX = values.reduce((acc, _, i) => acc + i * i, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: n > 0 ? sumY / n : 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function projectNext(values: number[], periods: number): number[] {
  if (values.length === 0) return Array(periods).fill(0);
  if (values.length === 1) return Array(periods).fill(values[0]);

  const { slope, intercept } = linearRegression(values);
  const n = values.length;
  return Array.from({ length: periods }, (_, i) => slope * (n + i) + intercept);
}

const nextMonthLabel = (key: string): string => {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export async function getCashFlowForecast(monthsAhead = 2): Promise<IForecastMonth[]> {
  const history = (await getMonthlyCashFlow()).filter(
    (m): m is IMonthlyCashFlow & { month: string } => m.month !== "sem-data"
  );

  const historical: IForecastMonth[] = history.map((m) => ({
    month: m.month,
    receitas: m.receitas,
    despesas: m.despesas,
    saldo: m.saldo,
    projected: false,
  }));

  if (historical.length === 0) return [];

  const projectedReceitas = projectNext(
    history.map((m) => m.receitas),
    monthsAhead
  );
  const projectedDespesas = projectNext(
    history.map((m) => m.despesas),
    monthsAhead
  );

  let lastMonth = history[history.length - 1].month;
  const projected: IForecastMonth[] = [];
  for (let i = 0; i < monthsAhead; i++) {
    lastMonth = nextMonthLabel(lastMonth);
    const receitas = Math.max(0, projectedReceitas[i]);
    const despesas = Math.max(0, projectedDespesas[i]);
    projected.push({
      month: lastMonth,
      receitas,
      despesas,
      saldo: receitas - despesas,
      projected: true,
    });
  }

  return [...historical, ...projected];
}
