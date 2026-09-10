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
  createResourceAllocation,
  fetchAllocationsByProject,
  getActiveAllocationsCount,
} from "./resourceAllocations";
import { setCurrentCompanyId } from "../shared/tenant";

describe("createResourceAllocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("creates the allocation with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createResourceAllocation(
      {
        projectId: "p1",
        projectName: "Implantação ERP",
        employeeId: "e1",
        employeeName: "Maria",
        role: "Analista",
        allocationPercent: 50,
        startDate: null,
        endDate: null,
        status: "ativa",
        notes: "",
      },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ projectName: "Implantação ERP", employeeName: "Maria", ownerId: "owner1" })
    );
  });

  it("stamps the allocation with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createResourceAllocation(
      {
        projectId: "p1",
        projectName: "Implantação ERP",
        employeeId: "e1",
        employeeName: "Maria",
        role: "Analista",
        allocationPercent: 50,
        startDate: null,
        endDate: null,
        status: "ativa",
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

describe("getActiveAllocationsCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts allocations ativa", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 4 }),
    } as never);

    expect(await getActiveAllocationsCount()).toBe(4);
  });
});

describe("fetchAllocationsByProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty array when there is no current company", async () => {
    setCurrentCompanyId(null);
    expect(await fetchAllocationsByProject("p1")).toEqual([]);
  });

  it("filters by companyId and projectId", async () => {
    setCurrentCompanyId("acme");
    const docs = [
      { id: "a1", data: () => ({ projectId: "p1", employeeId: "e1", allocationPercent: 50, status: "ativa", ownerId: "o1" }) },
    ];
    vi.mocked(getDocs).mockResolvedValue({ docs } as never);

    const allocations = await fetchAllocationsByProject("p1");

    expect(allocations).toHaveLength(1);
    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
    expect(where).toHaveBeenCalledWith("projectId", "==", "p1");
  });
});
