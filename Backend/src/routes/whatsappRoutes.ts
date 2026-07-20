import express from "express";
import {
  verifyWebhook,
  handleWebhook,
  getAllContacts,
  sendManualMessage,
  getBotServices,
  createBotService,
  updateBotService,
  deleteBotService,
  reorderBotServices,
  getAnalytics
} from "../controllers/whatsappController";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

// Webhook for Meta API (Public)
router.get("/webhook", verifyWebhook);
router.post("/webhook", handleWebhook);

// CRM Routes (Protected for Admin)
router.get("/analytics", protect, getAnalytics);
router.get("/contacts", protect, getAllContacts);
router.post("/send", protect, sendManualMessage);

// Bot Services CRUD (Protected for Admin)
router.get("/services", protect, getBotServices);
router.put("/services/reorder", protect, reorderBotServices);
router.post("/services", protect, createBotService);
router.put("/services/:id", protect, updateBotService);
router.delete("/services/:id", protect, deleteBotService);

export default router;
