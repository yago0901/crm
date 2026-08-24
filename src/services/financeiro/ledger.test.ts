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
  sum: vi.fn((field) => ({ type: "sum", field })),
  onSnapshot: vi.fn(),
}));

import { addDoc, getAggregateFromServer, where } from "firebase/firestore";
import { createLedgerEntry, getLedgerBalance, mapLedgerEntry } from "./ledger";
import { setCurrentCompanyId } from "../shared/tenant";

describe("mapLedgerEntry", () => {
  it("defaults optional fields when missing from the document", () => {
    const snap = {
      id: "e1",
      data: () => ({
        description: "Venda de serviço",
        type: "credito",
        value: 500,
        ownerId: "owner1",
      }),
    } as never;

    expect(mapLedgerEntry(snap)).toMatchObject({
      id: "e1",
      description: "Venda de serviço",
      category: "",
      type: "credito",
      value: 500,
      date: null,
      notes: "",
    });
  });
});

describe("createLedgerEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("creates the entry with owner info and timestamps", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createLedgerEntry(
      { description: "Aluguel", category: "Despesas fixas", type: "debito", value: 1200, date: null, notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        description: "Aluguel",
        type: "debito",
        ownerId: "owner1",
        ownerName: "Yago",
      })
    );
  });

  it("stamps the entry with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createLedgerEntry(
      { description: "Aluguel", category: "Despesas fixas", type: "debito", value: 1200, date: null, notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});

describe("getLedgerBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("returns credito total minus debito total, filtering by the type field", async () => {
    vi.mocked(getAggregateFromServer)
      .mockResolvedValueOnce({ data: () => ({ total: 1000 }) } as never)
      .mockResolvedValueOnce({ data: () => ({ total: 400 }) } as never);

    const balance = await getLedgerBalance();

    expect(balance).toBe(600);
    expect(where).toHaveBeenCalledWith("type", "==", "credito");
    expect(where).toHaveBeenCalledWith("type", "==", "debito");
  });
});
