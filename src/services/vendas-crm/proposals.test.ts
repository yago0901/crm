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
  onSnapshot: vi.fn(),
}));

import { addDoc } from "firebase/firestore";
import { createProposal } from "./proposals";
import { setCurrentCompanyId } from "../shared/tenant";

describe("createProposal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  const input = {
    contactId: "c1",
    contactName: "Maria",
    dealId: "",
    dealTitle: "",
    items: [{ productId: "p1", productName: "Cadeira", quantity: 2, unitPrice: 100 }],
    total: 200,
    validUntil: null,
    status: "rascunho" as const,
    notes: "",
  };

  it("creates the proposal with owner info and the items array intact", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createProposal(input, { uid: "owner1", name: "Yago" });

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        contactName: "Maria",
        total: 200,
        items: [{ productId: "p1", productName: "Cadeira", quantity: 2, unitPrice: 100 }],
        ownerId: "owner1",
        ownerName: "Yago",
      })
    );
  });

  it("stamps the proposal with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createProposal(input, { uid: "owner1", name: "Yago" });

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});
