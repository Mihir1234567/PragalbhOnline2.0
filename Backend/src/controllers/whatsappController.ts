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
        }
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).send("Server Error");
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
    contact = new WhatsAppContact({ phoneNumber, name: customerName, currentPage: 1 });
    await contact.save();
  } else if (customerName && !contact.name) {
    contact.name = customerName;
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
      await sendWelcomeTemplate(phoneNumber);
      await saveOutboundMessage(contact._id, "Sent Welcome Template", "template");
    } else if (textBody === "test") {
      await sendLimitReachedTemplate(phoneNumber);
      await saveOutboundMessage(contact._id, "Sent limit reached template", "template");
    } else if (textBody === "test2") {
      await sendTextMessage(phoneNumber, "આ એક સાદો ટેસ્ટ મેસેજ છે. જો આ મેસેજ આવે તો સમજવું કે ફ્રી-ફોર્મ મેસેજ જાય છે પણ ટેમ્પલેટ નથી જતા.");
      await saveOutboundMessage(contact._id, "Sent text message", "text");
    }
  } else if (msgType === "interactive") {
    const interactiveData = msgData.interactive || {};
    if (interactiveData.type === "list_reply") {
      const listId = interactiveData.list_reply?.id || "";
      if (listId.startsWith("more_")) {
        const page = parseInt(listId.split("_")[1], 10);
        if (!isNaN(page)) {
          const services = await WhatsAppBotService.find().sort({ order: 1 });
          await sendServicesList(phoneNumber, services, page);
          await saveOutboundMessage(contact._id, `Sent services list page ${page}`, "interactive");
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
        if (contact.currentPage === 1) {
          contact.currentPage = 2;
          await contact.save();
          await sendTemplate(phoneNumber, "services_2");
          await saveOutboundMessage(contact._id, "Sent services_2", "template");
        } else if (contact.currentPage === 2) {
          contact.currentPage = 3;
          await contact.save();
          await sendTemplate(phoneNumber, "services_3");
          await saveOutboundMessage(contact._id, "Sent services_3", "template");
        } else {
          contact.currentPage = 1;
          await contact.save();
          await sendTemplate(phoneNumber, "welcome_services");
          await saveOutboundMessage(contact._id, "Sent welcome_services", "template");
        }
      } else {
        const service = await WhatsAppBotService.findOne({ title: buttonTitle });
        if (service) {
          await handleServiceRequest(contact, phoneNumber, service);
        } else {
          await sendTextMessage(phoneNumber, "Service not found. Please try again.");
          await saveOutboundMessage(contact._id, "Service not found. Please try again.", "text");
        }
      }
    }
  } else if (msgType === "button") {
    const buttonTitle = (msgData.button?.text || "").trim();
    if (buttonTitle === "વધુ સેવાઓ જુઓ (More)") {
        if (contact.currentPage === 1) {
          contact.currentPage = 2;
          await contact.save();
          await sendTemplate(phoneNumber, "services_2");
          await saveOutboundMessage(contact._id, "Sent services_2", "template");
        } else if (contact.currentPage === 2) {
          contact.currentPage = 3;
          await contact.save();
          await sendTemplate(phoneNumber, "services_3");
          await saveOutboundMessage(contact._id, "Sent services_3", "template");
        } else {
          contact.currentPage = 1;
          await contact.save();
          await sendTemplate(phoneNumber, "welcome_services");
          await saveOutboundMessage(contact._id, "Sent welcome_services", "template");
        }
    } else {
        const service = await WhatsAppBotService.findOne({ title: buttonTitle });
        if (service) {
          await handleServiceRequest(contact, phoneNumber, service);
        } else {
          await sendTextMessage(phoneNumber, "Service not found. Please try again.");
          await saveOutboundMessage(contact._id, "Service not found. Please try again.", "text");
        }
    }
  }
};

const handleServiceRequest = async (contact: any, phoneNumber: string, serviceDetails: any) => {
  if (!serviceDetails) {
    await sendTextMessage(phoneNumber, "Service not found.");
    await saveOutboundMessage(contact._id, "Service not found.", "text");
    return;
  }

  const timeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (contact.lastServiceViewedAt && contact.lastServiceViewedAt >= timeThreshold) {
    await sendLimitReachedTemplate(phoneNumber);
    await saveOutboundMessage(contact._id, "Sent Limit Reached Template", "template");
  } else {
    await sendServiceDetailsTemplate(phoneNumber, serviceDetails);
    contact.lastServiceViewedAt = new Date();
    await contact.save();
    await saveOutboundMessage(contact._id, `Sent Service Details Template for ${serviceDetails.title}`, "template");
  }
};

const saveOutboundMessage = async (contactId: any, content: string, messageType: string) => {
  await WhatsAppMessage.create({
    contactId,
    direction: "outbound",
    content,
    messageType,
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

    res.json({
      totalUsers,
      totalMessages: totalInbound + totalOutbound,
      totalInbound,
      totalOutbound,
      topServices,
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

    await sendTextMessage(contact.phoneNumber, text);
    
    // Save to DB
    const newMessage = await WhatsAppMessage.create({
      contactId: contact._id,
      direction: "outbound",
      content: text,
      messageType: "text",
    });

    res.json(newMessage);
  } catch (error) {
    console.error("Failed to send message", error);
    res.status(500).json({ error: "Failed to send message" });
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
