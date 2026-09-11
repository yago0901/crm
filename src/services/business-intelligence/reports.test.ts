import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/firebase", () => ({
  firestore: {},
}));

vi.mock("firebase/firestore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/firestore")>();
  return {
    ...actual,
    collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
    doc: vi.fn((_db, ...path) => ({ type: "doc", path })),
    addDoc: vi.fn(),
    deleteDoc: vi.fn(),
    updateDoc: vi.fn(),
    getDocs: vi.fn(),
    getAggregateFromServer: vi.fn(),
    query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
    where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
    orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
    serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
    onSnapshot: vi.fn(),
  };
});

import { Timestamp, addDoc, getDocs, where } from "firebase/firestore";
import {
  applyReportFilters,
  createSavedReport,
  groupAndAggregate,
  mapSavedReport,
  matchesFilter,
  runReport,
  sortRows,
  toCsv,
} from "./reports";
import { EMPTY_REPORT_CONFIG } from "../../types/savedReport";
import { setCurrentCompanyId } from "../shared/tenant";

const strField = { key: "description", label: "Descrição", type: "string" as const };
const numField = { key: "value", label: "Valor", type: "number" as const };

describe("matchesFilter", () => {
  it("does case-insensitive substring match for contains", () => {
    expect(
      matchesFilter({ description: "Aluguel do galpão" }, { field: "description", operator: "contains", value: "galp" }, strField)
    ).toBe(true);
    expect(
      matchesFilter({ description: "Energia" }, { field: "description", operator: "contains", value: "agua" }, strField)
    ).toBe(false);
  });

  it("compares numbers with gt/lte", () => {
    expect(matchesFilter({ value: 500 }, { field: "value", operator: "gt", value: "100" }, numField)).toBe(true);
    expect(matchesFilter({ value: 90 }, { field: "value", operator: "lte", value: "100" }, numField)).toBe(true);
    expect(matchesFilter({ value: 500 }, { field: "value", operator: "lt", value: "100" }, numField)).toBe(false);
  });
});

describe("applyReportFilters", () => {
  const fields = [strField, numField];
  const rows = [
    { description: "Aluguel", value: 3000 },
    { description: "Energia", value: 450 },
    { description: "Internet", value: 120 },
  ];

  it("returns all rows when there are no active filters", () => {
    expect(applyReportFilters(rows, [], fields)).toHaveLength(3);
    expect(applyReportFilters(rows, [{ field: "value", operator: "gt", value: "  " }], fields)).toHaveLength(3);
  });

  it("AND-combines multiple active filters", () => {
    const out = applyReportFilters(
      rows,
      [
        { field: "value", operator: "gte", value: "400" },
        { field: "description", operator: "contains", value: "e" },
      ],
      fields
    );
    expect(out.map((r) => r.description)).toEqual(["Aluguel", "Energia"]);
  });
});

describe("sortRows", () => {
  it("sorts numerically ascending and descending", () => {
    const rows = [{ value: 30 }, { value: 5 }, { value: 12 }];
    expect(sortRows(rows, "value", "asc", "number").map((r) => r.value)).toEqual([5, 12, 30]);
    expect(sortRows(rows, "value", "desc", "number").map((r) => r.value)).toEqual([30, 12, 5]);
  });

  it("returns the input untouched when no sort field is given", () => {
    const rows = [{ value: 2 }, { value: 1 }];
    expect(sortRows(rows, "", "asc", "number")).toBe(rows);
  });
});

describe("groupAndAggregate", () => {
  const rows = [
    { category: "Vendas", value: 100 },
    { category: "Vendas", value: 300 },
    { category: "Serviços", value: 50 },
  ];

  it("counts rows per group", () => {
    const groups = groupAndAggregate(rows, "category", "count", "");
    expect(groups).toEqual([
      { key: "Vendas", value: 2 },
      { key: "Serviços", value: 1 },
    ]);
  });

  it("sums a numeric field per group, sorted by value desc", () => {
    const groups = groupAndAggregate(rows, "category", "sum", "value");
    expect(groups).toEqual([
      { key: "Vendas", value: 400 },
      { key: "Serviços", value: 50 },
    ]);
  });

  it("averages a numeric field per group", () => {
    const groups = groupAndAggregate(rows, "category", "avg", "value");
    expect(groups.find((g) => g.key === "Vendas")?.value).toBe(200);
  });
});

describe("toCsv", () => {
  it("uses ; as separator and quotes cells with separators or quotes", () => {
    const csv = toCsv(
      [
        { key: "a", label: "Nome" },
        { key: "b", label: "Valor" },
      ],
      [
        ["João", "10"],
        ['Empresa "X"; Ltda', "20"],
      ]
    );
    expect(csv).toBe('Nome;Valor\nJoão;10\n"Empresa ""X""; Ltda";20');
  });
});

describe("mapSavedReport", () => {
  it("fills a default config when the stored doc has none", () => {
    const report = mapSavedReport({
      id: "r1",
      data: () => ({ companyId: "acme", name: "Antigo", source: "contacts", ownerId: "o1" }),
    } as never);
    expect(report.config).toEqual(EMPTY_REPORT_CONFIG);
  });
});

describe("createSavedReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId("acme");
  });

  it("creates the saved report with owner + companyId + config", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createSavedReport(
      { name: "AR por categoria", source: "receivables", config: EMPTY_REPORT_CONFIG, notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: "AR por categoria", source: "receivables", companyId: "acme", ownerId: "owner1" })
    );
  });
});

describe("runReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId("acme");
  });

  it("always filters by companyId and returns formatted rows for the chosen columns", async () => {
    vi.mocked(getDocs).mockResolvedValue({
      docs: [
        { id: "r1", data: () => ({ description: "Venda 1", value: 1500, status: "pendente" }) },
        { id: "r2", data: () => ({ description: "Venda 2", value: 200, status: "pago" }) },
      ],
    } as never);

    const result = await runReport("receivables", {
      ...EMPTY_REPORT_CONFIG,
      columns: ["description", "value"],
      sortField: "value",
      sortDir: "desc",
    });

    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
    expect(result.mode).toBe("rows");
    expect(result.columns.map((c) => c.label)).toEqual(["Descrição", "Valor"]);
    expect(result.rows[0][0]).toBe("Venda 1");
    expect(result.rows[0][1]).toContain("1.500");
    expect(result.total).toBe(2);
  });

  it("adds a date-range constraint on the source's date field when a range is set", async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

    await runReport("receivables", {
      ...EMPTY_REPORT_CONFIG,
      dateFrom: Timestamp.fromDate(new Date(2026, 0, 1)),
      dateTo: Timestamp.fromDate(new Date(2026, 2, 31)),
    });

    expect(where).toHaveBeenCalledWith("dueDate", ">=", expect.anything());
    expect(where).toHaveBeenCalledWith("dueDate", "<=", expect.anything());
  });

  it("returns grouped rows and groups when groupByField is set", async () => {
    vi.mocked(getDocs).mockResolvedValue({
      docs: [
        { id: "r1", data: () => ({ category: "Vendas", value: 100 }) },
        { id: "r2", data: () => ({ category: "Vendas", value: 300 }) },
        { id: "r3", data: () => ({ category: "Serviços", value: 50 }) },
      ],
    } as never);

    const result = await runReport("receivables", {
      ...EMPTY_REPORT_CONFIG,
      groupByField: "category",
      aggregationFn: "sum",
      aggregationField: "value",
    });

    expect(result.mode).toBe("grouped");
    expect(result.groups).toEqual([
      { key: "Vendas", value: 400 },
      { key: "Serviços", value: 50 },
    ]);
  });
});
