import { describe, expect, it } from "vitest";
import { NAV_GROUPS } from "./navigation";

describe("NAV_GROUPS manifest", () => {
  it("gives every group a key, label, icon and at least one page", () => {
    for (const group of NAV_GROUPS) {
      expect(group.key).toBeTruthy();
      expect(group.label).toBeTruthy();
      expect(group.icon).toBeTruthy();
      expect(group.pages.length).toBeGreaterThan(0);
    }
  });

  it("never repeats a route path across groups", () => {
    const allPaths = NAV_GROUPS.flatMap((group) => group.pages.map((page) => page.path));
    expect(new Set(allPaths).size).toBe(allPaths.length);
  });

  it("gives every page a path starting with '/', a label, and a component", () => {
    for (const group of NAV_GROUPS) {
      for (const page of group.pages) {
        expect(page.path.startsWith("/")).toBe(true);
        expect(page.label).toBeTruthy();
        expect(page.component).toBeTruthy();
      }
    }
  });

  it("keeps Acessos admin-only and opted out of its group's module gate", () => {
    const acessos = NAV_GROUPS.flatMap((g) => g.pages).find((p) => p.path === "/rh/acessos");
    expect(acessos?.adminOnly).toBe(true);
    expect(acessos?.noModuleGate).toBe(true);
  });

  it("has the expected total page count (update this deliberately when adding a page)", () => {
    const total = NAV_GROUPS.reduce((sum, g) => sum + g.pages.length, 0);
    expect(total).toBe(43);
  });
});
