import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const port = parseInt(process.env.SMTP_PORT || "587");
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port,
  secure: process.env.SMTP_SECURE === "true" || port === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const templateDir = path.join(__dirname, "templates");

// Helper to read HTML file
const readTemplate = (templateName: string): string => {
  const filePath = path.join(templateDir, `${templateName}.html`);
  return fs.readFileSync(filePath, "utf-8");
};

// Helper to replace placeholders
const replacePlaceholders = (
  template: string,
  data: Record<string, any>,
): string => {
  let result = template;
  for (const key in data) {
    const placeholder = `{{${key}}}`;
    // Replace all occurrences
    result = result.split(placeholder).join(String(data[key]));
  }

  // Handle array {{#each ticketCodes}}...{{/each}} simple implementation
  // This is a naive implementation, specific for ticketCodes array of strings
  if (data.ticketCodes && Array.isArray(data.ticketCodes)) {
    const loopRegex = /{{#each ticketCodes}}([\s\S]*?){{\/each}}/g;
    result = result.replace(loopRegex, (_, content) => {
      return data.ticketCodes
        .map((code: string) => content.replace("{{this}}", code))
        .join("");
    });
  }

  return result;
};

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
): Promise<void> => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP credentials not provided. Email not sent.");
      console.log(`To: ${to}, Subject: ${subject}`);
      return;
    }

    await transporter.sendMail({
      from: `"AH Hotel & Residences" <${
        process.env.SMTP_USER || "no-reply@ahhotel.com"
      }>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    // Don't throw, just log. We don't want to break the main flow if email fails.
  }
};

export const sendBookingConfirmation = async (
  to: string,
  data: {
    firstName: string;
    reference: string;
    type: string;
    checkInDate: string;
    guests: number | string;
    verificationLink: string;
    year?: number;
  },
) => {
  const template = readTemplate("booking-confirmation");
  const html = replacePlaceholders(template, {
    ...data,
    year: new Date().getFullYear(),
  });
  await sendEmail(to, "Booking Confirmation - AH Hotel & Residences", html);
};

export const sendTicketPurchaseConfirmation = async (
  to: string,
  data: {
    fullName: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    quantity: number;
    ticketType: string;
    ticketCodes: string[];
    year?: number;
  },
) => {
  const template = readTemplate("ticket-purchase");
  const html = replacePlaceholders(template, {
    ...data,
    year: new Date().getFullYear(),
  });
  await sendEmail(to, "Your Tickets - AH Hotel & Residences", html);
};

export const sendContactFormSubmission = async (
  to: string, // Admin email
  data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  },
) => {
  const template = readTemplate("contact-form");
  const html = replacePlaceholders(template, data);
  await sendEmail(to, `New Contact: ${data.subject}`, html);
};
