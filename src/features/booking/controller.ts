import type { Request, Response } from "express";
import { BookingService } from "./service";

const bookingService = new BookingService();

export class BookingController {
  constructor(private readonly service: BookingService) {}

  createBooking = async (req: Request, res: Response) => {
    try {
      const booking = await this.service.createBooking(req.body);
      return res.status(201).json(booking);
    } catch (err) {
      console.error("[booking] createBooking error", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };

  getBookings = async (req: Request, res: Response) => {
    try {
      const { type, status } = req.query;
      const bookings = await this.service.getBookings(
        type as string,
        status as string,
      );
      return res.json(bookings);
    } catch (err) {
      console.error("[booking] getBookings error", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };

  checkAvailability = async (req: Request, res: Response) => {
    try {
      const result = await this.service.checkAvailability(req.query);
      return res.json(result);
    } catch (err) {
      console.error("[booking] checkAvailability error", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };

  getBooking = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const booking = await this.service.getBookingByReference(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      return res.json(booking);
    } catch (err) {
      console.error("[booking] getBooking error", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };

  verifyBooking = async (req: Request, res: Response) => {
    try {
      const { reference, email } = req.query;

      if (!reference || !email) {
        return res
          .status(400)
          .json({ message: "Reference and email are required" });
      }

      const booking = await this.service.verifyBooking(
        reference as string,
        email as string,
      );

      if (!booking) {
        return res
          .status(404)
          .json({ message: "No booking found with these details" });
      }

      return res.json(booking);
    } catch (err) {
      console.error("[booking] verifyBooking error", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };

  verifyBookingPayment = async (req: Request, res: Response) => {
    try {
      const { reference } = req.params;
      const booking = await this.service.verifyBookingPayment(reference);
      return res.json(booking);
    } catch (err) {
      console.error("[booking] verifyBookingPayment error", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };

  createPaymentIntent = async (req: Request, res: Response) => {
    try {
      const { reference } = req.params;
      const payment = await this.service.createPaymentIntent(reference);
      return res.json(payment);
    } catch (err: any) {
      console.error("[booking] createPaymentIntent error", err);
      return res.status(500).json({ message: err.message || "Server Error" });
    }
  };

  cancelBooking = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const booking = await this.service.cancelBooking(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      return res.json(booking);
    } catch (err) {
      console.error("[booking] cancelBooking error", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };

  completeBooking = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const booking = await this.service.completeBooking(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      return res.json(booking);
    } catch (err) {
      console.error("[booking] completeBooking error", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

export const bookingController = new BookingController(bookingService);
