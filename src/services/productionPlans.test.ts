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
import { createProductionPlan, getActiveProductionPlansCount } from "./productionPlans";

describe("createProductionPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the plan with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createProductionPlan(
      { productName: "Cadeira modelo X", targetQuantity: 200, startDate: null, endDate: null, status: "planejado", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ productName: "Cadeira modelo X", ownerId: "owner1" })
    );
  });
});

describe("getActiveProductionPlansCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts plans em_andamento", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 4 }),
    } as never);

    expect(await getActiveProductionPlansCount()).toBe(4);
  });
});
