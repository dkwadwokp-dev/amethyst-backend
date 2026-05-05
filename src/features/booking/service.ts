import { BookingModel } from "./model";
import { paymentService } from "../payment/service";
import type { CreateBookingInput, BookingStatus } from "./schema";
import { sendBookingConfirmation } from "../shared/email.service";

function generateReference(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ref = "";
  for (let i = 0; i < 8; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

const ROOM_PRICES: Record<string, number> = {
  rm_01: 180, // THE STANDARD ROOM
  rm_02: 300, // THE DELUXE ROOM
  rm_03: 450, // THE EXECUTIVE SUITE
  rm_04: 600, // THE FAMILY CONNECT ROOM
  rm_05: 900, // THE PRESIDENTIAL SUITE
  rm_06: 1200, // THE HONEYMOON SUITE
};

export class BookingService {
  async createBooking(input: CreateBookingInput) {
    const reference = generateReference();
    const guests =
      typeof input.guests === "string"
        ? parseInt(input.guests, 10)
        : input.guests;

    const checkIn = new Date(input.checkIn);
    const checkOut = new Date(input.checkOut);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new Error("Invalid check-in or check-out date.");
    }

    const now = new Date();
    // Reset time part of 'now' to ensure we compare dates properly (allow booking for "today")
    now.setHours(0, 0, 0, 0);
    const checkInCheck = new Date(checkIn);
    checkInCheck.setHours(0, 0, 0, 0);

    if (checkInCheck < now) {
      throw new Error("Cannot book dates in the past.");
    }

    if (checkOut <= checkIn) {
      throw new Error("Check-out date must be after check-in date.");
    }

    if (guests <= 0) {
      throw new Error("Guests must be at least 1.");
    }

    if (!input.email || !input.email.includes("@")) {
      throw new Error("Invalid email address.");
    }

    // Check for underlying overlaps in the database
    // Two intervals (StartA, EndA) and (StartB, EndB) overlap if StartA < EndB and EndA > StartB
    const conflict = await BookingModel.findOne({
      item: input.item,
      status: { $ne: "CANCELLED" },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn },
    });

    if (conflict) {
      const typeLabel = input.type === "room" ? "room" : "table";
      throw new Error(
        `This ${typeLabel} is already booked for the selected dates/times.`,
      );
    }

    let calculatedAmount = 0;
    if (input.type === "room") {
      const pricePerNight = ROOM_PRICES[input.itemType] || 0;
      const differenceInTime = checkOut.getTime() - checkIn.getTime();
      const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
      // Ensure at least 1 day if dates are same day but different hours (though room checkin/out usually covers overnight)
      const nights = differenceInDays > 0 ? differenceInDays : 1;
      calculatedAmount = pricePerNight * nights;
    }

    const booking = await BookingModel.create({
      reference,
      type: input.type,
      status: input.type === "dining" ? "PROCESSED" : "PENDING",
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      guests,
      amount: calculatedAmount || input.amount || 0,
      itemType: input.itemType,
      item: input.item,
      checkIn,
      checkOut,
    });

    if (booking.type === "dining") {
      // Send confirmation email immediately for dining
      await sendBookingConfirmation(booking.email, {
        firstName: booking.firstName,
        reference: booking.reference,
        type: "Dining Reservation",
        checkInDate: booking.checkIn.toDateString(),
        guests: booking.guests,
        verificationLink: `${process.env.FRONTEND_URL}/bookings/${booking.reference}?email=${booking.email}`,
      });
    }

    let payment = null;

    if (booking.type === "room" && booking.amount > 0) {
      const korapayPayment = await paymentService.createKorapayCheckoutUrl({
        amount: booking.amount,
        currency: "GHS",
        reference: booking.reference,
        userEmail: booking.email,
        userName: `${booking.firstName} ${booking.lastName}`,
        callbackPath: `/verify-booking-payment?txref=${booking.reference}`, // This will be used to verify payment and update booking status
      });

      // Normalize the response to match Paystack structure
      payment = {
        status: korapayPayment.status,
        message: korapayPayment.message,
        data: {
          authorization_url: korapayPayment.data.checkout_url,
          access_code: korapayPayment.data.reference,
          reference: korapayPayment.data.reference,
        },
      };
    }

    return { booking, payment };
  }

  async getBookings(type?: string, status?: string) {
    const query: any = {};
    if (type && type !== "all") {
      query.type = type;
    }
    if (status && status !== "all") {
      query.status = status;
    }
    return BookingModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async checkAvailability(params: {
    type?: string;
    itemType?: string;
    item?: string;
  }) {
    const { type, itemType, item } = params;
    const start = new Date();

    if (!item && !itemType) {
      return { type: type || "unknown", bookedPeriods: [] };
    }

    const query: any = {
      status: { $ne: "CANCELLED" },
      checkOut: { $gt: start }, // Only show bookings that end after our start date
    };

    if (item) {
      query.item = item;
    } else if (itemType) {
      query.itemType = itemType;
    }

    if (type && type !== "unknown") {
      query.type = type;
    }

    const bookings = await BookingModel.find(query)
      .select("checkIn checkOut")
      .exec();

    return {
      type: type || "unknown",
      itemType,
      item,
      bookedPeriods: bookings.map((b) => ({
        start: b.checkIn,
        end: b.checkOut,
      })),
    };
  }

  async getBookingByReference(reference: string) {
    return BookingModel.findOne({ reference }).exec();
  }

  async verifyBooking(reference: string, email: string) {
    return BookingModel.findOne({
      reference: reference.toUpperCase(),
      email: email.toLowerCase(),
    }).exec();
  }

  async verifyBookingPayment(transactionReference: string) {
    // The reference returned from Paystack might be "BOOKING_REF" or "BOOKING_REF-TIMESTAMP"
    // We need to extract the actual booking reference.
    const bookingRef = transactionReference.split("-")[0];

    const booking = await BookingModel.findOne({ reference: bookingRef });
    if (!booking) throw new Error("Booking not found");

    if (booking.status === "PROCESSED" || booking.status === "CONFIRMED") {
      return booking;
    }

    const payment = await paymentService.verifyKorapayPayment(
      transactionReference,
      booking.amount,
    );

    if (!payment || payment.data.status !== "success") {
      throw new Error("Payment verification failed");
    }

    booking.status = "PROCESSED";
    await booking.save();

    await sendBookingConfirmation(booking.email, {
      firstName: booking.firstName,
      reference: booking.reference,
      type: "Room Booking",
      checkInDate: booking.checkIn.toDateString(),
      guests: booking.guests,
      verificationLink: `${process.env.FRONTEND_URL}/bookings/${booking.reference}?email=${booking.email}`,
    });

    return booking;
  }

  async cancelBooking(reference: string) {
    const booking = await BookingModel.findOne({ reference }).exec();
    if (!booking) return null;

    booking.status = "CANCELLED" as BookingStatus;
    await booking.save();
    return booking;
  }

  async completeBooking(reference: string) {
    const booking = await BookingModel.findOne({ reference }).exec();
    if (!booking) return null;

    booking.status = "COMPLETED" as BookingStatus;
    await booking.save();
    return booking;
  }

  async createPaymentIntent(reference: string) {
    const booking = await BookingModel.findOne({ reference });
    if (!booking) throw new Error("Booking not found");

    if (booking.status !== "PENDING") {
      throw new Error(`Booking status is ${booking.status}, cannot pay.`);
    }

    if (booking.type !== "room" || booking.amount <= 0) {
      throw new Error("This booking does not require payment.");
    }

    // Generate a unique transaction reference for this attempt
    const transactionReference = `${booking.reference}-${Date.now()}`;

    const payment = await paymentService.createKorapayCheckoutUrl({
      amount: booking.amount,
      currency: "GHS",
      reference: transactionReference,
      userEmail: booking.email,
      userName: `${booking.firstName} ${booking.lastName}`,
    });

    // Normalize the response
    const normalizedPayment = {
      status: payment.status,
      message: payment.message,
      data: {
        authorization_url: payment.data.checkout_url,
        access_code: payment.data.reference,
        reference: payment.data.reference,
      },
    };

    return normalizedPayment;
  }
}
