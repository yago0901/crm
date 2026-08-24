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
  onSnapshot: vi.fn(),
}));

import { addDoc, getDocs, where } from "firebase/firestore";
import { createSavedReport, runReport } from "./reports";
import { setCurrentCompanyId } from "../shared/tenant";

describe("createSavedReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("creates the saved report with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createSavedReport(
      { name: "Contratos ativos", source: "contracts", statusFilter: "ativo", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: "Contratos ativos", source: "contracts", ownerId: "owner1" })
    );
  });

  it("stamps the saved report with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createSavedReport(
      { name: "Contratos ativos", source: "contracts", statusFilter: "ativo", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});

describe("runReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("queries the given source filtered by status and maps the label field", async () => {
    const docs = [
      { id: "c1", data: () => ({ title: "Contrato A", status: "ativo" }) },
      { id: "c2", data: () => ({ title: "Contrato B", status: "ativo" }) },
    ];
    vi.mocked(getDocs).mockResolvedValue({ docs } as never);

    const result = await runReport("contracts", "ativo");

    expect(where).toHaveBeenCalledWith("status", "==", "ativo");
    expect(result.count).toBe(2);
    expect(result.items[0]).toMatchObject({ id: "c1", label: "Contrato A", status: "ativo" });
  });

  it("skips the status filter when statusFilter is 'all'", async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

    await runReport("contacts", "all");

    expect(where).not.toHaveBeenCalled();
  });

  it("adds a companyId filter when a company is set", async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);
    setCurrentCompanyId("acme");

    await runReport("contacts", "all");

    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
  });
});
