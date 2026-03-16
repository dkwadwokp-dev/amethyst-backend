import type { Request, Response } from "express";
import { EventService } from "./service";
import { createEventSchema, purchaseTicketSchema } from "./schema";

const eventService = new EventService();

export class EventController {
  async createEvent(req: Request, res: Response) {
    try {
      const validatedData = createEventSchema.parse(req.body);
      const event = await eventService.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error: any) {
      res
        .status(400)
        .json({ message: error.message || "Failed to create event" });
    }
  }

  async updateEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const event = await eventService.updateEvent(id, req.body);
      if (!event) return res.status(404).json({ message: "Event not found" });
      res.json(event);
    } catch (error: any) {
      res
        .status(400)
        .json({ message: error.message || "Failed to update event" });
    }
  }

  async getEvents(_req: Request, res: Response) {
    try {
      const events = await eventService.getEvents();
      res.json(events);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: error.message || "Failed to fetch events" });
    }
  }

  async getEventById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const event = await eventService.getEventById(id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      res.json(event);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: error.message || "Failed to fetch event" });
    }
  }

  async deleteEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await eventService.deleteEvent(id);
      res.status(204).send();
    } catch (error: any) {
      res
        .status(500)
        .json({ message: error.message || "Failed to delete event" });
    }
  }

  async purchaseTicket(req: Request, res: Response) {
    try {
      const validatedData = purchaseTicketSchema.parse(req.body);
      const ticket = await eventService.purchaseTicket(validatedData);
      res.status(201).json(ticket);
    } catch (error: any) {
      res
        .status(400)
        .json({ message: error.message || "Failed to purchase ticket" });
    }
  }

  async getTicketsByEmail(req: Request, res: Response) {
    try {
      const { email } = req.params;
      const tickets = await eventService.getTicketsByEmail(email);
      res.json(tickets);
    } catch (error: any) {
      res
        .status(400)
        .json({ message: error.message || "Failed to fetch tickets" });
    }
  }

  async getTicketByReference(req: Request, res: Response) {
    try {
      const { reference } = req.params;
      const ticket = await eventService.getTicketByReference(reference);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      res.json(ticket);
    } catch (error: any) {
      res
        .status(400)
        .json({ message: error.message || "Failed to fetch ticket" });
    }
  }

  async verifyTicketPurchase(req: Request, res: Response) {
    try {
      const { reference } = req.params;
      const ticket = await eventService.verifyTicketPurchase(reference);
      res.json(ticket);
    } catch (error: any) {
      res
        .status(400)
        .json({ message: error.message || "Failed to verify ticket" });
    }
  }
}

export default new EventController();
