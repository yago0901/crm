const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generateTempPassword(length = 12): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => CHARSET[value % CHARSET.length]).join("");
}
