import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/firebase", () => ({
  firestore: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  doc: vi.fn((_db, ...path) => ({ type: "doc", path })),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  getAggregateFromServer: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  sum: vi.fn((field) => ({ type: "sum", field })),
  onSnapshot: vi.fn(),
}));

import { addDoc, getAggregateFromServer, updateDoc } from "firebase/firestore";
import { createPayrollEntry, getPayrollOpenTotal, markPayrollEntryPaid } from "./payroll";
import { setCurrentCompanyId } from "../shared/tenant";

describe("createPayrollEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("creates the entry with paidAt null and owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createPayrollEntry(
      {
        employeeId: "e1",
        employeeName: "Maria",
        competencia: "2026-08",
        baseSalary: 5000,
        bonuses: 200,
        deductions: 100,
        netValue: 5100,
        status: "pendente",
        notes: "",
      },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        employeeName: "Maria",
        netValue: 5100,
        paidAt: null,
        ownerId: "owner1",
        ownerName: "Yago",
      })
    );
  });

  it("stamps the entry with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createPayrollEntry(
      {
        employeeId: "e1",
        employeeName: "Maria",
        competencia: "2026-08",
        baseSalary: 5000,
        bonuses: 200,
        deductions: 100,
        netValue: 5100,
        status: "pendente",
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

describe("markPayrollEntryPaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets status to pago and stamps paidAt", async () => {
    await markPayrollEntryPaid("p1");

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pago",
        paidAt: "SERVER_TIMESTAMP",
        updatedAt: "SERVER_TIMESTAMP",
      })
    );
  });
});

describe("getPayrollOpenTotal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sums netValue for pendente entries", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 12000 }),
    } as never);

    expect(await getPayrollOpenTotal()).toBe(12000);
  });
});
