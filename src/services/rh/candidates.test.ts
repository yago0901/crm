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
import { createCandidate, getCandidatesInScreeningCount } from "./candidates";

describe("createCandidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the candidate with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createCandidate(
      { name: "João", email: "joao@x.com", phone: "", position: "Dev Frontend", status: "triagem", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "João",
        position: "Dev Frontend",
        ownerId: "owner1",
        ownerName: "Yago",
      })
    );
  });
});

describe("getCandidatesInScreeningCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts candidates in triagem", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 3 }),
    } as never);

    expect(await getCandidatesInScreeningCount()).toBe(3);
  });
});
