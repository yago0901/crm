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

import { addDoc, getAggregateFromServer, updateDoc } from "firebase/firestore";
import { createAnnouncement, getDraftAnnouncementsCount, publishAnnouncement } from "./announcements";

describe("createAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the announcement with publishedAt null and owner info", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await createAnnouncement(
      { title: "Novo horário de expediente", body: "A partir de segunda...", audience: "Todos", status: "rascunho" },
      { uid: "owner1", name: "Yago" }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: "Novo horário de expediente", publishedAt: null, ownerId: "owner1" })
    );
  });
});

describe("publishAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets status to publicado and stamps publishedAt", async () => {
    await publishAnnouncement("a1");

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "publicado", publishedAt: "SERVER_TIMESTAMP" })
    );
  });
});

describe("getDraftAnnouncementsCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts announcements rascunho", async () => {
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 4 }),
    } as never);

    expect(await getDraftAnnouncementsCount()).toBe(4);
  });
});
