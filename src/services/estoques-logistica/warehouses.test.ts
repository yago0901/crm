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
  getDocs: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  count: vi.fn(() => ({ type: "count" })),
  onSnapshot: vi.fn(),
}));

import { addDoc, getAggregateFromServer, getDocs } from "firebase/firestore";
import { createWarehouse, fetchActiveWarehouses, getActiveWarehousesCount } from "./warehouses";
import { setCurrentCompanyId } from "../shared/tenant";

describe("createWarehouse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("creates the warehouse with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createWarehouse(
      { name: "Galpão Central", address: "Rod. BR-101, km 12", capacity: 5000, manager: "Carlos", status: "ativo", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: "Galpão Central", ownerId: "owner1" })
    );
  });

  it("stamps the warehouse with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createWarehouse(
      { name: "Galpão Central", address: "Rod. BR-101, km 12", capacity: 5000, manager: "Carlos", status: "ativo", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});

describe("fetchActiveWarehouses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty array when there is no current company", async () => {
    setCurrentCompanyId(null);
    expect(await fetchActiveWarehouses()).toEqual([]);
  });

  it("maps the returned documents", async () => {
    setCurrentCompanyId("acme");
    vi.mocked(getDocs).mockResolvedValue({
      docs: [{ id: "w1", data: () => ({ name: "Galpão Central", status: "ativo", ownerId: "owner1" }) }],
    } as never);

    const warehouses = await fetchActiveWarehouses();
    expect(warehouses).toHaveLength(1);
    expect(warehouses[0].name).toBe("Galpão Central");
  });
});

describe("getActiveWarehousesCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts active warehouses", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 3 }),
    } as never);

    expect(await getActiveWarehousesCount()).toBe(3);
  });
});
