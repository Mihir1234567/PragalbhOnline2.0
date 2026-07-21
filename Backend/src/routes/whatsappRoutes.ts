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
  getAnalytics,
  updateContact,
  getQuickReplies,
  createQuickReply,
  deleteQuickReply,
  createContact,
  deleteContact,
  getTemplates,
  sendTemplateManual
} from "../controllers/whatsappController";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

// Webhook for Meta API (Public)
router.get("/webhook", verifyWebhook);
router.post("/webhook", handleWebhook);

// Templates (Protected for Admin)
router.get("/templates", protect, getTemplates);
router.post("/send-template", protect, sendTemplateManual);

// CRM Routes (Protected for Admin)
router.get("/analytics", protect, getAnalytics);
router.get("/contacts", protect, getAllContacts);
router.post("/contacts", protect, createContact);
router.patch("/contacts/:id", protect, updateContact);
router.delete("/contacts/:id", protect, deleteContact);
router.post("/send", protect, sendManualMessage);

// Quick Replies CRUD
router.get("/quick-replies", protect, getQuickReplies);
router.post("/quick-replies", protect, createQuickReply);
router.delete("/quick-replies/:id", protect, deleteQuickReply);

// Bot Services CRUD (Protected for Admin)
router.get("/services", protect, getBotServices);
router.put("/services/reorder", protect, reorderBotServices);
router.post("/services", protect, createBotService);
router.put("/services/:id", protect, updateBotService);
router.delete("/services/:id", protect, deleteBotService);

export default router;
