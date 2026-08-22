import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import { getCashFlowSummary } from "./finance";
import { IPayable, IReceivable } from "../types/finance";

const makePayable = (overrides: Partial<IPayable>): IPayable => ({
  id: "p1",
  description: "Conta genérica",
  supplier: "Fornecedor X",
  category: "Serviços",
  value: 100,
  dueDate: null,
  paidAt: null,
  status: "pendente",
  notes: "",
  ownerId: "owner1",
  ownerName: "Owner",
  createdAt: null,
  updatedAt: null,
  ...overrides,
});

const makeReceivable = (overrides: Partial<IReceivable>): IReceivable => ({
  id: "r1",
  description: "Conta genérica",
  contactId: "contact1",
  contactName: "Cliente X",
  category: "Serviços",
  value: 100,
  dueDate: null,
  receivedAt: null,
  status: "pendente",
  notes: "",
  ownerId: "owner1",
  ownerName: "Owner",
  createdAt: null,
  updatedAt: null,
  ...overrides,
});

const dateIn = (year: number, month: number, day: number) =>
  Timestamp.fromDate(new Date(year, month - 1, day));

describe("getCashFlowSummary", () => {
  it("returns zeroed totals and no months for empty input", () => {
    const summary = getCashFlowSummary([], []);
    expect(summary.totalAPagar).toBe(0);
    expect(summary.totalAReceber).toBe(0);
    expect(summary.saldoPrevisto).toBe(0);
    expect(summary.months).toEqual([]);
  });

  it("only counts open (non-paid) entries in the totals", () => {
    const payables = [
      makePayable({ value: 100, status: "pendente" }),
      makePayable({ value: 50, status: "pago" }),
    ];
    const receivables = [
      makeReceivable({ value: 200, status: "atrasado" }),
      makeReceivable({ value: 80, status: "pago" }),
    ];

    const summary = getCashFlowSummary(payables, receivables);

    expect(summary.totalAPagar).toBe(100);
    expect(summary.totalAReceber).toBe(200);
    expect(summary.saldoPrevisto).toBe(100);
  });

  it("groups entries by the month of dueDate, regardless of status", () => {
    const payables = [
      makePayable({ value: 100, dueDate: dateIn(2026, 3, 10), status: "pago" }),
      makePayable({ value: 50, dueDate: dateIn(2026, 3, 20), status: "pendente" }),
    ];
    const receivables = [
      makeReceivable({ value: 300, dueDate: dateIn(2026, 4, 5), status: "pendente" }),
    ];

    const summary = getCashFlowSummary(payables, receivables);
    const march = summary.months.find((m) => m.month === "2026-03");
    const april = summary.months.find((m) => m.month === "2026-04");

    expect(march?.despesas).toBe(150);
    expect(march?.receitas).toBe(0);
    expect(march?.saldo).toBe(-150);

    expect(april?.receitas).toBe(300);
    expect(april?.saldo).toBe(300);
  });

  it("buckets entries with no dueDate under 'sem-data'", () => {
    const summary = getCashFlowSummary(
      [makePayable({ value: 10, dueDate: null })],
      []
    );
    expect(summary.months).toHaveLength(1);
    expect(summary.months[0].month).toBe("sem-data");
  });

  it("returns months sorted chronologically", () => {
    const payables = [
      makePayable({ value: 1, dueDate: dateIn(2026, 6, 1) }),
      makePayable({ value: 1, dueDate: dateIn(2026, 1, 1) }),
      makePayable({ value: 1, dueDate: dateIn(2026, 3, 1) }),
    ];

    const summary = getCashFlowSummary(payables, []);
    expect(summary.months.map((m) => m.month)).toEqual([
      "2026-01",
      "2026-03",
      "2026-06",
    ]);
  });
});
