import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/firebase", () => ({
  firestore: {},
  auth: { currentUser: { uid: "owner1", displayName: "Yago", email: "yago@test.com" } },
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  doc: vi.fn((_db, ...path) => ({ type: "doc", path })),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  runTransaction: vi.fn(),
  getAggregateFromServer: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  sum: vi.fn((field) => ({ type: "sum", field })),
  onSnapshot: vi.fn(),
}));

import { addDoc, getAggregateFromServer, runTransaction } from "firebase/firestore";
import {
  createPurchaseOrder,
  getPendingPurchaseOrdersTotal,
  receivePurchaseOrder,
} from "./purchaseOrders";
import { setCurrentCompanyId } from "../shared/tenant";

const mockTransaction = (
  orderData: Record<string, unknown>,
  itemData?: Record<string, unknown>,
  warehouseStockData?: Record<string, unknown>
) => {
  const get = vi.fn().mockResolvedValueOnce({ exists: () => true, data: () => orderData });
  if (itemData !== undefined) {
    get.mockResolvedValueOnce({ exists: () => true, data: () => itemData });
  }
  if (orderData.warehouseId) {
    get.mockResolvedValueOnce(
      warehouseStockData !== undefined
        ? { exists: () => true, data: () => warehouseStockData }
        : { exists: () => false }
    );
  }
  const set = vi.fn();
  const update = vi.fn();
  vi.mocked(runTransaction).mockImplementation(async (_db, callback) =>
    callback({ get, set, update } as never)
  );
  return { get, set, update };
};

describe("createPurchaseOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
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

  it("stamps the order with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createPurchaseOrder(
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

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});

describe("receivePurchaseOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId("acme");
  });

  it("marks the order received and creates a payable when there is no linked stock item", async () => {
    const { set, update } = mockTransaction({
      description: "Compra de material de escritório",
      supplierName: "Fornecedor X",
      value: 500,
      status: "pendente",
      expectedDate: null,
      receivedProcessedAt: null,
    });

    await receivePurchaseOrder("order1", { uid: "owner1", name: "Yago" });

    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "recebido" })
    );
    expect(set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "acme",
        value: 500,
        status: "pendente",
        category: "Compras",
      })
    );
  });

  it("also creates a stock movement and updates the item's quantity when linked to an inventory item", async () => {
    const { set, update } = mockTransaction(
      {
        description: "Reposição de insumos",
        supplierName: "Fornecedor X",
        value: 800,
        status: "aprovado",
        expectedDate: null,
        receivedProcessedAt: null,
        inventoryItemId: "item1",
        quantity: 10,
      },
      { quantity: 5 }
    );

    await receivePurchaseOrder("order1", { uid: "owner1", name: "Yago" });

    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ quantity: 15 })
    );
    expect(set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        itemId: "item1",
        type: "entrada",
        quantity: 10,
        balanceAfter: 15,
      })
    );
  });

  it("also updates the warehouse balance when the order links to a warehouse", async () => {
    const { set } = mockTransaction(
      {
        description: "Reposição de insumos",
        supplierName: "Fornecedor X",
        value: 800,
        status: "aprovado",
        expectedDate: null,
        receivedProcessedAt: null,
        inventoryItemId: "item1",
        quantity: 10,
        warehouseId: "wh1",
      },
      { quantity: 5, name: "Parafuso M4" },
      { quantity: 3 }
    );

    await receivePurchaseOrder("order1", { uid: "owner1", name: "Yago" });

    expect(set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        itemId: "item1",
        itemName: "Parafuso M4",
        warehouseId: "wh1",
        quantity: 13,
      })
    );
  });

  it("throws when the order was already received", async () => {
    mockTransaction({
      description: "X",
      status: "recebido",
      receivedProcessedAt: "SOME_TIMESTAMP",
      value: 100,
    });

    await expect(
      receivePurchaseOrder("order1", { uid: "owner1", name: "Yago" })
    ).rejects.toThrow("já foi recebido");
  });

  it("throws when the order is cancelled", async () => {
    mockTransaction({
      description: "X",
      status: "cancelado",
      receivedProcessedAt: null,
      value: 100,
    });

    await expect(
      receivePurchaseOrder("order1", { uid: "owner1", name: "Yago" })
    ).rejects.toThrow("cancelado");
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
