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

import { addDoc, getAggregateFromServer, getDocs } from "firebase/firestore";
import { createProject, fetchActiveProjects, getActiveProjectsCount } from "./projects";

describe("createProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the project with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createProject(
      { name: "Implantação ERP", description: "", budget: 50000, startDate: null, endDate: null, status: "planejamento", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: "Implantação ERP", ownerId: "owner1" })
    );
  });
});

describe("getActiveProjectsCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts projects em_andamento", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 3 }),
    } as never);

    expect(await getActiveProjectsCount()).toBe(3);
  });
});

describe("fetchActiveProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active projects mapped from the snapshot", async () => {
    const docs = [
      { id: "p1", data: () => ({ name: "Implantação ERP", status: "em_andamento", ownerId: "o1" }) },
    ];
    vi.mocked(getDocs).mockResolvedValue({ docs } as never);

    const projects = await fetchActiveProjects();

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("Implantação ERP");
  });
});
