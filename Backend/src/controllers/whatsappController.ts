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
  getMetaTemplates,
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
    const io = getIo();
    if (io) {
      io.emit("whatsapp_message_status", { wamId, status });
    }
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
  let isNewContact = false;
  if (!contact) {
    contact = new WhatsAppContact({ 
      phoneNumber, 
      name: customerName, 
      currentPage: 1,
      status: "open",
      unreadCount: 1
    });
    await contact.save();
    isNewContact = true;
  } else {
    if (customerName && !contact.name) {
      contact.name = customerName;
    }
    contact.unreadCount = (contact.unreadCount || 0) + 1;
    contact.status = "open";
    await contact.save();
  }

  // Save inbound message
  const newMsg = await WhatsAppMessage.create({
    contactId: contact._id,
    direction: "inbound",
    content: JSON.stringify(msgData),
    messageType: msgType,
  });

  const io = getIo();
  if (io) {
    io.emit("whatsapp_new_message", { contactId: contact._id, message: newMsg });
  }

  if (isNewContact) {
    const response = await sendWelcomeTemplate(phoneNumber);
    await saveOutboundMessage(contact._id, "Sent Welcome Template", "template", response?.messages?.[0]?.id);
    return;
  }

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
  const dailyLimit = contact.dailyServiceLimit !== undefined ? contact.dailyServiceLimit : 2;
  
  if (dailyLimit > 0) {
    if (!contact.lastServiceViewedAt || contact.lastServiceViewedAt < timeThreshold) {
      contact.servicesRequestedToday = 0;
    }

    if ((contact.servicesRequestedToday || 0) >= dailyLimit) {
      const response = await sendLimitReachedTemplate(phoneNumber);
      await saveOutboundMessage(contact._id, "Sent Limit Reached Template", "template", response?.messages?.[0]?.id);
      return;
    }
  }

  const response = await sendServiceDetailsTemplate(phoneNumber, serviceDetails);
  contact.lastServiceViewedAt = new Date();
  contact.servicesRequestedToday = (contact.servicesRequestedToday || 0) + 1;
  await contact.save();
  await saveOutboundMessage(contact._id, `Sent Service Details Template for ${serviceDetails.title}`, "template", response?.messages?.[0]?.id);
};

const saveOutboundMessage = async (contactId: any, content: string, messageType: string, wamId?: string) => {
  const newMsg = await WhatsAppMessage.create({
    contactId,
    direction: "outbound",
    content,
    messageType,
    wamId,
    status: wamId ? "sent" : undefined
  });
  
  const io = getIo();
  if (io) {
    io.emit("whatsapp_new_message", { contactId, message: newMsg });
  }
};

// CRM APIs

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const { range } = req.query;
    let dateFilter: any = {};
    let startDate = new Date(0); // Epoch as default for all_time
    
    if (range && range !== "all_time") {
      const now = new Date();
      startDate = new Date();
      if (range === "today") {
        startDate.setHours(0, 0, 0, 0);
      } else if (range === "last_7_days") {
        startDate.setDate(now.getDate() - 7);
      } else if (range === "this_month") {
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
      }
      dateFilter.createdAt = { $gte: startDate };
    }

    const engagementPromise = (async () => {
      if (range === "all_time" || !range) {
        const contactMessageCounts = await WhatsAppMessage.aggregate([
          { $match: { direction: "inbound" } },
          { $group: { _id: "$contactId", count: { $sum: 1 } } }
        ]);
        const returning = contactMessageCounts.filter(c => c.count > 1).length;
        const newUsers = contactMessageCounts.filter(c => c.count === 1).length;
        return { returning, newUsers };
      } else {
        const usersInPeriod = await WhatsAppMessage.distinct("contactId", { ...dateFilter, direction: "inbound" });
        const allContacts = await WhatsAppContact.find({ _id: { $in: usersInPeriod } });
        let returning = 0, newUsers = 0;
        allContacts.forEach(c => {
          if (c.createdAt && new Date(c.createdAt) >= startDate) newUsers++;
          else returning++;
        });
        return { returning, newUsers };
      }
    })();

    const [
      totalUsers,
      totalInbound,
      totalOutbound,
      engagement,
      timelineRaw,
      actualServices,
      allServicesRaw,
      recentRequestsRaw
    ] = await Promise.all([
      WhatsAppContact.countDocuments(dateFilter),
      WhatsAppMessage.countDocuments({ ...dateFilter, direction: "inbound" }),
      WhatsAppMessage.countDocuments({ ...dateFilter, direction: "outbound" }),
      engagementPromise,
      WhatsAppMessage.aggregate([
        { $match: Object.keys(dateFilter).length > 0 ? dateFilter : {} },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            messages: { $sum: 1 },
            inbound: { $sum: { $cond: [{ $eq: ["$direction", "inbound"] }, 1, 0] } },
            outbound: { $sum: { $cond: [{ $eq: ["$direction", "outbound"] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      WhatsAppBotService.find(),
      WhatsAppMessage.aggregate([
        {
          $match: {
            ...dateFilter,
            direction: "outbound",
            messageType: "template",
            content: { $regex: /^Sent Service Details Template for /i },
          },
        },
        {
          $group: {
            _id: "$content",
            count: { $sum: 1 },
            contactIds: { $addToSet: "$contactId" },
          },
        },
        {
          $lookup: {
            from: "whatsappcontacts",
            localField: "contactIds",
            foreignField: "_id",
            as: "contacts",
          },
        }
      ]),
      WhatsAppMessage.aggregate([
        {
          $match: {
            ...dateFilter,
            direction: "outbound",
            messageType: "template",
            content: { $regex: /^Sent Service Details Template for /i },
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 50 },
        {
          $lookup: {
            from: "whatsappcontacts",
            localField: "contactId",
            foreignField: "_id",
            as: "contact",
          },
        },
        { $unwind: "$contact" },
      ])
    ]);

    const activityTimeline = timelineRaw.map(t => ({
      date: t._id,
      messages: t.messages,
      inbound: t.inbound,
      outbound: t.outbound
    }));

    const servicesMap = new Map();
    actualServices.forEach(s => {
      servicesMap.set(s.title.toLowerCase().trim(), {
        title: s.title,
        count: 0,
        contacts: []
      });
    });

    allServicesRaw.forEach((s) => {
      const parsedTitle = s._id.replace(/Sent Service Details Template for /i, "").trim();
      const lowerTitle = parsedTitle.toLowerCase();
      const mappedContacts = s.contacts.map((c: any) => ({ name: c.name, phoneNumber: c.phoneNumber }));

      if (servicesMap.has(lowerTitle)) {
        const item = servicesMap.get(lowerTitle);
        item.count += s.count;
        item.contacts.push(...mappedContacts);
      } else {
        servicesMap.set(lowerTitle, {
          title: parsedTitle,
          count: s.count,
          contacts: mappedContacts
        });
      }
    });

    const allServices = Array.from(servicesMap.values()).sort((a: any, b: any) => b.count - a.count);

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
      returningUsersCount: engagement.returning,
      newUsersCount: engagement.newUsers,
      activityTimeline,
      allServices,
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
    
    // Fix N+1 query problem: fetch all messages for these contacts in one query
    const contactIds = contacts.map(c => c._id);
    const allMessages = await WhatsAppMessage.find({ contactId: { $in: contactIds } })
      .sort({ createdAt: 1 })
      .lean();
      
    // Group messages by contactId
    const messagesByContact = new Map();
    allMessages.forEach(msg => {
      const cid = msg.contactId.toString();
      if (!messagesByContact.has(cid)) messagesByContact.set(cid, []);
      messagesByContact.get(cid).push(msg);
    });

    const data = contacts.map(contact => ({
      ...contact,
      messages: messagesByContact.get(contact._id.toString()) || []
    }));

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

    const io = getIo();
    if (io) {
      io.emit("whatsapp_new_message", { contactId: contact._id, message: newMessage });
    }

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
    const { status, tags, notes, unreadCount, name, phoneNumber, dailyServiceLimit } = req.body;
    const contactId = req.params.id;

    // Build update object dynamically to only update provided fields
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (tags !== undefined) updateData.tags = tags;
    if (notes !== undefined) updateData.notes = notes;
    if (unreadCount !== undefined) updateData.unreadCount = unreadCount;
    if (name !== undefined) updateData.name = name;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (dailyServiceLimit !== undefined) updateData.dailyServiceLimit = dailyServiceLimit;

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

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const data = await getMetaTemplates();
    res.json(data);
  } catch (error) {
    console.error("Failed to fetch meta templates", error);
    res.status(500).json({ error: "Failed to fetch meta templates" });
  }
};

export const sendTemplateManual = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, templateName, language, variables, contactId } = req.body;
    
    let components: any[] = [];
    if (variables && variables.length > 0) {
      components = [
        {
          type: "body",
          parameters: variables.map((v: string) => ({ type: "text", text: String(v) })),
        },
      ];
    } else if (templateName === "service_details") {
      // Fallback for backward compatibility if frontend doesn't send variables
      components = [
        {
          type: "body",
          parameters: [
            { type: "text", text: "તમારી પસંદ કરેલી સેવા" },
            { type: "text", text: "જરૂરી દસ્તાવેજોની યાદી" },
          ],
        },
      ];
    }
    
    const response = await sendTemplate(phoneNumber, templateName, language, components);
    
    let contentStr = `Sent template: ${templateName}`;
    if (templateName === "service_details" && variables && variables[0]) {
      contentStr = `Sent Service Details Template for ${variables[0]}`;
    }
    
    await saveOutboundMessage(
      contactId, 
      contentStr, 
      "template", 
      response?.messages?.[0]?.id
    );
    
    res.json({ success: true, messageId: response?.messages?.[0]?.id });
  } catch (error: any) {
    console.error("Failed to send template manually", error);
    res.status(500).json({ error: error.message || "Failed to send template manually" });
  }
};
