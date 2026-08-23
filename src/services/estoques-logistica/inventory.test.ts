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
  count: vi.fn(() => ({ type: "count" })),
  onSnapshot: vi.fn(),
}));

import { addDoc, getAggregateFromServer } from "firebase/firestore";
import { createInventoryItem, getActiveInventoryTotal, mapInventoryItem } from "./inventory";

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
  });

  it("creates the item with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createInventoryItem(
      { name: "Parafuso M4", sku: "PRF-M4", category: "Fixadores", quantity: 100, minQuantity: 20, unit: "un", unitCost: 0.5, status: "ativo", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: "Parafuso M4", ownerId: "owner1" })
    );
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
