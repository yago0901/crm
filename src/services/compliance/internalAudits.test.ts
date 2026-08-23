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
import { createInternalAudit, getPlannedAuditsCount } from "./internalAudits";

describe("createInternalAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the audit with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createInternalAudit(
      { title: "Auditoria financeira Q3", department: "Financeiro", auditor: "Ana", auditDate: null, status: "planejada", findings: "", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: "Auditoria financeira Q3", ownerId: "owner1" })
    );
  });
});

describe("getPlannedAuditsCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts audits planejada", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 2 }),
    } as never);

    expect(await getPlannedAuditsCount()).toBe(2);
  });
});
