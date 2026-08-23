import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./firebase", () => ({
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

import { addDoc, getAggregateFromServer } from "firebase/firestore";
import { createPurchaseOrder, getPendingPurchaseOrdersTotal } from "./purchaseOrders";

describe("createPurchaseOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the order with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createPurchaseOrder(
      {
        supplierId: "s1",
        supplierName: "Fornecedor X",
        description: "Reposição de insumos",
        value: 1500,
        status: "pendente",
        orderDate: null,
        expectedDate: null,
        notes: "",
      },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        supplierName: "Fornecedor X",
        value: 1500,
        ownerId: "owner1",
      })
    );
  });
});

describe("getPendingPurchaseOrdersTotal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sums the value of pendente orders", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 4200 }),
    } as never);

    expect(await getPendingPurchaseOrdersTotal()).toBe(4200);
  });
});
