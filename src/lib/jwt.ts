import crypto from "crypto";

// A fixed, source-controlled default here would let anyone forge a token
// for any uid. Fall back to a secret generated once per process instead of
// a known string — it still lets the server run without JWT_SECRET set,
// but existing custom-auth tokens are invalidated on restart rather than
// being forgeable by anyone who has read the source.
export const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

if (!process.env.JWT_SECRET) {
  console.warn(
    "JWT_SECRET is not set — generated a random secret for this process. " +
    "Custom phone/PIN logins will need to re-authenticate after every restart."
  );
}
