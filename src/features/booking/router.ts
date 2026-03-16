import { Router } from "express";
import { bookingController } from "./controller";
import { requireAdmin } from "../auth/middleware";

const router = Router();

// Create a booking (guest-facing)
router.post("/", bookingController.createBooking);

// Check availability (guest-facing)
router.get("/check-availability", bookingController.checkAvailability);

// Payment Verification (guest-facing)
router.get(
  "/verify-payment/:reference",
  bookingController.verifyBookingPayment,
);

// Create Payment Intent for existing booking (guest-facing)
router.post("/:reference/payment", bookingController.createPaymentIntent);

// Verify specific booking by ref and email (guest-facing)
router.get("/verify", bookingController.verifyBooking);

// View all bookings (admin-only)
router.get("/", requireAdmin, bookingController.getBookings);

// View a single booking by reference (guest/admin)
router.get("/:id", bookingController.getBooking);

// Cancel a booking (admin-only)
router.post("/:id/cancel", requireAdmin, bookingController.cancelBooking);

// Complete a booking (admin-only)
router.post("/:id/complete", requireAdmin, bookingController.completeBooking);

export default router;
