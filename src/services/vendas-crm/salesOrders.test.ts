import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/firebase", () => ({
  firestore: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  doc: vi.fn((refOrDb, ...path) => {
    if (path.length === 0 && refOrDb?.type === "collection") {
      const collectionName = refOrDb.path[0];
      return {
        type: "doc",
        path: refOrDb.path,
        id: collectionName === "stockMovements" ? "movement-1" : "receivable-1",
      };
    }
    return { type: "doc", path, id: path[path.length - 1] };
  }),
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
  getAggregateFromServer: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  onSnapshot: vi.fn(),
}));

import { getDoc, getDocs, runTransaction, where } from "firebase/firestore";
import { approveSalesOrder, fetchApprovedSalesOrders } from "./salesOrders";
import { setCurrentCompanyId } from "../shared/tenant";

const baseOrder = {
  contactId: "c1",
  contactName: "Maria",
  status: "rascunho",
  approvedProcessedAt: null,
  total: 300,
  items: [{ productId: "p1", productName: "Cadeira", quantity: 2, unitPrice: 150, discountPercent: 0 }],
};

const mockInventoryLookup = (inventoryDocs: { ref: { id: string }; data: Record<string, unknown> }[]) => {
  vi.mocked(getDocs).mockResolvedValueOnce({
    empty: inventoryDocs.length === 0,
    docs: inventoryDocs,
  } as never);
};

const mockTransaction = (
  order: Record<string, unknown>,
  inventorySnaps: Record<string, unknown>[],
  notifSnaps: (Record<string, unknown> | null)[] = []
) => {
  const get = vi.fn().mockResolvedValueOnce({ exists: () => true, data: () => order });
  inventorySnaps.forEach((snap, index) => {
    get.mockResolvedValueOnce({ exists: () => true, data: () => snap });
    const notif = notifSnaps[index];
    get.mockResolvedValueOnce(
      notif ? { exists: () => true, data: () => notif } : { exists: () => false }
    );
  });
  const set = vi.fn();
  const update = vi.fn();
  vi.mocked(runTransaction).mockImplementation(async (_db, callback) =>
    callback({ get, set, update } as never)
  );
  return { get, set, update };
};

describe("approveSalesOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId("acme");
  });

  it("throws when the order was already approved", async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ ...baseOrder, approvedProcessedAt: "SOME_TIMESTAMP" }),
    } as never);

    await expect(
      approveSalesOrder("order1", { uid: "owner1", name: "Yago" })
    ).rejects.toThrow("já foi aprovado");
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it("throws when the order is cancelled", async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ ...baseOrder, status: "cancelado" }),
    } as never);

    await expect(
      approveSalesOrder("order1", { uid: "owner1", name: "Yago" })
    ).rejects.toThrow("cancelado");
  });

  it("deducts stock, records a movement, and generates a receivable", async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => baseOrder } as never);
    mockInventoryLookup([{ ref: { id: "item1" }, data: {} }]);
    const { set, update } = mockTransaction(baseOrder, [{ quantity: 10, name: "Cadeira" }]);

    await approveSalesOrder("order1", { uid: "owner1", name: "Yago" });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "item1" }),
      expect.objectContaining({ quantity: 8 })
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ id: "movement-1" }),
      expect.objectContaining({ itemId: "item1", type: "saida", quantity: -2, balanceAfter: 8 })
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ id: "receivable-1" }),
      expect.objectContaining({ companyId: "acme", category: "Vendas", value: 300, status: "pendente" })
    );
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "aprovado" })
    );
  });

  it("skips stock movement for a product with no matching inventory item", async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => baseOrder } as never);
    mockInventoryLookup([]);
    const { set } = mockTransaction(baseOrder, []);

    await approveSalesOrder("order1", { uid: "owner1", name: "Yago" });

    expect(set).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: "movement-1" }),
      expect.anything()
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ id: "receivable-1" }),
      expect.objectContaining({ value: 300 })
    );
  });

  it("consumes recipe ingredients when the sold product has no stock item of its own", async () => {
    const order = {
      contactId: "c1",
      contactName: "Maria",
      status: "rascunho",
      approvedProcessedAt: null,
      total: 50,
      items: [
        { productId: "sanduiche", productName: "Sanduíche", quantity: 4, unitPrice: 12.5, discountPercent: 0 },
      ],
    };

    vi.mocked(getDoc)
      .mockResolvedValueOnce({ exists: () => true, data: () => order } as never)
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          recipe: [
            { ingredientProductId: "pao", quantityPerUnit: 1 },
            { ingredientProductId: "tomate", quantityPerUnit: 0.25 },
          ],
        }),
      } as never);

    vi.mocked(getDocs)
      .mockResolvedValueOnce({ empty: true, docs: [] } as never)
      .mockResolvedValueOnce({ empty: false, docs: [{ ref: { id: "item-pao" } }] } as never)
      .mockResolvedValueOnce({ empty: false, docs: [{ ref: { id: "item-tomate" } }] } as never);

    const get = vi
      .fn()
      .mockResolvedValueOnce({ exists: () => true, data: () => order })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ quantity: 100, name: "Pão" }) })
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ quantity: 10, name: "Tomate" }) })
      .mockResolvedValueOnce({ exists: () => false });
    const set = vi.fn();
    const update = vi.fn();
    vi.mocked(runTransaction).mockImplementation(async (_db, callback) =>
      callback({ get, set, update } as never)
    );

    await approveSalesOrder("order1", { uid: "owner1", name: "Yago" });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "item-pao" }),
      expect.objectContaining({ quantity: 96 })
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "item-tomate" }),
      expect.objectContaining({ quantity: 9 })
    );
    expect(set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ itemId: "item-pao", quantity: -4 })
    );
    expect(set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ itemId: "item-tomate", quantity: -1 })
    );
  });

  it("throws when there isn't enough stock to fulfill the order", async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => baseOrder } as never);
    mockInventoryLookup([{ ref: { id: "item1" }, data: {} }]);
    mockTransaction(baseOrder, [{ quantity: 1, name: "Cadeira" }]);

    await expect(
      approveSalesOrder("order1", { uid: "owner1", name: "Yago" })
    ).rejects.toThrow("Estoque insuficiente");
  });
});

describe("fetchApprovedSalesOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty array when there is no current company", async () => {
    setCurrentCompanyId(null);
    expect(await fetchApprovedSalesOrders()).toEqual([]);
  });

  it("filters by aprovado status", async () => {
    setCurrentCompanyId("acme");
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

    await fetchApprovedSalesOrders();

    expect(where).toHaveBeenCalledWith("status", "==", "aprovado");
  });
});
