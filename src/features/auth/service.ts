import jwt from "jsonwebtoken";

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || process.env.ADMIN_CODE;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn("[auth] JWT_SECRET is not set. Tokens cannot be signed.");
}

export interface AdminTokenPayload {
  id: string;
  name: string;
}

export function loginAdmin(
  passcode: string,
): { token: string; payload: AdminTokenPayload } | null {
  if (!ADMIN_PASSCODE) {
    throw new Error(
      "ADMIN_PASSCODE (or ADMIN_CODE) environment variable is required",
    );
  }
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  if (passcode !== ADMIN_PASSCODE) {
    return null;
  }

  const payload: AdminTokenPayload = {
    id: "admin",
    name: "AH HOTEL",
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "30d",
  });

  return { token, payload };
}
