import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./features/shared/config/db";
import authRouter from "./features/auth/router";
import bookingRouter from "./features/booking/router";
import eventRouter from "./features/events/router";
import { contactRouter } from "./features/contact/router";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/events", eventRouter);
app.use("/api/contact", contactRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[server] listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("[server] Failed to start due to DB error");
    process.exit(1);
  }
}

start();
