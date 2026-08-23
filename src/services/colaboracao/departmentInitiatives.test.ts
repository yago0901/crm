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
import { createDepartmentInitiative, getActiveInitiativesCount } from "./departmentInitiatives";

describe("createDepartmentInitiative", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the initiative with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createDepartmentInitiative(
      { title: "Padronizar onboarding", departments: "RH + TI", description: "", leadName: "Bruna", status: "proposta", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: "Padronizar onboarding", ownerId: "owner1" })
    );
  });
});

describe("getActiveInitiativesCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts initiatives em_andamento", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 2 }),
    } as never);

    expect(await getActiveInitiativesCount()).toBe(2);
  });
});
