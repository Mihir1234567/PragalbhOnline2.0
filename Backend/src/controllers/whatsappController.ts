import { Request, Response } from "express";
import WhatsAppContact from "../models/WhatsAppContact";
import WhatsAppMessage from "../models/WhatsAppMessage";
import WhatsAppBotService from "../models/WhatsAppBotService";
import {
  sendWelcomeTemplate,
  sendServicesList,
  sendServiceDetailsTemplate,
  sendLimitReachedTemplate,
  sendTemplate,
  sendTextMessage,
} from "../utils/whatsappServices";

// Handle webhook verification
export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
};

// Handle incoming messages
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value || {};
          if (value.messages) {
            for (const msg of value.messages) {
              await processIncomingMessage(msg, value.contacts || []);
            }
          }
          if (value.statuses) {
            for (const statusObj of value.statuses) {
              await processMessageStatus(statusObj);
            }
          }
        }
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).send("Server Error");
  }
};

const processMessageStatus = async (statusObj: any) => {
  const wamId = statusObj.id;
  const status = statusObj.status; // 'sent', 'delivered', 'read', 'failed'
  
  if (wamId && status) {
    await WhatsAppMessage.updateOne({ wamId }, { status });
  }
};

const processIncomingMessage = async (msgData: any, contacts: any[]) => {
  const phoneNumber = msgData.from;
  const msgType = msgData.type;

  let customerName = "";
  if (contacts && contacts.length > 0) {
    customerName = contacts[0].profile?.name || "";
  }

  // Get or create contact
  let contact = await WhatsAppContact.findOne({ phoneNumber });
  if (!contact) {
    contact = new WhatsAppContact({ 
      phoneNumber, 
      name: customerName, 
      currentPage: 1,
      status: "open",
      unreadCount: 1
    });
    await contact.save();
  } else {
    if (customerName && !contact.name) {
      contact.name = customerName;
    }
    contact.unreadCount = (contact.unreadCount || 0) + 1;
    contact.status = "open";
    await contact.save();
  }

  // Save inbound message
  await WhatsAppMessage.create({
    contactId: contact._id,
    direction: "inbound",
    content: JSON.stringify(msgData),
    messageType: msgType,
  });

  if (msgType === "text") {
    const textBody = (msgData.text?.body || "").toLowerCase();
    if (textBody === "hi" || textBody === "hello") {
      contact.currentPage = 1;
      await contact.save();
      const response = await sendWelcomeTemplate(phoneNumber);
      await saveOutboundMessage(contact._id, "Sent Welcome Template", "template", response?.messages?.[0]?.id);
    } else if (textBody === "test") {
      const response = await sendLimitReachedTemplate(phoneNumber);
      await saveOutboundMessage(contact._id, "Sent limit reached template", "template", response?.messages?.[0]?.id);
    } else if (textBody === "test2") {
      const response = await sendTextMessage(phoneNumber, "આ એક સાદો ટેસ્ટ મેસેજ છે. જો આ મેસેજ આવે તો સમજવું કે ફ્રી-ફોર્મ મેસેજ જાય છે પણ ટેમ્પલેટ નથી જતા.");
      await saveOutboundMessage(contact._id, "Sent text message", "text", response?.messages?.[0]?.id);
    }
  } else if (msgType === "interactive") {
    const interactiveData = msgData.interactive || {};
    if (interactiveData.type === "list_reply") {
      const listId = interactiveData.list_reply?.id || "";
      if (listId.startsWith("more_")) {
        const page = parseInt(listId.split("_")[1], 10);
        if (!isNaN(page)) {
          const services = await WhatsAppBotService.find().sort({ order: 1 });
          const response = await sendServicesList(phoneNumber, services, page);
          await saveOutboundMessage(contact._id, `Sent services list page ${page}`, "interactive", response?.messages?.[0]?.id);
        }
      } else {
        const service = await WhatsAppBotService.findById(listId);
        if (service) {
          await handleServiceRequest(contact, phoneNumber, service);
        }
      }
    } else if (interactiveData.type === "button_reply") {
      const buttonTitle = (interactiveData.button_reply?.title || "").trim();
      if (buttonTitle === "વધુ સેવાઓ જુઓ (More)") {
        const services = await WhatsAppBotService.find().sort({ order: 1 });
        const response = await sendServicesList(phoneNumber, services, 1);
        await saveOutboundMessage(contact._id, "Sent services list page 1", "interactive", response?.messages?.[0]?.id);
      } else {
        const service = await WhatsAppBotService.findOne({ title: buttonTitle });
        if (service) {
          await handleServiceRequest(contact, phoneNumber, service);
        } else {
          const response = await sendTextMessage(phoneNumber, "Service not found. Please try again.");
          await saveOutboundMessage(contact._id, "Service not found. Please try again.", "text", response?.messages?.[0]?.id);
        }
      }
    }
  } else if (msgType === "button") {
    const buttonTitle = (msgData.button?.text || "").trim();
    if (buttonTitle === "વધુ સેવાઓ જુઓ (More)") {
        if (contact.currentPage === 1) {
          contact.currentPage = 2;
          await contact.save();
          const response = await sendTemplate(phoneNumber, "services_2");
          await saveOutboundMessage(contact._id, "Sent services_2", "template", response?.messages?.[0]?.id);
        } else if (contact.currentPage === 2) {
          contact.currentPage = 3;
          await contact.save();
          const response = await sendTemplate(phoneNumber, "services_3");
          await saveOutboundMessage(contact._id, "Sent services_3", "template", response?.messages?.[0]?.id);
        } else {
          contact.currentPage = 1;
          await contact.save();
          const response = await sendTemplate(phoneNumber, "welcome_services");
          await saveOutboundMessage(contact._id, "Sent welcome_services", "template", response?.messages?.[0]?.id);
        }
    } else {
        const service = await WhatsAppBotService.findOne({ title: buttonTitle });
        if (service) {
          await handleServiceRequest(contact, phoneNumber, service);
        } else {
          const response = await sendTextMessage(phoneNumber, "Service not found. Please try again.");
          await saveOutboundMessage(contact._id, "Service not found. Please try again.", "text", response?.messages?.[0]?.id);
        }
    }
  }
};

const handleServiceRequest = async (contact: any, phoneNumber: string, serviceDetails: any) => {
  if (!serviceDetails) {
    const response = await sendTextMessage(phoneNumber, "Service not found.");
    await saveOutboundMessage(contact._id, "Service not found.", "text", response?.messages?.[0]?.id);
    return;
  }

  const timeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (contact.lastServiceViewedAt && contact.lastServiceViewedAt >= timeThreshold) {
    const response = await sendLimitReachedTemplate(phoneNumber);
    await saveOutboundMessage(contact._id, "Sent Limit Reached Template", "template", response?.messages?.[0]?.id);
  } else {
    const response = await sendServiceDetailsTemplate(phoneNumber, serviceDetails);
    contact.lastServiceViewedAt = new Date();
    await contact.save();
    await saveOutboundMessage(contact._id, `Sent Service Details Template for ${serviceDetails.title}`, "template", response?.messages?.[0]?.id);
  }
};

const saveOutboundMessage = async (contactId: any, content: string, messageType: string, wamId?: string) => {
  await WhatsAppMessage.create({
    contactId,
    direction: "outbound",
    content,
    messageType,
    wamId,
    status: wamId ? "sent" : undefined
  });
};

// CRM APIs

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const totalUsers = await WhatsAppContact.countDocuments();
    const totalInbound = await WhatsAppMessage.countDocuments({ direction: "inbound" });
    const totalOutbound = await WhatsAppMessage.countDocuments({ direction: "outbound" });

    const topServicesRaw = await WhatsAppMessage.aggregate([
      {
        $match: {
          direction: "outbound",
          messageType: "template",
          content: { $regex: /^Sent Service Details Template for /i },
        },
      },
      {
        $group: {
          _id: "$content",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    const topServices = topServicesRaw.map((s) => ({
      title: s._id.replace(/Sent Service Details Template for /i, "").trim(),
      count: s.count,
    }));

    const recentRequestsRaw = await WhatsAppMessage.aggregate([
      {
        $match: {
          direction: "outbound",
          messageType: "template",
          content: { $regex: /^Sent Service Details Template for /i },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $limit: 50,
      },
      {
        $lookup: {
          from: "whatsappcontacts",
          localField: "contactId",
          foreignField: "_id",
          as: "contact",
        },
      },
      {
        $unwind: "$contact",
      },
    ]);

    const recentServiceRequests = recentRequestsRaw.map((msg) => ({
      userName: msg.contact.name || "Unknown",
      phoneNumber: msg.contact.phoneNumber,
      serviceTitle: msg.content.replace(/Sent Service Details Template for /i, "").trim(),
      timestamp: msg.createdAt,
    }));

    res.json({
      totalUsers,
      totalMessages: totalInbound + totalOutbound,
      totalInbound,
      totalOutbound,
      topServices,
      recentServiceRequests,
    });
  } catch (error) {
    console.error("Failed to fetch analytics", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

export const getAllContacts = async (req: Request, res: Response) => {
  try {
    const contacts = await WhatsAppContact.find().sort({ updatedAt: -1 }).lean();
    const data = await Promise.all(
      contacts.map(async (contact) => {
        const messages = await WhatsAppMessage.find({ contactId: contact._id })
          .sort({ createdAt: 1 })
          .lean();
        return {
          ...contact,
          messages,
        };
      })
    );
    res.json(data);
  } catch (error) {
    console.error("Failed to fetch contacts", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
};

export const sendManualMessage = async (req: Request, res: Response) => {
  try {
    const { contactId, text } = req.body;
    const contact = await WhatsAppContact.findById(contactId);
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const response = await sendTextMessage(contact.phoneNumber, text);
    const wamId = response?.messages?.[0]?.id;
    
    // Save to DB
    const newMessage = await WhatsAppMessage.create({
      contactId: contact._id,
      direction: "outbound",
      content: text,
      messageType: "text",
      wamId,
      status: wamId ? "sent" : undefined
    });

    res.json(newMessage);
  } catch (error: any) {
    console.error("Failed to send message", error);
    const errorMsg = error?.message || error?.error_user_msg || error?.error?.message || "Failed to send message";
    res.status(500).json({ error: errorMsg });
  }
};

// Bot Services CRUD APIs

export const reorderBotServices = async (req: Request, res: Response) => {
  try {
    const { orderedIds } = req.body;
    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds array is required" });
    }

    const bulkOps: any[] = orderedIds.map((id: string, index: number) => ({
      updateOne: {
        filter: { _id: id },
        update: { order: index + 1 },
      },
    }));

    await WhatsAppBotService.bulkWrite(bulkOps);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder services", error);
    res.status(500).json({ error: "Failed to reorder services" });
  }
};

export const getBotServices = async (req: Request, res: Response) => {
  try {
    const services = await WhatsAppBotService.find().sort({ order: 1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bot services" });
  }
};

export const createBotService = async (req: Request, res: Response) => {
  try {
    let { order } = req.body;
    
    // If order is not provided or <= 0, put it at the end
    if (order === undefined || order <= 0) {
      const lastService = await WhatsAppBotService.findOne().sort({ order: -1 });
      order = lastService && typeof lastService.order === 'number' ? lastService.order + 1 : 1;
      req.body.order = order;
    } else {
      // Shift others down to make room
      await WhatsAppBotService.updateMany(
        { order: { $gte: order } },
        { $inc: { order: 1 } }
      );
    }

    const service = new WhatsAppBotService(req.body);
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: "Failed to create bot service" });
  }
};

export const updateBotService = async (req: Request, res: Response) => {
  try {
    const { order } = req.body;
    const serviceId = req.params.id;

    const oldService = await WhatsAppBotService.findById(serviceId);
    if (!oldService) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Auto re-order if the order changed
    if (order !== undefined && oldService.order !== order) {
      if (order < oldService.order) {
        // Moving up (e.g. 5 to 2), shift items 2,3,4 down (+1)
        await WhatsAppBotService.updateMany(
          { order: { $gte: order, $lt: oldService.order } },
          { $inc: { order: 1 } }
        );
      } else if (order > oldService.order) {
        // Moving down (e.g. 2 to 5), shift items 3,4,5 up (-1)
        await WhatsAppBotService.updateMany(
          { order: { $gt: oldService.order, $lte: order } },
          { $inc: { order: -1 } }
        );
      }
    }

    const service = await WhatsAppBotService.findByIdAndUpdate(serviceId, req.body, { new: true });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: "Failed to update bot service" });
  }
};

export const deleteBotService = async (req: Request, res: Response) => {
  try {
    await WhatsAppBotService.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete bot service" });
  }
};

// CRM Features APIs

export const updateContact = async (req: Request, res: Response) => {
  try {
    const { status, tags, notes, unreadCount, name, phoneNumber } = req.body;
    const contactId = req.params.id;

    // Build update object dynamically to only update provided fields
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (tags !== undefined) updateData.tags = tags;
    if (notes !== undefined) updateData.notes = notes;
    if (unreadCount !== undefined) updateData.unreadCount = unreadCount;
    if (name !== undefined) updateData.name = name;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    const contact = await WhatsAppContact.findByIdAndUpdate(
      contactId,
      { $set: updateData },
      { new: true }
    );
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: "Failed to update contact" });
  }
};

export const createContact = async (req: Request, res: Response) => {
  try {
    const { name, phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: "Phone number is required" });
    
    // Sanitize phone number (remove +, spaces, hyphens)
    const sanitizedPhone = phoneNumber.replace(/[^0-9]/g, '');
    
    // Check if exists
    let contact = await WhatsAppContact.findOne({ phoneNumber: sanitizedPhone });
    if (contact) return res.status(400).json({ error: "Contact already exists" });

    contact = new WhatsAppContact({
      phoneNumber: sanitizedPhone,
      name,
      currentPage: 1,
      status: "open",
      unreadCount: 0
    });
    await contact.save();
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: "Failed to create contact" });
  }
};

export const deleteContact = async (req: Request, res: Response) => {
  try {
    const contactId = req.params.id;
    await WhatsAppContact.findByIdAndDelete(contactId);
    await WhatsAppMessage.deleteMany({ contactId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete contact" });
  }
};

import WhatsAppQuickReply from "../models/WhatsAppQuickReply";

export const getQuickReplies = async (req: Request, res: Response) => {
  try {
    const replies = await WhatsAppQuickReply.find().sort({ createdAt: -1 });
    res.json(replies);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch quick replies" });
  }
};

export const createQuickReply = async (req: Request, res: Response) => {
  try {
    const reply = new WhatsAppQuickReply(req.body);
    await reply.save();
    res.status(201).json(reply);
  } catch (error) {
    res.status(500).json({ error: "Failed to create quick reply" });
  }
};

export const deleteQuickReply = async (req: Request, res: Response) => {
  try {
    await WhatsAppQuickReply.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete quick reply" });
  }
};
