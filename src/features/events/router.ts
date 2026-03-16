import { Router } from "express";
import eventController from "./controller";
import { requireAdmin } from "../auth/middleware";

const router = Router();

// Public routes
router.get("/", eventController.getEvents);
router.get("/:id", eventController.getEventById);
router.post("/tickets/purchase", eventController.purchaseTicket);
router.get("/tickets/email/:email", eventController.getTicketsByEmail);
router.get("/tickets/verify/:reference", eventController.verifyTicketPurchase);
router.get("/tickets/ref/:reference", eventController.getTicketByReference);

// Admin only routes
router.post("/", requireAdmin, eventController.createEvent);
router.put("/:id", requireAdmin, eventController.updateEvent);
router.delete("/:id", requireAdmin, eventController.deleteEvent);

export default router;
