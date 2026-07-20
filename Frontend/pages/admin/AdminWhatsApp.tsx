import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, User, Clock, Phone, Settings, Plus, Edit2, Trash2, X, GripVertical, Save } from "lucide-react";
import { Reorder } from "framer-motion";
import api from "../../lib/client";

interface WhatsAppMessage {
  _id: string;
  direction: "inbound" | "outbound";
  content: string;
  messageType: string;
  createdAt: string;
}

interface WhatsAppContact {
  _id: string;
  phoneNumber: string;
  name?: string;
  lastServiceViewedAt?: string;
  messages: WhatsAppMessage[];
}

interface BotService {
  _id: string;
  title: string;
  documents: string[];
  order: number;
}

interface WhatsAppAnalytics {
  totalUsers: number;
  totalMessages: number;
  totalInbound: number;
  totalOutbound: number;
  topServices: { title: string; count: number }[];
}

const AdminWhatsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"chats" | "services" | "analytics">(() => {
    return (localStorage.getItem("whatsappActiveTab") as "chats" | "services" | "analytics") || "chats";
  });

  useEffect(() => {
    localStorage.setItem("whatsappActiveTab", activeTab);
  }, [activeTab]);

  // Chat State
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Services State
  const [services, setServices] = useState<BotService[]>([]);
  const [isEditingService, setIsEditingService] = useState<string | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({ title: "", documents: "", order: 0 });
  const [isReordering, setIsReordering] = useState(false);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);

  // Analytics State
  const [analytics, setAnalytics] = useState<WhatsAppAnalytics | null>(null);

  const fetchData = async () => {
    try {
      const [contactsRes, servicesRes, analyticsRes] = await Promise.all([
        api.get("/whatsapp/contacts"),
        api.get("/whatsapp/services"),
        api.get("/whatsapp/analytics"),
      ]);
      setContacts(contactsRes.data);
      setServices(servicesRes.data);
      setAnalytics(analyticsRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch WhatsApp data", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    let interval: any;
    if (activeTab === "chats") {
      interval = setInterval(fetchData, 10000); // Poll every 10s only in chats
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab]);

  const activeContact = contacts.find((c) => c._id === activeContactId);

  useEffect(() => {
    if (activeTab === "chats") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeContact?.messages, activeTab]);

  // Chat Handlers
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContactId) return;

    try {
      const { data } = await api.post("/whatsapp/send", {
        contactId: activeContactId,
        text: inputText,
      });
      
      setContacts((prev) =>
        prev.map((c) => {
          if (c._id === activeContactId) {
            return {
              ...c,
              messages: [...c.messages, data],
            };
          }
          return c;
        })
      );
      setInputText("");
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  const renderMessageContent = (msg: WhatsAppMessage) => {
    if (msg.messageType === "text" && msg.direction === "outbound") {
       return msg.content;
    }
    try {
      const parsed = JSON.parse(msg.content);
      if (parsed.text?.body) return parsed.text.body;
      if (parsed.button?.text) return `[Button Clicked]: ${parsed.button.text}`;
      if (parsed.interactive?.list_reply?.title) return `[List Selection]: ${parsed.interactive.list_reply.title}`;
      if (parsed.interactive?.button_reply?.title) return `[Button Selection]: ${parsed.interactive.button_reply.title}`;
    } catch (e) {}
    return msg.content;
  };

  // Services Handlers
  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: serviceForm.title,
      documents: typeof serviceForm.documents === 'string' ? serviceForm.documents.split("\n").filter(d => d.trim() !== "") : serviceForm.documents,
      order: serviceForm.order,
    };

    try {
      if (isEditingService) {
        await api.put(`/whatsapp/services/${isEditingService}`, payload);
      } else {
        await api.post("/whatsapp/services", payload);
      }
      setShowServiceForm(false);
      setIsEditingService(null);
      fetchData();
    } catch (error) {
      console.error("Failed to save service", error);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this bot service?")) {
      try {
        await api.delete(`/whatsapp/services/${id}`);
        fetchData();
      } catch (error) {
        console.error("Failed to delete service", error);
      }
    }
  };

  const handleSaveOrder = async () => {
    try {
      const orderedIds = services.map((s) => s._id);
      await api.put("/whatsapp/services/reorder", { orderedIds });
      setHasUnsavedOrder(false);
      setIsReordering(false);
      fetchData();
    } catch (error) {
      console.error("Failed to save order", error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900 -mx-6 -mt-6">
      
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 px-6 pt-2 gap-4">
        <button
          onClick={() => setActiveTab("chats")}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "chats"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <MessageSquare size={18} />
          Chats
        </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === "services"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <Settings size={18} />
            Bot Services Data
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === "analytics"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <div className="flex gap-0.5 items-end h-4 w-4 overflow-hidden">
                <div className="w-1 bg-current h-2"></div>
                <div className="w-1 bg-current h-3"></div>
                <div className="w-1 bg-current h-4"></div>
            </div>
            Analytics
          </button>
      </div>

      {activeTab === "chats" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar / Contact List */}
          <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto">
            <div className="flex-1">
              {contacts.map((contact) => (
                <div
                  key={contact._id}
                  onClick={() => setActiveContactId(contact._id)}
                  className={`p-4 border-b border-slate-100 dark:border-slate-800/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    activeContactId === contact._id ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500" : "border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {contact.name || contact.phoneNumber}
                    </span>
                    {contact.messages.length > 0 && (
                      <span className="text-xs text-slate-400">
                        {new Date(contact.messages[contact.messages.length - 1].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Phone size={12} /> {contact.phoneNumber}
                  </div>
                </div>
              ))}
              {contacts.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No conversations found.
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50">
            {activeContact ? (
              <>
                <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-6 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">
                        {activeContact.name || activeContact.phoneNumber}
                      </h3>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone size={12} /> {activeContact.phoneNumber}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {activeContact.messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`flex ${
                        msg.direction === "outbound" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                          msg.direction === "outbound"
                            ? "bg-indigo-600 text-white rounded-tr-none"
                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {renderMessageContent(msg)}
                        </p>
                        <div
                          className={`text-[10px] mt-2 flex items-center gap-1 ${
                            msg.direction === "outbound"
                              ? "text-indigo-200"
                              : "text-slate-400"
                          }`}
                        >
                          <Clock size={10} />
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-6 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shrink-0"
                    >
                      <Send size={18} className="ml-1" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <MessageSquare size={48} className="mb-4 opacity-20" />
                <p className="text-lg">Select a conversation to start chatting</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "services" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Bot Services Management</h2>
            <div className="flex gap-3">
              {hasUnsavedOrder && (
                <button
                  onClick={handleSaveOrder}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                  <Save size={18} />
                  Save Order
                </button>
              )}
              <button
                onClick={() => setIsReordering(!isReordering)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${
                  isReordering
                    ? "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <GripVertical size={18} />
                {isReordering ? "Done Reordering" : "Reorder Services"}
              </button>
              <button
                onClick={() => {
                  setServiceForm({ title: "", documents: "", order: 0 });
                  setIsEditingService(null);
                  setShowServiceForm(true);
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                <Plus size={18} />
                Add Service
              </button>
            </div>
          </div>

          {isReordering ? (
            <div className="max-w-3xl mx-auto">
              <div className="mb-4 text-sm text-slate-500 dark:text-slate-400 bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800 flex items-center gap-2">
                <GripVertical size={16} className="text-indigo-500" />
                Drag and drop the services to reorder them, then click "Save Order".
              </div>
              <Reorder.Group
                axis="y"
                values={services}
                onReorder={(newOrder) => {
                  setServices(newOrder);
                  setHasUnsavedOrder(true);
                }}
                className="space-y-3"
              >
                {services.map((service, index) => (
                  <Reorder.Item
                    key={service._id}
                    value={service}
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4 cursor-grab active:cursor-grabbing hover:border-indigo-300 transition-colors"
                  >
                    <GripVertical className="text-slate-400 shrink-0" />
                    <div className="flex-1 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 dark:text-white text-lg">{service.title}</h3>
                      <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm px-3 py-1 rounded-full font-medium">
                        New Order: {index + 1}
                      </span>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div key={service._id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">{service.title}</h3>
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded-md font-medium">
                      Order: {service.order}
                    </span>
                  </div>
                  <div className="flex-1 mb-4">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Required Documents:</p>
                    <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                      {service.documents.map((doc, idx) => (
                        <li key={idx} className="truncate" title={doc}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => {
                        setServiceForm({
                          title: service.title,
                          documents: service.documents.join("\n"),
                          order: service.order,
                        });
                        setIsEditingService(service._id);
                        setShowServiceForm(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors font-medium text-sm"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteService(service._id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors font-medium text-sm"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Service Modal */}
          {showServiceForm && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                    {isEditingService ? "Edit Service" : "Add New Service"}
                  </h3>
                  <button
                    onClick={() => setShowServiceForm(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto">
                  <form onSubmit={handleServiceSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Service Title (Max 24 chars for WhatsApp Lists)
                      </label>
                      <input
                        type="text"
                        maxLength={24}
                        required
                        value={serviceForm.title}
                        onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                        placeholder="e.g. આવક નો દાખલો"
                      />
                      <p className="text-xs text-slate-500 mt-1">{serviceForm.title.length}/24 characters</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Order Number (Position in list)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={serviceForm.order || ""}
                        onChange={(e) => setServiceForm({ ...serviceForm, order: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Required Documents (One per line)
                      </label>
                      <textarea
                        required
                        rows={6}
                        value={serviceForm.documents}
                        onChange={(e) => setServiceForm({ ...serviceForm, documents: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white resize-none"
                        placeholder="Enter each required document on a new line"
                      />
                    </div>
                  </form>
                </div>
                <div className="p-4 lg:p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 shrink-0 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => setShowServiceForm(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    onClick={handleServiceSubmit}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-sm"
                  >
                    {isEditingService ? "Save Changes" : "Create Service"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default AdminWhatsApp;
