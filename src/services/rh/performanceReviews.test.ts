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
  onSnapshot: vi.fn(),
}));

import { addDoc } from "firebase/firestore";
import { createPerformanceReview, mapPerformanceReview } from "./performanceReviews";

describe("mapPerformanceReview", () => {
  it("defaults optional fields when missing from the document", () => {
    const snap = {
      id: "r1",
      data: () => ({
        employeeId: "e1",
        period: "2026-Q3",
        status: "rascunho",
        ownerId: "owner1",
      }),
    } as never;

    expect(mapPerformanceReview(snap)).toMatchObject({
      id: "r1",
      employeeId: "e1",
      employeeName: "",
      period: "2026-Q3",
      score: 0,
      strengths: "",
      improvements: "",
      status: "rascunho",
    });
  });
});

describe("createPerformanceReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the review with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createPerformanceReview(
      {
        employeeId: "e1",
        employeeName: "Maria",
        period: "2026-Q3",
        score: 4,
        strengths: "Proatividade",
        improvements: "Comunicação",
        status: "rascunho",
      },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        employeeName: "Maria",
        score: 4,
        ownerId: "owner1",
        ownerName: "Yago",
      })
    );
  });
});
