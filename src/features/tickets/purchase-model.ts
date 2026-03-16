import { Schema, model, type Document, type Model, Types } from "mongoose";

export interface TicketPurchaseDocument extends Document {
  reference?: string;
  eventId: Types.ObjectId; // Mongoose ObjectId
  ticketId: Types.ObjectId; // Mongoose ObjectId
  ticketType: string;
  amount: number;

  fullName: string;
  email: string;

  quantity: number;
  ticketCodes: string[];

  status: "PENDING" | "PAID" | "CANCELLED";

  createdAt: Date;
  updatedAt: Date;
}

const ticketPurchaseSchema = new Schema<TicketPurchaseDocument>(
  {
    reference: { type: String, unique: true, sparse: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    ticketType: { type: String, required: true },
    amount: { type: Number, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    ticketCodes: [{ type: String }],
    status: {
      type: String,
      enum: ["PENDING", "PAID", "CANCELLED"],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
  },
);

export const TicketPurchaseModel: Model<TicketPurchaseDocument> =
  model<TicketPurchaseDocument>("TicketPurchase", ticketPurchaseSchema);
