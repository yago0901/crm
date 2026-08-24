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

import { addDoc, getAggregateFromServer, updateDoc, where } from "firebase/firestore";
import {
  createFollowUp,
  getPendingFollowUpsCount,
  mapFollowUp,
  markFollowUpDone,
} from "./followUps";
import { setCurrentCompanyId } from "../shared/tenant";

describe("mapFollowUp", () => {
  it("defaults optional fields when missing from the document", () => {
    const snap = {
      id: "f1",
      data: () => ({
        title: "Ligar para o cliente",
        status: "pendente",
        ownerId: "owner1",
      }),
    } as never;

    const followUp = mapFollowUp(snap);

    expect(followUp).toMatchObject({
      id: "f1",
      title: "Ligar para o cliente",
      description: "",
      contactId: "",
      contactName: "",
      dueDate: null,
      completedAt: null,
      status: "pendente",
    });
  });
});

describe("createFollowUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("creates the follow-up with completedAt null and owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createFollowUp(
      { title: "Enviar proposta", description: "", contactId: "c1", contactName: "Maria", dueDate: null, status: "pendente" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        title: "Enviar proposta",
        completedAt: null,
        ownerId: "owner1",
        ownerName: "Yago",
      })
    );
  });

  it("stamps the follow-up with the current companyId", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);
    setCurrentCompanyId("acme");

    await createFollowUp(
      { title: "Enviar proposta", description: "", contactId: "c1", contactName: "Maria", dueDate: null, status: "pendente" },
      { uid: "owner1", name: "Yago" }
    );

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: "acme" })
    );
  });
});

describe("markFollowUpDone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets status to concluido and stamps completedAt", async () => {
    await markFollowUpDone("f1");

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "concluido",
        completedAt: "SERVER_TIMESTAMP",
        updatedAt: "SERVER_TIMESTAMP",
      })
    );
  });
});

describe("getPendingFollowUpsCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId(null);
  });

  it("returns the aggregate count for pendente follow-ups", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 7 }),
    } as never);

    const total = await getPendingFollowUpsCount();

    expect(total).toBe(7);
  });

  it("filters by the current companyId when set", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 3 }),
    } as never);
    setCurrentCompanyId("acme");

    await getPendingFollowUpsCount();

    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
  });
});
