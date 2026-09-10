import { Timestamp } from "firebase/firestore";

export const MIN_INPUT_DATE = "1900-01-01";
export const MAX_INPUT_DATE = "2100-12-31";

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

export const toDateInput = (value: Timestamp | null): string => {
  if (!value) return "";
  try {
    const date = value.toDate();
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

export const fromDateInput = (value: string): Timestamp | null => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  return Timestamp.fromDate(date);
};
