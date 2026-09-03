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
  getAggregateFromServer: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  count: vi.fn(() => ({ type: "count" })),
  onSnapshot: vi.fn(),
}));

import { addDoc, getDocs } from "firebase/firestore";
import { createProduct, fetchActiveProducts, mapProduct } from "./products";
import { setCurrentCompanyId } from "./tenant";

describe("mapProduct", () => {
  it("defaults optional fields when missing from the document", () => {
    const snap = {
      id: "p1",
      data: () => ({ name: "Cerveja Pilsen 1L", status: "ativo", ownerId: "owner1" }),
    } as never;

    expect(mapProduct(snap)).toMatchObject({
      id: "p1",
      name: "Cerveja Pilsen 1L",
      sku: "",
      category: "",
      unit: "un",
      salePrice: 0,
    });
  });
});

describe("createProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("creates the product with owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createProduct(
      { name: "Cerveja Pilsen 1L", sku: "CERV-1L", category: "Bebidas", unit: "L", salePrice: 12, status: "ativo", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: "Cerveja Pilsen 1L", ownerId: "owner1" })
    );
  });

  it("stamps the product with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createProduct(
      { name: "Cerveja Pilsen 1L", sku: "CERV-1L", category: "Bebidas", unit: "L", salePrice: 12, status: "ativo", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});

describe("fetchActiveProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty array when there is no current company", async () => {
    setCurrentCompanyId(null);
    expect(await fetchActiveProducts()).toEqual([]);
    expect(getDocs).not.toHaveBeenCalled();
  });

  it("maps returned documents", async () => {
    setCurrentCompanyId("acme");
    vi.mocked(getDocs).mockResolvedValue({
      docs: [
        {
          id: "p1",
          data: () => ({
            companyId: "acme",
            name: "Cerveja Pilsen 1L",
            sku: "CERV-1L",
            category: "Bebidas",
            unit: "L",
            salePrice: 12,
            status: "ativo",
            ownerId: "owner1",
          }),
        },
      ],
    } as never);

    const result = await fetchActiveProducts();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "p1", name: "Cerveja Pilsen 1L", salePrice: 12 });
  });
});
