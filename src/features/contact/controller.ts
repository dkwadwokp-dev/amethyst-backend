import { Request, Response } from "express";
import { contactFormSchema } from "./schema";
import { sendContactFormSubmission } from "../shared/email.service";

export class ContactController {
  submitContactForm = async (req: Request, res: Response) => {
    try {
      const data = contactFormSchema.parse(req.body);

      // Send email to admin
      const adminEmail = process.env.ADMIN_EMAIL || "admin@amethysthotel.com";

      await sendContactFormSubmission(adminEmail, data);

      return res.json({ message: "Message sent successfully" });
    } catch (error: any) {
      if (error.issues) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.issues });
      }
      console.error("Contact form error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}
