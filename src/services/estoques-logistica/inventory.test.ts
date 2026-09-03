import { describe, expect, it, vi, beforeEach } from "vitest";

const batchSet = vi.fn();
const batchCommit = vi.fn().mockResolvedValue(undefined);

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
        id: collectionName === "inventoryItems" ? "new-item-id" : "new-movement-id",
      };
    }
    return { type: "doc", path, id: path[path.length - 1] };
  }),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  writeBatch: vi.fn(() => ({ set: batchSet, commit: batchCommit })),
  getAggregateFromServer: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  count: vi.fn(() => ({ type: "count" })),
  onSnapshot: vi.fn(),
}));

import { getAggregateFromServer } from "firebase/firestore";
import { createInventoryItem, getActiveInventoryTotal, mapInventoryItem } from "./inventory";
import { setCurrentCompanyId } from "../shared/tenant";

describe("mapInventoryItem", () => {
  it("defaults optional fields when missing from the document", () => {
    const snap = {
      id: "i1",
      data: () => ({ name: "Parafuso M4", status: "ativo", ownerId: "owner1" }),
    } as never;

    expect(mapInventoryItem(snap)).toMatchObject({
      id: "i1",
      name: "Parafuso M4",
      sku: "",
      category: "",
      quantity: 0,
      minQuantity: 0,
      unit: "un",
      unitCost: 0,
    });
  });
});

describe("createInventoryItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    batchCommit.mockResolvedValue(undefined);
    setCurrentCompanyId(null);
  });

  it("creates the item with owner info", async () => {
    const id = await createInventoryItem(
      { productId: "prod-1", name: "Parafuso M4", sku: "PRF-M4", category: "Fixadores", quantity: 100, minQuantity: 20, unit: "un", unitCost: 0.5, status: "ativo", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-item-id");
    expect(batchSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: "new-item-id" }),
      expect.objectContaining({ name: "Parafuso M4", ownerId: "owner1" })
    );
  });

  it("stamps the item with the current companyId", async () => {
    setCurrentCompanyId("acme");

    await createInventoryItem(
      { productId: "prod-1", name: "Parafuso M4", sku: "PRF-M4", category: "Fixadores", quantity: 100, minQuantity: 20, unit: "un", unitCost: 0.5, status: "ativo", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(batchSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: "new-item-id" }),
      expect.objectContaining({ companyId: "acme" })
    );
  });

  it("also records an initial entrada movement when quantity is greater than zero", async () => {
    await createInventoryItem(
      { productId: "prod-1", name: "Parafuso M4", sku: "PRF-M4", category: "Fixadores", quantity: 100, minQuantity: 20, unit: "un", unitCost: 0.5, status: "ativo", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(batchSet).toHaveBeenCalledTimes(2);
    expect(batchSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: "new-movement-id" }),
      expect.objectContaining({
        itemId: "new-item-id",
        type: "entrada",
        quantity: 100,
        balanceAfter: 100,
      })
    );
  });

  it("does not record a movement when the initial quantity is zero", async () => {
    await createInventoryItem(
      { productId: "prod-1", name: "Parafuso M4", sku: "PRF-M4", category: "Fixadores", quantity: 0, minQuantity: 20, unit: "un", unitCost: 0.5, status: "ativo", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(batchSet).toHaveBeenCalledTimes(1);
  });
});

describe("getActiveInventoryTotal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts active inventory items", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 8 }),
    } as never);

    expect(await getActiveInventoryTotal()).toBe(8);
  });
});
