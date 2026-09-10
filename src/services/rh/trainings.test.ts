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
import { createTraining, getScheduledTrainingsCount, mapTraining } from "./trainings";
import { setCurrentCompanyId } from "../shared/tenant";

describe("mapTraining", () => {
  it("defaults participants and rating when absent", () => {
    const training = mapTraining({
      id: "t1",
      data: () => ({ title: "Onboarding", category: "RH", status: "planejado", ownerId: "o1" }),
    } as never);

    expect(training.participants).toEqual([]);
    expect(training.rating).toBe(0);
  });

  it("passes participant rows through with attendance, score and certificate flags", () => {
    const training = mapTraining({
      id: "t2",
      data: () => ({
        title: "Segurança",
        category: "SST",
        status: "concluido",
        ownerId: "o1",
        rating: 4.5,
        participants: [
          { employeeId: "e1", employeeName: "Ana", attended: true, score: 90, certificateIssued: true },
        ],
      }),
    } as never);

    expect(training.rating).toBe(4.5);
    expect(training.participants).toHaveLength(1);
    expect(training.participants?.[0]).toMatchObject({
      employeeName: "Ana",
      attended: true,
      score: 90,
      certificateIssued: true,
    });
  });
});

describe("createTraining", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("creates the training with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createTraining(
      { title: "Onboarding", description: "", category: "RH", date: null, status: "planejado", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        title: "Onboarding",
        ownerId: "owner1",
        ownerName: "Yago",
      })
    );
  });

  it("stamps the training with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createTraining(
      { title: "Onboarding", description: "", category: "RH", date: null, status: "planejado", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});

describe("getScheduledTrainingsCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts trainings that are planejado", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 2 }),
    } as never);

    expect(await getScheduledTrainingsCount()).toBe(2);
  });
});
