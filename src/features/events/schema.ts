import { z } from "zod";

export const eventTicketSchema = z.object({
  type: z.string().min(1, "Ticket type is required"),
  price: z.number().min(0, "Price must be positive"),
  totalQuantity: z.number().min(1).optional().nullable(), // Nullable for unlimited
});

export const createEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  date: z
    .string()
    .transform((val) => new Date(val))
    .refine((date) => date > new Date(), {
      message: "Event date must be in the future",
    })
    .or(
      z.date().refine((date) => date > new Date(), {
        message: "Event date must be in the future",
      }),
    ),
  time: z.string().min(1, "Time is required"),
  location: z.string().min(1, "Location is required"),
  desc: z.string().min(10, "Description must be at least 10 characters"),
  longDesc: z.string().optional(),
  leadImage: z.string().url("Valid image URL is required"),
  tickets: z.array(eventTicketSchema).optional().default([]),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const purchaseTicketSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  ticketId: z.string().min(1, "Ticket ID is required"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  quantity: z.number().int().min(1).optional(), // Add quantity to schema
});

export type PurchaseTicketInput = z.infer<typeof purchaseTicketSchema>;
