import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/firebase", () => ({
  firestore: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  doc: vi.fn((_db, ...path) => ({ type: "doc", path })),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  writeBatch: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  onSnapshot: vi.fn(),
}));

import { addDoc, getDocs, where } from "firebase/firestore";
import { createContact, searchContacts } from "./contacts";
import { setCurrentCompanyId } from "../shared/tenant";

const makeSnap = (id: string, data: Record<string, unknown>) => ({
  id,
  data: () => data,
});

describe("createContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("adds the contact with owner info, empty tags default, and timestamps", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createContact(
      { name: "Maria", email: "maria@example.com", status: "lead" } as never,
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "Maria",
        email: "maria@example.com",
        tags: [],
        ownerId: "owner1",
        ownerName: "Yago",
        createdAt: "SERVER_TIMESTAMP",
        updatedAt: "SERVER_TIMESTAMP",
      })
    );
  });

  it("falls back to an empty ownerName when none is given", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    await createContact(
      { name: "João", email: "joao@example.com", status: "lead" } as never,
      { uid: "owner1" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ownerName: "" })
    );
  });

  it("stamps the contact with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createContact(
      { name: "Maria", email: "maria@example.com", status: "lead" } as never,
      { uid: "owner1" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});

describe("searchContacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  const docs = [
    makeSnap("1", { name: "Maria Silva", email: "maria@x.com", company: "Acme", status: "lead", ownerId: "o1" }),
    makeSnap("2", { name: "João Souza", email: "joao@x.com", company: "Beta", status: "lead", ownerId: "o1" }),
    makeSnap("3", { name: "Carla Reis", email: "carla@acme.com", company: "Other", status: "cliente", ownerId: "o1" }),
  ];

  it("filters results by name, email, or company, case-insensitively", async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs } as never);

    const result = await searchContacts("all", "acme");

    expect(result.map((c) => c.id)).toEqual(["1", "3"]);
  });

  it("returns every contact when the search term is empty", async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs } as never);

    const result = await searchContacts("all", "");

    expect(result).toHaveLength(3);
  });

  it("adds a companyId filter when a company is set", async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs } as never);
    setCurrentCompanyId("acme");

    await searchContacts("all", "");

    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
  });
});
