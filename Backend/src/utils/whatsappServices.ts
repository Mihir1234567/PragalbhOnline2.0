import axios from "axios";

const getToken = () => process.env.ACCESS_TOKEN;
const getPhoneId = () => process.env.PHONE_NUMBER_ID;
const getWabaId = () => process.env.WABA_ID;

export const getMetaTemplates = async () => {
  const url = `https://graph.facebook.com/v20.0/${getWabaId()}/message_templates`;
  try {
    const { data } = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return data;
  } catch (error: any) {
    console.error("Meta API Templates Error:", error?.response?.data || error.message);
    throw error?.response?.data || error;
  }
};

export const sendWhatsAppMessage = async (phoneNumber: string, payload: any) => {
  const url = `https://graph.facebook.com/v17.0/${getPhoneId()}/messages`;
  try {
    const { data } = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
    });
    return data;
  } catch (error: any) {
    console.error("Meta API Error:", error?.response?.data || error.message);
    throw error?.response?.data || error;
  }
};

export const sendTemplate = async (phoneNumber: string, templateName: string, language?: string, components?: any[]) => {
  const langCode = language || (["services_2", "services_3"].includes(templateName) ? "en" : "gu");
  const payload = {
    messaging_product: "whatsapp",
    to: phoneNumber,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: langCode,
      },
      ...(components && components.length > 0 ? { components } : {})
    },
  };
  return sendWhatsAppMessage(phoneNumber, payload);
};

export const sendWelcomeTemplate = (phoneNumber: string) => {
  return sendTemplate(phoneNumber, "welcome_message_utility");
};

export const sendLimitReachedTemplate = (phoneNumber: string) => {
  return sendTemplate(phoneNumber, "limit_reached");
};

export const sendServicesList = (phoneNumber: string, services: any[], page: number = 1) => {
  const itemsPerPage = 9;
  const startIdx = (page - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;

  const currentServices = services.slice(startIdx, endIdx);

  const rows = currentServices.map((service) => ({
    id: service._id.toString(),
    title: service.title.substring(0, 24),
  }));

  if (endIdx < services.length) {
    rows.push({
      id: `more_${page + 1}`,
      title: "વધુ સેવાઓ જુઓ (More)",
    });
  }

  const payload = {
    messaging_product: "whatsapp",
    to: phoneNumber,
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "સરકારી સેવાઓ",
      },
      body: {
        text: "કૃપા કરીને નીચેના લિસ્ટમાંથી એક સેવા પસંદ કરો:",
      },
      footer: {
        text: `પેજ ${page}`,
      },
      action: {
        button: "સેવાઓ જુઓ",
        sections: [
          {
            title: "ઉપલબ્ધ સેવાઓ",
            rows,
          },
        ],
      },
    },
  };
  return sendWhatsAppMessage(phoneNumber, payload);
};

export const sendServiceDetailsTemplate = (phoneNumber: string, serviceDetails: { title: string; documents: string[] }) => {
  const payload = {
    messaging_product: "whatsapp",
    to: phoneNumber,
    type: "template",
    template: {
      name: "service_details",
      language: {
        code: "gu",
      },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: serviceDetails.title || "માહિતી ઉપલબ્ધ નથી" },
            { type: "text", text: (serviceDetails.documents && serviceDetails.documents.length > 0) ? serviceDetails.documents.join(", ") : "માહિતી ઉપલબ્ધ નથી" },
          ],
        },
      ],
    },
  };
  return sendWhatsAppMessage(phoneNumber, payload);
};

export const sendTextMessage = (phoneNumber: string, text: string) => {
  const payload = {
    messaging_product: "whatsapp",
    to: phoneNumber,
    type: "text",
    text: { body: text },
  };
  return sendWhatsAppMessage(phoneNumber, payload);
};
