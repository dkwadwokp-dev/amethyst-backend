import { Schema, model, type Document, type Model } from "mongoose";
import type { BookingStatus, BookingType } from "./schema";

export interface BookingDocument extends Document {
  reference: string;
  type: BookingType;
  status: BookingStatus;

  firstName: string;
  lastName: string;
  email: string;
  guests: number;
  amount: number;

  itemType: string; // Room Type ID or Dining Area ID
  item: string; // Room Instance ID or Table ID

  checkIn: Date;
  checkOut: Date;

  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<BookingDocument>(
  {
    reference: { type: String, required: true, unique: true },
    type: { type: String, enum: ["room", "dining"], required: true },
    status: {
      type: String,
      enum: ["COMPLETED", "CONFIRMED", "PENDING", "CANCELLED", "PROCESSED"],
      default: "PENDING",
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    guests: { type: Number, required: true },
    amount: { type: Number, default: 0 },
    itemType: { type: String, required: true },
    item: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
  },
  {
    timestamps: true,
  },
);

export const BookingModel: Model<BookingDocument> = model<BookingDocument>(
  "Booking",
  bookingSchema,
);
