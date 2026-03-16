import { EventModel } from "./model";
import { TicketModel } from "../tickets/ticket-model";
import { TicketPurchaseModel } from "../tickets/purchase-model";
import { generateReference } from "../shared/utils";
import { paymentService } from "../payment/service";
import { sendTicketPurchaseConfirmation } from "../shared/email.service";
import type { CreateEventInput, PurchaseTicketInput } from "./schema";

export class EventService {
  private async generateEventId(): Promise<string> {
    const lastEvent = await EventModel.findOne().sort({ eventId: -1 });

    if (!lastEvent || !lastEvent.eventId) return "EV_0001";

    const parts = (lastEvent.eventId as string).split("_");
    const lastNum = parts.length > 1 ? parseInt(parts[1]) : 0;

    if (isNaN(lastNum)) return "EV_0001";

    return `EV_${(lastNum + 1).toString().padStart(4, "0")}`;
  }

  async createEvent(input: CreateEventInput) {
    const eventId = await this.generateEventId();

    // 1. Create the Event
    const event = await EventModel.create({
      ...input,
      eventId,
      date: new Date(input.date),
    });

    // 2. Create the associated Tickets in the tickets table
    if (input.tickets && input.tickets.length > 0) {
      const ticketDocs = input.tickets.map((t) => ({
        eventId: event._id, // Use the MongoDB _id
        type: t.type,
        price: t.price,
        totalQuantity: t.totalQuantity || null, // null = unlimited
        availableQuantity: t.totalQuantity || null,
      }));
      await TicketModel.insertMany(ticketDocs);
    }

    return event;
  }

  async getEvents() {
    const events = await EventModel.find().sort({ date: 1 }).lean().exec();

    // Fetch tickets for each event using _id
    const eventsWithTickets = await Promise.all(
      events.map(async (event) => {
        const tickets = await TicketModel.find({ eventId: event._id })
          .lean()
          .exec();
        return { ...event, tickets };
      }),
    );

    return eventsWithTickets;
  }

  async getEventById(id: string) {
    // Check if it's an eventId (EV_XXXX) or _id (ObjectId)
    const query = id.startsWith("EV_") ? { eventId: id } : { _id: id };
    const event = await EventModel.findOne(query).lean().exec();

    if (!event) return null;

    const tickets = await TicketModel.find({ eventId: event._id })
      .lean()
      .exec();

    return {
      ...event,
      tickets,
    };
  }

  async deleteEvent(id: string) {
    // Determine the query (either _id or eventId string)
    const query = id.startsWith("EV_") ? { eventId: id } : { _id: id };
    const event = await EventModel.findOne(query);
    if (!event) throw new Error("Event not found");

    // Delete associated tickets (using the actual event _id)
    await TicketModel.deleteMany({ eventId: event._id });
    // Delete the event
    await EventModel.findOneAndDelete(query);
  }

  async purchaseTicket(input: PurchaseTicketInput) {
    // input.eventId and input.ticketId are now assumed to be MongoDB _ids
    const event = await EventModel.findById(input.eventId);
    if (!event) throw new Error("Event not found");

    const ticket = await TicketModel.findOne({
      _id: input.ticketId,
      eventId: event._id,
    });

    if (!ticket) throw new Error("Ticket type not found for this event");

    const quantity = input.quantity || 1;

    // Check availability (if not unlimited)
    if (
      ticket.availableQuantity !== null &&
      ticket.availableQuantity !== undefined
    ) {
      if (ticket.availableQuantity < quantity) {
        throw new Error(
          `Not enough tickets available. Only ${ticket.availableQuantity} left.`,
        );
      }
    }

    const reference = generateReference("PY-", 8);
    const amount = ticket.price * quantity;

    const purchase = await TicketPurchaseModel.create({
      reference,
      eventId: input.eventId,
      ticketId: input.ticketId,
      ticketType: ticket.type,
      amount,
      quantity,
      ticketCodes: [],
      fullName: input.fullName,
      email: input.email,
      status: "PENDING",
    });

    const payment = await paymentService.createPaymentLink({
      id: reference,
      email: input.email,
      amount,
      name: input.fullName,
      callbackPath: "/verify-ticket-payment",
    });

    return { purchase, payment };
  }

  async getTicketsByEmail(email: string) {
    return TicketPurchaseModel.find({ email: email.toLowerCase() })
      .populate("eventId")
      .sort({ createdAt: -1 })
      .exec();
  }

  async getTicketByReference(reference: string) {
    return TicketPurchaseModel.findOne({ reference })
      .populate("eventId")
      .exec();
  }

  async verifyTicketPurchase(reference: string) {
    const purchase = await TicketPurchaseModel.findOne({
      $or: [{ reference }, { ticketCodes: reference }],
    }).populate("eventId");

    if (!purchase) throw new Error("Ticket purchase not found");

    if (purchase.status === "PAID") {
      // If the user searched by a specific TICKET CODE (TC-...), restrict the response.
      // We don't show the payment reference or other tickets in the same batch.
      if (purchase.ticketCodes.includes(reference)) {
        const purchaseObj = purchase.toObject();
        return {
          ...purchaseObj,
          ticketCodes: [reference], // Only return the matched ticket
          reference: undefined, // Hide the payment reference
          amount: undefined, // Hide the payment amount
          isSingleTicket: true,
        };
      }
      // If searched by Payment Reference, return full details
      return purchase;
    }

    const verifyRef = purchase.reference || reference;
    const payment = await paymentService.validatePayment(verifyRef);

    // Check if payment was actually successful
    if (!payment.status || payment.data.status !== "success") {
      throw new Error(
        `Payment verification failed: ${payment.data?.gateway_response || "Unknown status"}`,
      );
    }
    const ticketCodes: string[] = [];
    for (let i = 0; i < purchase.quantity; i++) {
      ticketCodes.push(generateReference("TC-", 6));
    }

    // Update purchase status
    purchase.status = "PAID";
    purchase.ticketCodes = ticketCodes;
    await purchase.save();

    // Reduce ticket availability if quantity is tracked
    const ticket = await TicketModel.findById(purchase.ticketId);
    if (
      ticket &&
      ticket.availableQuantity !== undefined &&
      ticket.availableQuantity !== null
    ) {
      ticket.availableQuantity = Math.max(
        0,
        ticket.availableQuantity - purchase.quantity,
      );
      await ticket.save();
    }

    // Send confirmation email with ticket codes
    await sendTicketPurchaseConfirmation(purchase.email, {
      fullName: purchase.fullName,
      eventName: (purchase.eventId as any).title || "Event",
      eventDate: (purchase.eventId as any).date
        ? new Date((purchase.eventId as any).date).toDateString()
        : "Date TBD",
      eventLocation: (purchase.eventId as any).location || "Venue TBD",
      quantity: purchase.quantity,
      ticketType: purchase.ticketType,
      ticketCodes: purchase.ticketCodes,
    });

    // Re-fetch to return populated
    return purchase;
  }

  async updateEvent(id: string, input: Partial<CreateEventInput>) {
    const updateData = { ...input };
    if (input.date) {
      updateData.date = new Date(input.date) as any;
    }

    // Determine the query (either _id or eventId string)
    const query = id.startsWith("EV_") ? { eventId: id } : { _id: id };
    const event = await EventModel.findOneAndUpdate(query, updateData, {
      new: true,
    }).exec();

    if (!event) return null;

    // If tickets are provided, we nested-update them (simple version: replace all)
    if (input.tickets) {
      await TicketModel.deleteMany({ eventId: event._id });
      const ticketDocs = input.tickets.map((t) => ({
        eventId: event._id,
        type: t.type,
        price: t.price,
        totalQuantity: t.totalQuantity || null,
        availableQuantity: t.totalQuantity || null,
      }));
      await TicketModel.insertMany(ticketDocs);
    }

    return this.getEventById(id);
  }
}
