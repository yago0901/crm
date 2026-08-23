import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./firebase", () => ({
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

import { addDoc, getDocs } from "firebase/firestore";
import { createSupplier, fetchActiveSuppliers } from "./suppliers";

describe("createSupplier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the supplier with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createSupplier(
      { name: "Fornecedor X", contactName: "", email: "", phone: "", category: "Insumos", status: "ativo", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "Fornecedor X",
        ownerId: "owner1",
        ownerName: "Yago",
      })
    );
  });
});

describe("fetchActiveSuppliers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only active suppliers mapped from the snapshot", async () => {
    const docs = [
      { id: "s1", data: () => ({ name: "Fornecedor A", category: "Insumos", status: "ativo", ownerId: "o1" }) },
    ];
    vi.mocked(getDocs).mockResolvedValue({ docs } as never);

    const suppliers = await fetchActiveSuppliers();

    expect(suppliers).toHaveLength(1);
    expect(suppliers[0].name).toBe("Fornecedor A");
  });
});
