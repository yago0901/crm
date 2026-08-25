import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/firebase", () => ({
  firebaseConfig: { projectId: "test-project" },
}));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn((_config, name) => ({ name })),
  deleteApp: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn((app) => ({ app })),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn((app) => ({ type: "firestore", app })),
}));

import { deleteApp, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { withNewAuthAccount } from "./secondaryApp";

describe("withNewAuthAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the auth account on a separate app instance and passes uid/db to the action", async () => {
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({
      user: { uid: "new-uid" },
    } as never);

    const action = vi.fn().mockResolvedValue("result");

    const result = await withNewAuthAccount("test@example.com", "senha123", action);

    expect(result).toBe("result");
    expect(action).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "new-uid" })
    );
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "test@example.com",
      "senha123"
    );
  });

  it("uses a fresh, uniquely-named secondary app instance on each call", async () => {
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({
      user: { uid: "new-uid" },
    } as never);

    await withNewAuthAccount("a@example.com", "senha123", vi.fn().mockResolvedValue(undefined));
    await withNewAuthAccount("b@example.com", "senha123", vi.fn().mockResolvedValue(undefined));

    const [firstName] = vi.mocked(initializeApp).mock.calls[0].slice(1);
    const [secondName] = vi.mocked(initializeApp).mock.calls[1].slice(1);
    expect(firstName).not.toBe(secondName);
  });

  it("signs out and tears down the secondary app even if the action throws", async () => {
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({
      user: { uid: "new-uid" },
    } as never);

    const action = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(withNewAuthAccount("test@example.com", "senha123", action)).rejects.toThrow(
      "boom"
    );

    expect(signOut).toHaveBeenCalled();
    expect(deleteApp).toHaveBeenCalled();
  });

  it("cleans up the secondary app on success too", async () => {
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({
      user: { uid: "new-uid" },
    } as never);

    await withNewAuthAccount("test@example.com", "senha123", vi.fn().mockResolvedValue(undefined));

    expect(signOut).toHaveBeenCalled();
    expect(deleteApp).toHaveBeenCalled();
  });
});
