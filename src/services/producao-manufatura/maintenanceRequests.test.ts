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
import { createMaintenanceRequest, getScheduledMaintenanceCount } from "./maintenanceRequests";

describe("createMaintenanceRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the request with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createMaintenanceRequest(
      { equipmentName: "Torno CNC 03", description: "Revisão preventiva", technician: "Bruno", scheduledDate: null, status: "agendada", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ equipmentName: "Torno CNC 03", ownerId: "owner1" })
    );
  });
});

describe("getScheduledMaintenanceCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts requests agendada", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 2 }),
    } as never);

    expect(await getScheduledMaintenanceCount()).toBe(2);
  });
});
