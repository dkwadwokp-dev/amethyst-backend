import axios from "axios";
import type {
  CreateCheckoutLinkParams,
  PaystackResponse,
  PaystackVerificationResponse,
} from "./interfaces";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export class PaymentService {
  /**
   * Create a Paystack checkout link
   * Generic implementation that takes direct params instead of looking up a ticket purchase
   */
  async createPaymentLink(
    params: CreateCheckoutLinkParams,
  ): Promise<PaystackResponse> {
    const { id, email, amount, name, callbackPath } = params;

    if (!PAYSTACK_SECRET_KEY) {
      console.warn("PAYSTACK_SECRET_KEY environment variable is not set");
      throw new Error("Payment provider not configured");
    }

    try {
      // Amount in kobo/pesewas (lowest currency unit)
      const amountInLowestUnit = Math.round(amount * 100);

      const data = {
        email,
        amount: amountInLowestUnit,
        callback_url: `${FRONTEND_URL}${callbackPath || "/verify-payment"}`,
        reference: id,
        metadata: {
          custom_fields: [
            {
              display_name: "Customer Name",
              variable_name: "customer_name",
              value: name,
            },
          ],
        },
        currency: "GHS",
      };

      const headers = {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      };

      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        data,
        { headers },
      );

      return response.data;
    } catch (error: any) {
      console.error(
        "Error creating Paystack checkout link:",
        error.response?.data || error.message,
      );
      throw new Error("Failed to create payment link");
    }
  }

  /**
   * Verify a Paystack payment using the reference
   */
  async validatePayment(
    reference: string,
  ): Promise<PaystackVerificationResponse> {
    if (!PAYSTACK_SECRET_KEY) {
      console.warn("PAYSTACK_SECRET_KEY environment variable is not set");
      throw new Error("Payment provider not configured");
    }

    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        },
      );

      const { status } = response.data;

      if (status) {
        return response.data;
      } else {
        throw new Error("Payment verification failed");
      }
    } catch (error: any) {
      console.error(
        "Error verifying payment:",
        error.response?.data || error.message,
      );
      throw new Error("An error occurred during payment verification process");
    }
  }
}

export const paymentService = new PaymentService();
