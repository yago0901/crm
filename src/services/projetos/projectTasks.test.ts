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
import { createProjectTask, getBacklogTasksCount } from "./projectTasks";
import { setCurrentCompanyId } from "../shared/tenant";

describe("createProjectTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("creates the task with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createProjectTask(
      { projectId: "p1", projectName: "Implantação ERP", title: "Levantar requisitos", assignee: "Ana", dueDate: null, status: "a_fazer", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: "Levantar requisitos", ownerId: "owner1" })
    );
  });

  it("stamps the task with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createProjectTask(
      { projectId: "p1", projectName: "Implantação ERP", title: "Levantar requisitos", assignee: "Ana", dueDate: null, status: "a_fazer", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});

describe("getBacklogTasksCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts tasks a_fazer", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 6 }),
    } as never);

    expect(await getBacklogTasksCount()).toBe(6);
  });
});
