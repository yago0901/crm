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
  getDocs: vi.fn(),
  getAggregateFromServer: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  count: vi.fn(() => ({ type: "count" })),
  onSnapshot: vi.fn(),
}));

import { addDoc, getAggregateFromServer, getDocs, where } from "firebase/firestore";
import {
  createProjectMilestone,
  fetchMilestonesByProject,
  getDelayedMilestonesCount,
} from "./projectMilestones";
import { setCurrentCompanyId } from "../shared/tenant";

describe("createProjectMilestone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("creates the milestone with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createProjectMilestone(
      {
        projectId: "p1",
        projectName: "Implantação ERP",
        title: "Entrega da fase 1",
        dueDate: null,
        estimatedCost: 10000,
        actualCost: 0,
        status: "pendente",
        notes: "",
      },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: "Entrega da fase 1", ownerId: "owner1" })
    );
  });

  it("stamps the milestone with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createProjectMilestone(
      {
        projectId: "p1",
        projectName: "Implantação ERP",
        title: "Entrega da fase 1",
        dueDate: null,
        estimatedCost: 10000,
        actualCost: 0,
        status: "pendente",
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

describe("getDelayedMilestonesCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts milestones atrasado", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 2 }),
    } as never);

    expect(await getDelayedMilestonesCount()).toBe(2);
  });
});

describe("fetchMilestonesByProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty array when there is no current company", async () => {
    setCurrentCompanyId(null);
    expect(await fetchMilestonesByProject("p1")).toEqual([]);
  });

  it("filters by companyId and projectId", async () => {
    setCurrentCompanyId("acme");
    const docs = [
      { id: "m1", data: () => ({ projectId: "p1", title: "Entrega 1", actualCost: 500, status: "pendente", ownerId: "o1" }) },
    ];
    vi.mocked(getDocs).mockResolvedValue({ docs } as never);

    const milestones = await fetchMilestonesByProject("p1");

    expect(milestones).toHaveLength(1);
    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
    expect(where).toHaveBeenCalledWith("projectId", "==", "p1");
  });
});
