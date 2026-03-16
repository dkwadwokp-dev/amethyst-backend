import { Router } from "express";
import { ContactController } from "./controller";

const router = Router();
const controller = new ContactController();

router.post("/", controller.submitContactForm);

export { router as contactRouter };
