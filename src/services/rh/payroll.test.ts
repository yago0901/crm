import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/firebase", () => ({
  firestore: {},
}));

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual<typeof import("firebase/firestore")>("firebase/firestore");
  return {
    collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
    doc: vi.fn((refOrDb, ...path) => {
      if (path.length === 0 && refOrDb?.type === "collection") {
        const collectionName = refOrDb.path[0];
        return {
          type: "doc",
          path: refOrDb.path,
          id: collectionName === "payrollEntries" ? "entry-1" : "payable-1",
        };
      }
      return { type: "doc", path, id: path[path.length - 1] };
    }),
    addDoc: vi.fn(),
    deleteDoc: vi.fn(),
    updateDoc: vi.fn(),
    writeBatch: vi.fn(),
    getAggregateFromServer: vi.fn(),
    query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
    where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
    orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
    serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
    sum: vi.fn((field) => ({ type: "sum", field })),
    onSnapshot: vi.fn(),
    Timestamp: actual.Timestamp,
  };
});

import { getAggregateFromServer, updateDoc, writeBatch } from "firebase/firestore";
import { createPayrollEntry, getPayrollOpenTotal, markPayrollEntryPaid } from "./payroll";
import { setCurrentCompanyId } from "../shared/tenant";

describe("createPayrollEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId("acme");
  });

  const input = {
    employeeId: "e1",
    employeeName: "Maria",
    competencia: "2026-08",
    baseSalary: 5000,
    bonuses: 200,
    deductions: 100,
    netValue: 5100,
    status: "pendente" as const,
    notes: "",
  };

  const mockBatch = () => {
    const batchSet = vi.fn();
    const batchCommit = vi.fn().mockResolvedValue(undefined);
    vi.mocked(writeBatch).mockReturnValue({ set: batchSet, commit: batchCommit } as never);
    return { batchSet, batchCommit };
  };

  it("creates the entry with paidAt null, owner info, and the current companyId", async () => {
    const { batchSet } = mockBatch();

    const id = await createPayrollEntry(input, { uid: "owner1", name: "Yago" });

    expect(id).toBe("entry-1");
    expect(batchSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: "entry-1" }),
      expect.objectContaining({
        companyId: "acme",
        employeeName: "Maria",
        netValue: 5100,
        paidAt: null,
        ownerId: "owner1",
        ownerName: "Yago",
      })
    );
  });

  it("also creates a matching Contas a Pagar entry due on the 5th of the following month", async () => {
    const { batchSet } = mockBatch();

    await createPayrollEntry(input, { uid: "owner1", name: "Yago" });

    const payableCall = vi.mocked(batchSet).mock.calls.find(
      ([ref]) => (ref as { id: string }).id === "payable-1"
    );
    expect(payableCall).toBeDefined();
    const payableData = payableCall![1] as { dueDate: { toDate: () => Date } };
    expect(payableData.dueDate.toDate()).toEqual(new Date(2026, 8, 5));

    expect(batchSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: "payable-1" }),
      expect.objectContaining({
        companyId: "acme",
        category: "Folha de Pagamento",
        value: 5100,
        status: "pendente",
      })
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
