import { Schema, model, type Document, type Model, Types } from "mongoose";

export interface TicketDocument extends Document {
  eventId: Types.ObjectId; // Mongoose ObjectId
  ticketId: string; // Custom ticket ID if needed, or remove if not used
  type: string; // e.g. "VIP", "Regular"
  price: number;
  totalQuantity?: number; // null or undefined for unlimited
  availableQuantity?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<TicketDocument>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    ticketId: { type: String },
    type: { type: String, required: true },
    price: { type: Number, required: true },
    totalQuantity: { type: Number, default: null }, // Using null to represent unlimited
    availableQuantity: { type: Number, default: null },
  },
  {
    timestamps: true,
  },
);

export const TicketModel: Model<TicketDocument> = model<TicketDocument>(
  "Ticket",
  ticketSchema,
);
