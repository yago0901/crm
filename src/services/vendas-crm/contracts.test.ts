import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/firebase", () => ({
  firestore: {},
  auth: { currentUser: { uid: "owner1", displayName: "Yago", email: "yago@test.com" } },
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  doc: vi.fn((refOrDb, ...path) => {
    if (path.length === 0 && refOrDb?.type === "collection") {
      const collectionName = refOrDb.path[0];
      return {
        type: "doc",
        path: refOrDb.path,
        id: collectionName === "contracts" ? "contract-1" : "receivable-1",
      };
    }
    return { type: "doc", path, id: path[path.length - 1] };
  }),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  runTransaction: vi.fn(),
  getAggregateFromServer: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  sum: vi.fn((field) => ({ type: "sum", field })),
  onSnapshot: vi.fn(),
}));

import { addDoc, getAggregateFromServer, runTransaction, where } from "firebase/firestore";
import { createContract, createContractFromDeal, getActiveContractsTotal } from "./contracts";
import { setCurrentCompanyId } from "../shared/tenant";

const mockTransaction = (dealData: Record<string, unknown>) => {
  const get = vi.fn().mockResolvedValueOnce({ exists: () => true, data: () => dealData });
  const set = vi.fn();
  const update = vi.fn();
  vi.mocked(runTransaction).mockImplementation(async (_db, callback) =>
    callback({ get, set, update } as never)
  );
  return { get, set, update };
};

describe("createContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("stamps the contract with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createContract(
      { title: "Plano anual", contactId: "c1", contactName: "Maria", value: 1000, status: "rascunho", startDate: null, endDate: null, notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});

describe("createContractFromDeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId("acme");
  });

  const contractInput = {
    title: "Plano anual",
    contactId: "c1",
    contactName: "Maria",
    value: 1000,
    status: "ativo" as const,
    startDate: null,
    endDate: null,
    notes: "",
  };

  it("creates the contract, marks the deal converted, and generates a receivable", async () => {
    const { set, update } = mockTransaction({
      title: "Consultoria mensal",
      status: "ganho",
      convertedToContractId: null,
    });

    await createContractFromDeal(contractInput, "deal1", { uid: "owner1", name: "Yago" });

    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ convertedToContractId: expect.anything() })
    );
    expect(set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme", dealId: "deal1", title: "Plano anual" })
    );
    expect(set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "acme",
        category: "Contratos",
        value: 1000,
        status: "pendente",
      })
    );
  });

  it("throws when the deal isn't marked ganho", async () => {
    mockTransaction({ title: "X", status: "aberto", convertedToContractId: null });

    await expect(
      createContractFromDeal(contractInput, "deal1", { uid: "owner1", name: "Yago" })
    ).rejects.toThrow("Ganho");
  });

  it("throws when the deal was already converted", async () => {
    mockTransaction({ title: "X", status: "ganho", convertedToContractId: "contract-existing" });

    await expect(
      createContractFromDeal(contractInput, "deal1", { uid: "owner1", name: "Yago" })
    ).rejects.toThrow("já foi convertido");
  });
});

describe("getActiveContractsTotal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("sums ativo contracts filtered by the current companyId", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 5000 }),
    } as never);
    setCurrentCompanyId("acme");

    const total = await getActiveContractsTotal();

    expect(total).toBe(5000);
    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
  });
});
