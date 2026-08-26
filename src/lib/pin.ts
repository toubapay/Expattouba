import crypto from "crypto";

const KEY_LEN = 64;

// scrypt over the built-in Node crypto module rather than adding a bcrypt
// dependency — this is a 4-digit PIN, not a general password, so a
// deliberately slow KDF with a per-user salt is enough to make a stolen DB
// dump useless without brute-forcing each hash individually.
export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Compares a candidate PIN against a stored value. Stored values written
 * before this change are plain 4-digit strings (no ":"); those still
 * compare correctly here so existing accounts aren't locked out, and the
 * caller should re-hash and persist the PIN the next time a legacy value
 * matches (see isLegacyPin).
 */
export function verifyPin(candidate: string, stored: string): boolean {
  if (!stored.includes(":")) {
    const a = Buffer.from(candidate);
    const b = Buffer.from(stored);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  const [salt, hash] = stored.split(":");
  const candidateHash = crypto.scryptSync(candidate, salt, KEY_LEN);
  const storedHash = Buffer.from(hash, "hex");
  return candidateHash.length === storedHash.length && crypto.timingSafeEqual(candidateHash, storedHash);
}

export function isLegacyPin(stored: string): boolean {
  return !stored.includes(":");
}
