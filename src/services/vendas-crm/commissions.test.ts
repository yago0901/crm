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
import {
  createCommission,
  getPendingCommissionsTotal,
  markCommissionPaid,
} from "./commissions";
import { setCurrentCompanyId } from "../shared/tenant";

const input = {
  employeeId: "e1",
  employeeName: "João",
  salesOrderId: "",
  salesOrderReference: "",
  saleValue: 1000,
  commissionRate: 5,
  commissionValue: 50,
  status: "pendente" as const,
  notes: "",
};

describe("createCommission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("creates the commission with paidAt null and owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createCommission(input, { uid: "owner1", name: "Yago" });

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        employeeName: "João",
        commissionValue: 50,
        paidAt: null,
        ownerId: "owner1",
        ownerName: "Yago",
      })
    );
  });

  it("stamps the commission with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createCommission(input, { uid: "owner1", name: "Yago" });

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});

describe("markCommissionPaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets status to pago and stamps paidAt", async () => {
    await markCommissionPaid("c1");

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "pago", paidAt: "SERVER_TIMESTAMP" })
    );
  });
});

describe("getPendingCommissionsTotal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sums commissionValue for pendente commissions", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 320 }),
    } as never);

    expect(await getPendingCommissionsTotal()).toBe(320);
  });
});
