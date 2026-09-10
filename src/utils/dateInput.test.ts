import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import { fromDateInput, toDateInput } from "./dateInput";

describe("toDateInput", () => {
  it("returns an empty string for null", () => {
    expect(toDateInput(null)).toBe("");
  });

  it("formats a valid Timestamp as YYYY-MM-DD", () => {
    const ts = Timestamp.fromDate(new Date(Date.UTC(2026, 5, 1)));
    expect(toDateInput(ts)).toBe("2026-06-01");
  });

  it("returns an empty string instead of throwing for a Timestamp wrapping an invalid date", () => {
    const broken = { toDate: () => new Date(NaN) } as unknown as Timestamp;
    expect(toDateInput(broken)).toBe("");
  });

  it("returns an empty string when toDate itself throws", () => {
    const broken = {
      toDate: () => {
        throw new Error("out of range");
      },
    } as unknown as Timestamp;
    expect(toDateInput(broken)).toBe("");
  });
});

describe("fromDateInput", () => {
  it("returns null for an empty string", () => {
    expect(fromDateInput("")).toBeNull();
  });

  it("parses a valid date string into a Timestamp", () => {
    const ts = fromDateInput("2026-06-01");
    expect(ts).not.toBeNull();
    expect(ts?.toDate().getFullYear()).toBe(2026);
  });

  it("returns null for an unparseable value", () => {
    expect(fromDateInput("not-a-date")).toBeNull();
  });

  it("returns null for a year outside the 1900-2100 range", () => {
    expect(fromDateInput("82025-08-01")).toBeNull();
    expect(fromDateInput("1200-01-01")).toBeNull();
  });
});
