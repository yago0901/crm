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
import { createRegulation, getOverdueRegulationsCount } from "./regulations";
import { setCurrentCompanyId } from "../shared/tenant";

describe("createRegulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("creates the regulation with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createRegulation(
      { name: "LGPD - Relatório de impacto", category: "Dados", responsible: "Jurídico", deadline: null, status: "pendente", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: "LGPD - Relatório de impacto", ownerId: "owner1" })
    );
  });

  it("stamps the regulation with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createRegulation(
      { name: "LGPD - Relatório de impacto", category: "Dados", responsible: "Jurídico", deadline: null, status: "pendente", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});

describe("getOverdueRegulationsCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts regulations vencido", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 1 }),
    } as never);

    expect(await getOverdueRegulationsCount()).toBe(1);
  });
});
