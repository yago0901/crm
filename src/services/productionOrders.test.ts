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
  count: vi.fn(() => ({ type: "count" })),
  onSnapshot: vi.fn(),
}));

import { addDoc, getAggregateFromServer } from "firebase/firestore";
import { createProductionOrder, getPendingProductionOrdersCount } from "./productionOrders";

describe("createProductionOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the order with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createProductionOrder(
      { description: "Lote 12", productName: "Cadeira modelo X", quantity: 50, status: "pendente", dueDate: null, notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ description: "Lote 12", ownerId: "owner1" })
    );
  });
});

describe("getPendingProductionOrdersCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts orders pendente", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 5 }),
    } as never);

    expect(await getPendingProductionOrdersCount()).toBe(5);
  });
});
