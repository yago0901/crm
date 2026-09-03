import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/firebase", () => ({
  firestore: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  doc: vi.fn((_db, ...path) => ({ type: "doc", path })),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  getAggregateFromServer: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  onSnapshot: vi.fn(),
}));

import { addDoc, getDocs } from "firebase/firestore";
import { createDeal, fetchWonUnconvertedDeals } from "./deals";
import { setCurrentCompanyId } from "../shared/tenant";

describe("createDeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("stamps the deal with the current companyId and a null convertedToContractId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createDeal(
      { contactId: "c1", contactName: "Maria", title: "Consultoria", estimatedValue: 5000, status: "aberto", notes: "" },
      { uid: "owner1", name: "Yago" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme", convertedToContractId: null })
    );
  });
});

describe("fetchWonUnconvertedDeals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty array when there is no current company", async () => {
    setCurrentCompanyId(null);
    expect(await fetchWonUnconvertedDeals()).toEqual([]);
  });

  it("only returns won deals that haven't been converted yet", async () => {
    setCurrentCompanyId("acme");
    vi.mocked(getDocs).mockResolvedValue({
      docs: [
        { id: "d1", data: () => ({ title: "A", status: "ganho", convertedToContractId: null, ownerId: "o1" }) },
        { id: "d2", data: () => ({ title: "B", status: "ganho", convertedToContractId: "contract1", ownerId: "o1" }) },
      ],
    } as never);

    const deals = await fetchWonUnconvertedDeals();
    expect(deals.map((d) => d.id)).toEqual(["d1"]);
  });
});
