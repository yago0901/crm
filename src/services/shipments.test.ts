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
import { createShipment, getInTransitShipmentsCount } from "./shipments";

describe("createShipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the shipment with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createShipment(
      { description: "Lote 42", destination: "São Paulo", carrier: "Transportadora Y", trackingCode: "", status: "preparando", shipDate: null, notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ description: "Lote 42", ownerId: "owner1" })
    );
  });
});

describe("getInTransitShipmentsCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts shipments em_transito", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 6 }),
    } as never);

    expect(await getInTransitShipmentsCount()).toBe(6);
  });
});
