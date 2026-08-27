import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/firebase", () => ({
  firestore: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  getDocs: vi.fn(),
  getAggregateFromServer: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  sum: vi.fn((field) => ({ type: "sum", field })),
}));

import { getAggregateFromServer, getDocs, where } from "firebase/firestore";
import {
  getInventoryStatusBreakdown,
  getLowStockItemsCount,
  getProjectsStatusBreakdown,
  getPurchaseOrdersValueByStatus,
} from "./analytics";
import { setCurrentCompanyId } from "../shared/tenant";

describe("getInventoryStatusBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("counts documents per status", async () => {
    vi.mocked(getDocs)
      .mockResolvedValueOnce({ size: 5 } as never)
      .mockResolvedValueOnce({ size: 2 } as never);

    const result = await getInventoryStatusBreakdown();

    expect(result).toEqual([
      { status: "ativo", count: 5 },
      { status: "descontinuado", count: 2 },
    ]);
  });

  it("adds a companyId filter when a company is set", async () => {
    vi.mocked(getDocs).mockResolvedValue({ size: 0 } as never);
    setCurrentCompanyId("acme");

    await getInventoryStatusBreakdown();

    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
  });
});

describe("getLowStockItemsCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts only active items where quantity is at or below the minimum", async () => {
    const docs = [
      { id: "i1", data: () => ({ name: "A", status: "ativo", quantity: 2, minQuantity: 5 }) },
      { id: "i2", data: () => ({ name: "B", status: "ativo", quantity: 10, minQuantity: 5 }) },
    ];
    vi.mocked(getDocs).mockResolvedValue({ docs } as never);

    expect(await getLowStockItemsCount()).toBe(1);
  });
});

describe("getProjectsStatusBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts documents per status across all four project statuses", async () => {
    vi.mocked(getDocs).mockResolvedValue({ size: 1 } as never);

    const result = await getProjectsStatusBreakdown();

    expect(result).toHaveLength(4);
    expect(getDocs).toHaveBeenCalledTimes(4);
  });
});

describe("getPurchaseOrdersValueByStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("sums the value field per status", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 500 }),
    } as never);

    const result = await getPurchaseOrdersValueByStatus();

    expect(result[0]).toEqual({ status: "pendente", total: 500 });
  });

  it("adds a companyId filter when a company is set", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 0 }),
    } as never);
    setCurrentCompanyId("acme");

    await getPurchaseOrdersValueByStatus();

    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
  });
});
