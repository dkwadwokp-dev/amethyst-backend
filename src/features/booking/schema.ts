export type BookingStatus =
  | "COMPLETED"
  | "CONFIRMED"
  | "PENDING"
  | "CANCELLED"
  | "PROCESSED";

export type BookingType = "room" | "dining";

export interface CreateBookingInput {
  type: BookingType;
  itemType: string; // Room Type ID or Dining Area ID
  item: string; // Room Instance ID or Table ID
  firstName: string;
  lastName: string;
  email: string;
  guests: number | string;
  amount: number; // calculated/passed from front-end
  checkIn: string | Date;
  checkOut: string | Date;
}
