import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AdminTokenPayload } from "./service";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn("[auth] JWT_SECRET is not set. Token verification will fail.");
}

export interface AuthenticatedRequest extends Request {
  user?: AdminTokenPayload;
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Server auth is not configured correctly" });
    }

    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authHeader.substring("Bearer ".length).trim();

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
      req.user = decoded;
      return next();
    } catch (err) {
      console.error("[auth] Token verification failed");
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  } catch (err) {
    console.error("[auth] requireAdmin error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
