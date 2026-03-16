import { Router } from "express";
import { adminLogin, getLoggedInUser } from "./controller";
import { requireAdmin } from "./middleware";

const router = Router();

// POST /auth/login
router.post("/login", adminLogin);

// GET /auth/me
router.get("/me", requireAdmin, getLoggedInUser);

export default router;
