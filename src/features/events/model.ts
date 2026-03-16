import { Schema, model, type Document, type Model } from "mongoose";

export interface EventDocument extends Document {
  eventId: string; // EV_0001
  title: string;
  date: Date;
  time: string;
  location: string;
  desc: string;
  longDesc?: string;
  leadImage: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<EventDocument>(
  {
    eventId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true },
    desc: { type: String, required: true },
    longDesc: { type: String },
    leadImage: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export const EventModel: Model<EventDocument> = model<EventDocument>(
  "Event",
  eventSchema,
);
