import { Request, Response } from "express";
import { loginAdmin } from "./service";

export async function adminLogin(req: Request, res: Response) {
  try {
    const { passcode } = req.body as { passcode?: string };

    if (!passcode) {
      return res.status(400).json({ message: "Passcode is required" });
    }

    const result = loginAdmin(passcode);

    if (!result) {
      return res.status(401).json({ message: "Invalid passcode" });
    }

    return res.json({
      token: result.token,
      admin: result.payload,
    });
  } catch (err) {
    console.error("[auth] adminLogin error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getLoggedInUser(req: Request, res: Response) {
  // The user is already attached to the request by the requireAdmin middleware
  const user = (req as any).user;
  return res.json({ admin: user });
}
