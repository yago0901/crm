import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./firebase", () => ({
  firestore: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  getDocs: vi.fn(),
  getAggregateFromServer: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  count: vi.fn(() => ({ type: "count" })),
  sum: vi.fn((field) => ({ type: "sum", field })),
}));

import { getAggregateFromServer, getDocs, where } from "firebase/firestore";
import {
  getContactStatusBreakdown,
  getDashboardStats,
  getMonthlyCashFlow,
  getPayrollByDepartment,
} from "./dashboard";
import { setCurrentCompanyId } from "./tenant";

describe("getDashboardStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("adds a companyId filter to every aggregate query when a company is set", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 0, valor: 0 }),
    } as never);
    setCurrentCompanyId("acme");

    await getDashboardStats();

    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
  });

  it("omits the companyId filter when no company is set", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 0, valor: 0 }),
    } as never);

    await getDashboardStats();

    expect(where).not.toHaveBeenCalledWith("companyId", "==", expect.anything());
  });
});

describe("getContactStatusBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("adds a companyId filter when a company is set", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 0 }),
    } as never);
    setCurrentCompanyId("acme");

    await getContactStatusBreakdown();

    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
  });
});

describe("getMonthlyCashFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("adds a companyId filter to both payables and receivables when a company is set", async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);
    setCurrentCompanyId("acme");

    await getMonthlyCashFlow();

    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
  });

  it("queries unfiltered when no company is set", async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

    await getMonthlyCashFlow();

    expect(where).not.toHaveBeenCalled();
  });
});

describe("getPayrollByDepartment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("adds a companyId filter when a company is set", async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);
    setCurrentCompanyId("acme");

    await getPayrollByDepartment();

    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
  });
});
