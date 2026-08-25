import { describe, expect, it } from "vitest";
import { generateTempPassword } from "./passwordGenerator";

describe("generateTempPassword", () => {
  it("generates a password of the default length", () => {
    expect(generateTempPassword()).toHaveLength(12);
  });

  it("generates a password of a custom length", () => {
    expect(generateTempPassword(20)).toHaveLength(20);
  });

  it("only uses unambiguous characters (no 0/O/1/l/I)", () => {
    const password = generateTempPassword(200);
    expect(password).not.toMatch(/[0O1lI]/);
  });

  it("generates different passwords on each call", () => {
    const a = generateTempPassword();
    const b = generateTempPassword();
    expect(a).not.toBe(b);
  });
});
