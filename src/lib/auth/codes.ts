import crypto from "node:crypto";

export function createOtpCode() {
  return String(crypto.randomInt(100000, 999999));
}

export function hashCode(email: string, code: string) {
  return crypto
    .createHash("sha256")
    .update(`${email.toLowerCase().trim()}:${code.trim()}`)
    .digest("hex");
}
