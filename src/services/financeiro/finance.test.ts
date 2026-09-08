import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/firebase", () => ({
  firestore: {},
}));

vi.mock("firebase/firestore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/firestore")>();
  let autoId = 0;
  return {
    ...actual,
    collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
    doc: vi.fn((_db, ...path) => {
      if (path.length > 0) return { type: "doc", path, id: path[path.length - 1] };
      autoId += 1;
      return { type: "doc", path, id: `auto-${autoId}` };
    }),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    writeBatch: vi.fn(),
    getAggregateFromServer: vi.fn(),
    query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
    where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
    orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
    serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
    onSnapshot: vi.fn(),
  };
});

import { Timestamp, addDoc, writeBatch } from "firebase/firestore";
import {
  createPayable,
  createPayableInstallments,
  createReceivable,
  createReceivableInstallments,
  getCashFlowSummary,
} from "./finance";
import { setCurrentCompanyId } from "../shared/tenant";
import { IPayable, IReceivable, PayableInput, ReceivableInput } from "../../types/finance";

const makePayable = (overrides: Partial<IPayable>): IPayable => ({
  id: "p1",
  companyId: "company1",
  description: "Conta genérica",
  supplier: "Fornecedor X",
  category: "Serviços",
  value: 100,
  dueDate: null,
  competenceDate: null,
  paidAt: null,
  status: "pendente",
  paymentMethod: "",
  notes: "",
  ownerId: "owner1",
  ownerName: "Owner",
  createdAt: null,
  updatedAt: null,
  ...overrides,
});

const makeReceivable = (overrides: Partial<IReceivable>): IReceivable => ({
  id: "r1",
  companyId: "company1",
  description: "Conta genérica",
  contactId: "contact1",
  contactName: "Cliente X",
  category: "Serviços",
  value: 100,
  dueDate: null,
  competenceDate: null,
  receivedAt: null,
  status: "pendente",
  paymentMethod: "",
  notes: "",
  ownerId: "owner1",
  ownerName: "Owner",
  createdAt: null,
  updatedAt: null,
  ...overrides,
});

const dateIn = (year: number, month: number, day: number) =>
  Timestamp.fromDate(new Date(year, month - 1, day));

describe("createPayable / createReceivable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("stamps a new payable with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createPayable(
      {
        description: "Aluguel",
        supplier: "Imob",
        category: "Fixas",
        value: 1000,
        dueDate: null,
        competenceDate: null,
        paidAt: null,
        status: "pendente",
        paymentMethod: "",
        notes: "",
      },
      { uid: "owner1", name: "Yago" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });

  it("stamps a new receivable with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createReceivable(
      {
        description: "Venda",
        contactId: "c1",
        contactName: "Maria",
        category: "Serviços",
        value: 500,
        dueDate: null,
        competenceDate: null,
        receivedAt: null,
        status: "pendente",
        paymentMethod: "",
        notes: "",
      },
      { uid: "owner1", name: "Yago" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});

describe("createPayableInstallments / createReceivableInstallments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId("acme");
  });

  const basePayable: PayableInput = {
    description: "Fornecedor mensal",
    supplier: "Fornecedor X",
    category: "Compras",
    value: 100,
    dueDate: dateIn(2026, 1, 10),
    competenceDate: null,
    paidAt: null,
    status: "pendente",
    paymentMethod: "",
    notes: "",
  };

  it("splits the value evenly across installments, adjusting the last one for rounding", async () => {
    const set = vi.fn();
    const commit = vi.fn().mockResolvedValue(undefined);
    vi.mocked(writeBatch).mockReturnValue({ set, commit } as never);

    await createPayableInstallments(
      { ...basePayable, value: 100 },
      { uid: "owner1", name: "Yago" },
      { count: 3, intervalDays: 30 }
    );

    expect(set).toHaveBeenCalledTimes(3);
    const values = set.mock.calls.map((call) => call[1].value);
    expect(values[0]).toBeCloseTo(33.33);
    expect(values[1]).toBeCloseTo(33.33);
    expect(values[2]).toBeCloseTo(33.34);
    expect(values.reduce((sum, v) => sum + v, 0)).toBeCloseTo(100);
    expect(commit).toHaveBeenCalled();
  });

  it("shares the same installmentGroupId and numbers each installment in order", async () => {
    const set = vi.fn();
    const commit = vi.fn().mockResolvedValue(undefined);
    vi.mocked(writeBatch).mockReturnValue({ set, commit } as never);

    await createPayableInstallments(basePayable, { uid: "owner1", name: "Yago" }, {
      count: 4,
      intervalDays: 15,
    });

    const groupIds = set.mock.calls.map((call) => call[1].installmentGroupId);
    expect(new Set(groupIds).size).toBe(1);
    expect(set.mock.calls.map((call) => call[1].installmentNumber)).toEqual([1, 2, 3, 4]);
    expect(set.mock.calls.every((call) => call[1].installmentTotal === 4)).toBe(true);
  });

  it("spaces due dates by the given interval starting from the first due date", async () => {
    const set = vi.fn();
    const commit = vi.fn().mockResolvedValue(undefined);
    vi.mocked(writeBatch).mockReturnValue({ set, commit } as never);

    await createReceivableInstallments(
      {
        description: "Venda parcelada",
        contactId: "c1",
        contactName: "Maria",
        category: "Vendas",
        value: 300,
        dueDate: dateIn(2026, 1, 10),
        competenceDate: null,
        receivedAt: null,
        status: "pendente",
        paymentMethod: "",
        notes: "",
      } as ReceivableInput,
      { uid: "owner1", name: "Yago" },
      { count: 3, intervalDays: 30 }
    );

    const dueDates = set.mock.calls.map((call) => {
      const date = (call[1].dueDate as Timestamp).toDate();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`;
    });
    expect(dueDates).toEqual(["2026-01-10", "2026-02-09", "2026-03-11"]);
  });

  it("never writes an undefined paymentMethod (Firestore rejects undefined field values)", async () => {
    const set = vi.fn();
    const commit = vi.fn().mockResolvedValue(undefined);
    vi.mocked(writeBatch).mockReturnValue({ set, commit } as never);

    await createPayableInstallments(
      { ...basePayable, paymentMethod: "" },
      { uid: "owner1", name: "Yago" },
      { count: 2, intervalDays: 30 }
    );

    for (const call of set.mock.calls) {
      expect(call[1].paymentMethod).not.toBeUndefined();
      expect(Object.values(call[1]).every((value) => value !== undefined)).toBe(true);
    }
  });

  it("throws when there is no due date to anchor the installments", async () => {
    await expect(
      createPayableInstallments(
        { ...basePayable, dueDate: null },
        { uid: "owner1", name: "Yago" },
        { count: 2, intervalDays: 30 }
      )
    ).rejects.toThrow("vencimento");
  });
});

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

  it("excludes cancelado and estornado from both totals and monthly breakdown", () => {
    const payables = [
      makePayable({ value: 100, dueDate: dateIn(2026, 3, 10), status: "pendente" }),
      makePayable({ value: 999, dueDate: dateIn(2026, 3, 10), status: "cancelado" }),
      makePayable({ value: 999, dueDate: dateIn(2026, 3, 10), status: "estornado" }),
    ];
    const receivables = [
      makeReceivable({ value: 50, dueDate: dateIn(2026, 3, 10), status: "renegociado" }),
    ];

    const summary = getCashFlowSummary(payables, receivables);
    const march = summary.months.find((m) => m.month === "2026-03");

    expect(summary.totalAPagar).toBe(100);
    expect(summary.totalAReceber).toBe(50);
    expect(march?.despesas).toBe(100);
    expect(march?.receitas).toBe(50);
  });

  it("counts parcialmente_pago and renegociado as still open", () => {
    const payables = [
      makePayable({ value: 40, status: "parcialmente_pago" }),
      makePayable({ value: 60, status: "renegociado" }),
    ];

    const summary = getCashFlowSummary(payables, []);
    expect(summary.totalAPagar).toBe(100);
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
