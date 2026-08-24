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

import { addDoc, getAggregateFromServer, where } from "firebase/firestore";
import { createContract, getActiveContractsTotal } from "./contracts";
import { setCurrentCompanyId } from "../shared/tenant";

describe("createContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("stamps the contract with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createContract(
      { title: "Plano anual", contactId: "c1", contactName: "Maria", value: 1000, status: "rascunho", startDate: null, endDate: null, notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});

describe("getActiveContractsTotal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("sums ativo contracts filtered by the current companyId", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 5000 }),
    } as never);
    setCurrentCompanyId("acme");

    const total = await getActiveContractsTotal();

    expect(total).toBe(5000);
    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
  });
});
