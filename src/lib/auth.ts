import { createHmac, timingSafeEqual } from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-fallback-secret-change-me-in-production";
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Creates a signed session token for the given userId.
 * Format (base64): userId:issuedAt:hmacSignature
 */
export function createToken(userId: string): string {
  const iat = Date.now();
  const payload = `${userId}:${iat}`;
  const sig = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

/**
 * Verifies a session token. Returns the userId if valid, null otherwise.
 */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const lastColon = decoded.lastIndexOf(":");
    const secondLastColon = decoded.lastIndexOf(":", lastColon - 1);

    if (lastColon === -1 || secondLastColon === -1) return null;

    const sig = decoded.slice(lastColon + 1);
    const iat = parseInt(decoded.slice(secondLastColon + 1, lastColon));
    const userId = decoded.slice(0, secondLastColon);

    if (!userId || isNaN(iat)) return null;

    // Check token expiry
    if (Date.now() - iat > TOKEN_EXPIRY_MS) return null;

    // Verify HMAC signature using timing-safe comparison
    const payload = `${userId}:${iat}`;
    const expectedSig = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");

    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");

    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

    return { userId };
  } catch {
    return null;
  }
}

/**
 * Extracts the Bearer token from the Authorization header.
 */
export function extractToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

/**
 * Verifies the request's Authorization header and returns the userId.
 * Returns null if the token is missing or invalid.
 */
export function authenticateRequest(req: Request): { userId: string } | null {
  const token = extractToken(req);
  if (!token) return null;
  return verifyToken(token);
}
