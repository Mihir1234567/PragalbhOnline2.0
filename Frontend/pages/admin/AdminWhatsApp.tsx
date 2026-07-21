import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, User, Users, Clock, Phone, Settings, Plus, Edit2, Trash2, X, GripVertical, Save, Zap, FileText, CheckCircle2, Check, CheckCheck, AlertCircle, Search, Filter, ArrowDownLeft, ArrowUpRight, LayoutTemplate } from "lucide-react";
import { Reorder } from "framer-motion";
import api from "../../lib/client";

interface WhatsAppMessage {
  _id: string;
  direction: "inbound" | "outbound";
  content: string;
  messageType: string;
  wamId?: string;
  status?: "sent" | "delivered" | "read" | "failed";
  createdAt: string;
}

interface WhatsAppContact {
  _id: string;
  phoneNumber: string;
  name?: string;
  lastServiceViewedAt?: string;
  dailyServiceLimit: number;
  servicesRequestedToday: number;
  status: "open" | "pending" | "resolved";
  unreadCount: number;
  tags: string[];
  notes?: string;
  messages: WhatsAppMessage[];
}

interface WhatsAppQuickReply {
  _id: string;
  title: string;
  text: string;
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
  allServices: { title: string; count: number; contacts: { name: string; phoneNumber: string }[] }[];
  recentServiceRequests: { userName: string; phoneNumber: string; serviceTitle: string; timestamp: string }[];
}

const getRequestedServices = (messages: any[]) => {
  if (!messages || messages.length === 0) return [];
  const services = new Set<string>();
  messages.forEach(m => {
    if (m.direction === 'outbound' && m.messageType === 'template' && m.content.startsWith('Sent Service Details Template for ')) {
      services.add(m.content.replace('Sent Service Details Template for ', ''));
    }
  });
  return Array.from(services);
};

const AdminWhatsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"chats" | "services" | "analytics" | "quick_replies" | "contacts">(() => {
    return (localStorage.getItem("whatsappActiveTab") as "chats" | "services" | "analytics" | "quick_replies" | "contacts") || "chats";
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

  // CRM State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "pending" | "resolved">("all");
  const [quickReplies, setQuickReplies] = useState<WhatsAppQuickReply[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [editingNotes, setEditingNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [addContactForm, setAddContactForm] = useState({ name: "", phoneNumber: "" });

  // Quick Replies State
  const [showQuickReplyForm, setShowQuickReplyForm] = useState(false);
  const [quickReplyForm, setQuickReplyForm] = useState({ title: "", text: "" });

  // Services State
  const [services, setServices] = useState<BotService[]>([]);
  const [isEditingService, setIsEditingService] = useState<string | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({ title: "", documents: "", order: 0 });
  const [isReordering, setIsReordering] = useState(false);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);

  // Templates State
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState(false);

  // Analytics State
  const [analytics, setAnalytics] = useState<WhatsAppAnalytics | null>(null);
  const [servicesSearchQuery, setServicesSearchQuery] = useState("");
  const [servicesSortBy, setServicesSortBy] = useState<"most" | "least" | "name_asc" | "name_desc">("most");

  // Contacts Tab State
  const [contactsSearchQuery, setContactsSearchQuery] = useState("");
  const [contactsStatusFilter, setContactsStatusFilter] = useState<"all" | "open" | "pending" | "resolved">("all");
  const [contactsSortBy, setContactsSortBy] = useState<"newest" | "name_asc" | "name_desc">("newest");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactForm, setEditContactForm] = useState({ name: "", phoneNumber: "", status: "open", dailyServiceLimit: 2, tags: "", notes: "" });

  const fetchData = async () => {
    try {
      const [contactsRes, servicesRes, analyticsRes, quickRepliesRes, templatesRes] = await Promise.all([
        api.get("/whatsapp/contacts"),
        api.get("/whatsapp/services"),
        api.get("/whatsapp/analytics"),
        api.get("/whatsapp/quick-replies"),
        api.get("/whatsapp/templates").catch(() => ({ data: { data: [] } })),
      ]);
      setContacts(contactsRes.data);
      setServices(servicesRes.data);
      setAnalytics(analyticsRes.data);
      setQuickReplies(quickRepliesRes.data);
      setMetaTemplates(templatesRes.data?.data || []);
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
  }, [activeContact?.messages.length, activeTab]);

  // Chat Handlers
  const handleSendTemplate = async (templateName: string) => {
    if (!activeContactId) return;
    setSendingTemplate(true);
    try {
      const contact = contacts.find(c => c._id === activeContactId);
      if (!contact) return;
      
      const res = await api.post("/whatsapp/send-template", {
        phoneNumber: contact.phoneNumber,
        templateName,
        contactId: contact._id
      });
      
      const newMsg = {
        _id: res.data.messageId || Date.now().toString(),
        direction: "outbound",
        content: `Sent template: ${templateName}`,
        messageType: "template",
        createdAt: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, newMsg]);
      setShowTemplateModal(false);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Failed to send template", error);
      alert("Failed to send template");
    } finally {
      setSendingTemplate(false);
    }
  };

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
    } catch (error: any) {
      console.error("Failed to send message", error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to send message";
      alert("Error sending message: " + (typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg));
    }
  };

  const renderMessageContent = (msg: WhatsAppMessage) => {
    if (msg.messageType === "template") {
      let tplName = "";
      if (msg.content.startsWith("Sent template: ")) {
        tplName = msg.content.replace("Sent template: ", "");
      } else if (msg.content === "Sent Welcome Template") {
        tplName = "welcome_message_utility";
      } else if (msg.content === "Sent limit reached template") {
        tplName = "limit_reached";
      } else if (msg.content.startsWith("Sent services_")) {
        tplName = msg.content.replace("Sent ", "");
      }
      
      const tplData = metaTemplates.find(t => t.name === tplName);
      
      return (
        <div className="bg-black/10 dark:bg-black/20 p-3 rounded-lg border border-black/5 dark:border-white/10 mt-1 shadow-sm min-w-[200px]">
          <div className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-wider opacity-70 border-b border-black/10 dark:border-white/10 pb-1">
            <LayoutTemplate size={12} /> Template: {tplName || "Unknown"}
          </div>
          {tplData ? (
             <div className="text-sm whitespace-pre-wrap leading-relaxed">
               {tplData.components?.find((c: any) => c.type === 'BODY')?.text || "No body content"}
             </div>
          ) : (
             <div className="text-sm italic">{msg.content}</div>
          )}
        </div>
      );
    }

    if (msg.messageType === "text" && msg.direction === "outbound") {
       return msg.content;
    }
    try {
      const parsed = JSON.parse(msg.content);
      if (parsed.text?.body) return parsed.text.body;
      if (parsed.button?.text) return `[Button Clicked]: ${parsed.button.text}`;
      if (parsed.interactive?.list_reply?.title) return `[List Selection]: ${parsed.interactive.list_reply.title}`;
      if (parsed.interactive?.button_reply?.title) return `[Button Selection]: ${parsed.interactive.button_reply.title}`;
      
      // Rich media placeholders
      if (msg.messageType === "image" && parsed.image?.id) {
        return <span className="italic flex items-center gap-1 opacity-90"><FileText size={14}/> Image attached (Media ID: {parsed.image.id})</span>;
      }
      if (msg.messageType === "document" && parsed.document?.id) {
        return <span className="italic flex items-center gap-1 opacity-90"><FileText size={14}/> Document attached (Media ID: {parsed.document.id})</span>;
      }
    } catch (e) {}
    return msg.content;
  };

  // CRM Handlers
  const handleUpdateContact = async (contactId: string, updates: Partial<WhatsAppContact>) => {
    try {
      const { data } = await api.patch(`/whatsapp/contacts/${contactId}`, updates);
      setContacts((prev) =>
        prev.map((c) => (c._id === contactId ? { ...c, ...data, messages: c.messages } : c))
      );
    } catch (error) {
      console.error("Failed to update contact", error);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/whatsapp/contacts", addContactForm);
      setShowAddContactModal(false);
      setAddContactForm({ name: "", phoneNumber: "" });
      await fetchData();
      setActiveContactId(data._id);
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to create contact");
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this contact and all their messages?")) {
      try {
        await api.delete(`/whatsapp/contacts/${id}`);
        setContacts(contacts.filter(c => c._id !== id));
        if (activeContactId === id) setActiveContactId(null);
      } catch (error) {
        console.error("Failed to delete contact", error);
      }
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.phoneNumber.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  // Quick Replies Handlers
  const handleQuickReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/whatsapp/quick-replies", quickReplyForm);
      setShowQuickReplyForm(false);
      setQuickReplyForm({ title: "", text: "" });
      fetchData();
    } catch (error) {
      console.error("Failed to save quick reply", error);
    }
  };

  const handleDeleteQuickReply = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this quick reply?")) {
      try {
        await api.delete(`/whatsapp/quick-replies/${id}`);
        fetchData();
      } catch (error) {
        console.error("Failed to delete quick reply", error);
      }
    }
  };

  const handleEditContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContactId) return;

    try {
      const parsedTags = editContactForm.tags.split(',').map(t => t.trim()).filter(Boolean);
      await api.put(`/whatsapp/contacts/${editingContactId}`, {
        name: editContactForm.name,
        status: editContactForm.status,
        tags: parsedTags,
        dailyServiceLimit: editContactForm.dailyServiceLimit,
        notes: editContactForm.notes
      });
      
      const newContacts = [...contacts];
      const idx = newContacts.findIndex(c => c._id === editingContactId);
      if (idx !== -1) {
        newContacts[idx] = {
          ...newContacts[idx],
          name: editContactForm.name,
          status: editContactForm.status as any,
          tags: parsedTags,
          dailyServiceLimit: editContactForm.dailyServiceLimit,
          notes: editContactForm.notes
        };
        setContacts(newContacts);
      }
      
      setEditingContactId(null);
    } catch (error) {
      console.error("Failed to update contact", error);
      alert("Failed to update contact");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900 -mx-6 -mt-6 -mb-6">
      
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto scrollbar-hide pt-2 px-6 gap-2">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "chats"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <MessageSquare size={18} />
          Chats
        </button>
        <button
          onClick={() => setActiveTab("contacts")}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "contacts"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <Users size={18} />
          Contacts
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
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
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
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
        <button
          onClick={() => setActiveTab("quick_replies")}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "quick_replies"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <Zap size={18} />
          Quick Replies
        </button>
      </div>

      {activeTab === "chats" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar / Contact List */}
          <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <input
                type="text"
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 dark:text-white"
              />
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.map((contact) => (
                <div
                  key={contact._id}
                  onClick={() => {
                    setActiveContactId(contact._id);
                    if (contact.unreadCount > 0) {
                      handleUpdateContact(contact._id, { unreadCount: 0 });
                    }
                  }}
                  className={`p-4 border-b border-slate-100 dark:border-slate-800/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    activeContactId === contact._id ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500" : "border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        contact.status === 'open' ? 'bg-emerald-500' :
                        contact.status === 'pending' ? 'bg-amber-500' : 'bg-slate-400'
                      }`} />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {contact.name || contact.phoneNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {contact.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {contact.unreadCount}
                        </span>
                      )}
                      {contact.messages.length > 0 && (
                        <span className="text-xs text-slate-400">
                          {new Date(contact.messages[contact.messages.length - 1].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 pl-4">
                    <Phone size={12} /> {contact.phoneNumber}
                  </div>
                </div>
              ))}
              {filteredContacts.length === 0 && (
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
                <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 shrink-0 gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <User size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="truncate">
                          {activeContact.name || activeContact.phoneNumber}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {activeContact.tags?.slice(0, 3).map((tag, i) => (
                            <button 
                              key={i} 
                              onClick={() => {
                                setEditingContactId(activeContact._id);
                                setEditContactForm({
                                  name: activeContact.name || "",
                                  phoneNumber: activeContact.phoneNumber,
                                  status: activeContact.status,
                                  dailyServiceLimit: activeContact.dailyServiceLimit ?? 2,
                                  tags: activeContact.tags?.join(", ") || "",
                                  notes: activeContact.notes || ""
                                });
                              }}
                              className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-normal whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                              {tag}
                            </button>
                          ))}
                          {activeContact.tags && activeContact.tags.length > 3 && (
                            <button 
                              onClick={() => {
                                setEditingContactId(activeContact._id);
                                setEditContactForm({
                                  name: activeContact.name || "",
                                  phoneNumber: activeContact.phoneNumber,
                                  status: activeContact.status,
                                  dailyServiceLimit: activeContact.dailyServiceLimit ?? 2,
                                  tags: activeContact.tags?.join(", ") || "",
                                  notes: activeContact.notes || ""
                                });
                              }}
                              className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                            >
                              +{activeContact.tags.length - 3}
                            </button>
                          )}
                        </div>
                      </h3>
                      <span className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1"><Phone size={12} /> {activeContact.phoneNumber}</span>
                        <span className="text-indigo-500 dark:text-indigo-400 font-medium">
                          Used today: {activeContact.servicesRequestedToday || 0}
                        </span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <select
                      value={activeContact.status}
                      onChange={(e) => handleUpdateContact(activeContact._id, { status: e.target.value as any })}
                      className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none dark:text-white font-medium"
                    >
                      <option value="open">🟢 Open</option>
                      <option value="pending">🟡 Pending</option>
                      <option value="resolved">⚪ Resolved</option>
                    </select>

                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5" title="0 for unlimited">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Limit:</span>
                      <input 
                        type="number"
                        min="0"
                        className="w-10 bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none font-medium"
                        value={activeContact.dailyServiceLimit ?? 2}
                        onChange={(e) => handleUpdateContact(activeContact._id, { dailyServiceLimit: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    
                    <button
                      onClick={() => {
                        const newTag = prompt("Enter a tag to add (e.g. Urgent):");
                        if (newTag && newTag.trim()) {
                          handleUpdateContact(activeContact._id, { tags: [...(activeContact.tags || []), newTag.trim()] });
                        }
                      }}
                      className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-white font-medium transition-colors"
                    >
                      + Tag
                    </button>

                    <button
                          onClick={() => {
                            setEditingNotes(activeContact.notes || "");
                            setShowNotesModal(true);
                          }}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-medium text-sm flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <FileText size={14} /> Notes
                        </button>
                        <button
                          onClick={() => handleDeleteContact(activeContact._id)}
                          className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium text-sm flex items-center gap-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-100 dark:border-red-900/50"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
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
                          
                          {msg.direction === "outbound" && (
                             <span className="ml-1 flex items-center gap-0.5">
                               {msg.status === "failed" && <AlertCircle size={14} className="text-red-400" title="Failed to send" />}
                               {msg.status === "sent" && <Check size={14} />}
                               {msg.status === "delivered" && <CheckCheck size={14} />}
                               {msg.status === "read" && <CheckCheck size={14} className="text-emerald-400" />}
                             </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 relative">
                  {showQuickReplies && (
                    <div className="absolute bottom-full left-4 mb-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-10">
                      <div className="p-3 border-b border-slate-100 dark:border-slate-700 font-medium text-sm dark:text-white flex justify-between items-center">
                        Quick Replies
                        <button onClick={() => setShowQuickReplies(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {quickReplies.map(qr => (
                          <div 
                            key={qr._id} 
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                            onClick={() => {
                              setInputText(qr.text);
                              setShowQuickReplies(false);
                            }}
                          >
                            <div className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-1">{qr.title}</div>
                            <div className="text-xs text-slate-500 line-clamp-2">{qr.text}</div>
                          </div>
                        ))}
                        {quickReplies.length === 0 && <div className="p-4 text-center text-sm text-slate-500">No quick replies found. Add them in settings.</div>}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowTemplateModal(true)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        title="Send Template"
                      >
                        <LayoutTemplate size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        title="Quick Replies"
                      >
                        <Zap size={20} />
                      </button>
                    </div>
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
      {/* Analytics Tab */}
      {activeTab === "analytics" && analytics && (
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">WhatsApp Engagement Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="text-slate-500 dark:text-slate-400 font-medium">Total Unique Users</div>
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <Users size={20} />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-800 dark:text-white">{analytics.totalUsers.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="text-slate-500 dark:text-slate-400 font-medium">Total Messages</div>
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <MessageSquare size={20} />
                </div>
              </div>
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{analytics.totalMessages.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="text-slate-500 dark:text-slate-400 font-medium">Inbound (Received)</div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ArrowDownLeft size={20} />
                </div>
              </div>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{analytics.totalInbound.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="text-slate-500 dark:text-slate-400 font-medium">Outbound (Sent)</div>
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <ArrowUpRight size={20} />
                </div>
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{analytics.totalOutbound.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Service Requests</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search services or contacts..."
                    value={servicesSearchQuery}
                    onChange={(e) => setServicesSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64 text-slate-800 dark:text-white"
                  />
                </div>
                <select
                  value={servicesSortBy}
                  onChange={(e) => setServicesSortBy(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                >
                  <option value="most">Most Requested</option>
                  <option value="least">Least Requested</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-4 px-6">Service Name</th>
                    <th className="py-4 px-6 text-center w-32">Requests</th>
                    <th className="py-4 px-6">Requested By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {(() => {
                    let displayServices = [...(analytics.allServices || [])];
                    if (servicesSearchQuery) {
                      const sq = servicesSearchQuery.toLowerCase();
                      displayServices = displayServices.filter(s => {
                        if (s.title.toLowerCase().includes(sq)) return true;
                        if (s.contacts && s.contacts.some(c => c.name?.toLowerCase().includes(sq) || c.phoneNumber.includes(sq))) return true;
                        return false;
                      });
                    }
                    
                    displayServices.sort((a, b) => {
                      if (servicesSortBy === "most") return b.count - a.count;
                      if (servicesSortBy === "least") return a.count - b.count;
                      if (servicesSortBy === "name_asc") return a.title.localeCompare(b.title);
                      if (servicesSortBy === "name_desc") return b.title.localeCompare(a.title);
                      return 0;
                    });
                    
                    if (displayServices.length === 0) {
                      return (
                        <tr>
                          <td colSpan={3} className="py-12 text-center text-slate-500 dark:text-slate-400">
                            No service requests found.
                          </td>
                        </tr>
                      );
                    }
                    
                    return displayServices.map((service, index) => (
                      <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-6 font-medium text-slate-800 dark:text-slate-200">
                          {service.title}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                            {service.count}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-2">
                            {service.contacts && service.contacts.map((contact, cIndex) => (
                              <span key={cIndex} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                <User size={12} className="text-slate-400" />
                                {contact.name || contact.phoneNumber}
                              </span>
                            ))}
                            {(!service.contacts || service.contacts.length === 0) && (
                              <span className="text-slate-400 text-xs italic">No contact data</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Contacts Tab */}
      {activeTab === "contacts" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Contacts Management</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={contactsSearchQuery}
                  onChange={(e) => setContactsSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64 text-slate-800 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-500" />
                <select
                  value={contactsStatusFilter}
                  onChange={(e) => setContactsStatusFilter(e.target.value as any)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <select
                value={contactsSortBy}
                onChange={(e) => setContactsSortBy(e.target.value as any)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
              >
                <option value="newest">Newest First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-4 px-6">Contact Info</th>
                    <th className="py-4 px-6">Requested Services</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Daily Limit</th>
                    <th className="py-4 px-6">Used Today</th>
                    <th className="py-4 px-6">Tags</th>
                    <th className="py-4 px-6">Notes</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {(() => {
                    let displayContacts = contacts.filter(c => {
                      const sq = contactsSearchQuery.toLowerCase();
                      const matchesSearch = c.name?.toLowerCase().includes(sq) || 
                                            c.phoneNumber.includes(sq) ||
                                            (c.tags && c.tags.some(tag => tag.toLowerCase().includes(sq)));
                      const matchesStatus = contactsStatusFilter === "all" || c.status === contactsStatusFilter;
                      return matchesSearch && matchesStatus;
                    });
                    
                    displayContacts.sort((a, b) => {
                      if (contactsSortBy === "name_asc") {
                        return (a.name || a.phoneNumber).localeCompare(b.name || b.phoneNumber);
                      } else if (contactsSortBy === "name_desc") {
                        return (b.name || b.phoneNumber).localeCompare(a.name || a.phoneNumber);
                      } else {
                        const aTime = a.messages?.[a.messages.length - 1]?.createdAt || "";
                        const bTime = b.messages?.[b.messages.length - 1]?.createdAt || "";
                        return bTime.localeCompare(aTime);
                      }
                    });

                    if (displayContacts.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500">No contacts found.</td>
                        </tr>
                      );
                    }

                    return displayContacts.map(contact => (
                      <tr key={contact._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-800 dark:text-white">{contact.name || "Unknown"}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{contact.phoneNumber}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(() => {
                              const services = getRequestedServices(contact.messages);
                              if (services.length === 0) return <span className="text-slate-400 italic text-xs">None</span>;
                              return services.map((srv, i) => (
                                <span key={i} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] px-2 py-0.5 rounded-md font-medium border border-indigo-100 dark:border-indigo-800 break-words line-clamp-2" title={srv}>
                                  {srv}
                                </span>
                              ));
                            })()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                            contact.status === 'open' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            contact.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              contact.status === 'open' ? 'bg-emerald-500' :
                              contact.status === 'pending' ? 'bg-amber-500' : 'bg-slate-400'
                            }`} />
                            {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-700 dark:text-slate-300">
                          {contact.dailyServiceLimit === 0 ? "Unlimited" : contact.dailyServiceLimit ?? 2}
                        </td>
                        <td className="py-4 px-6 font-medium text-indigo-600 dark:text-indigo-400">
                          {contact.servicesRequestedToday || 0}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1">
                            {contact.tags?.length > 0 ? (
                              contact.tags.map((tag, i) => (
                                <span key={i} className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-xs">No tags</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 max-w-[200px] truncate text-slate-600 dark:text-slate-400" title={contact.notes}>
                          {contact.notes || <span className="italic text-slate-400 text-xs">No notes</span>}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => {
                              setEditingContactId(contact._id);
                              setEditContactForm({
                                name: contact.name || "",
                                phoneNumber: contact.phoneNumber,
                                status: contact.status,
                                dailyServiceLimit: contact.dailyServiceLimit ?? 2,
                                tags: contact.tags?.join(", ") || "",
                                notes: contact.notes || ""
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="Edit Contact"
                          >
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quick Replies Tab */}
      {activeTab === "quick_replies" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Quick Replies Management</h2>
            <button
              onClick={() => setShowQuickReplyForm(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={18} />
              Add Quick Reply
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickReplies.map((qr) => (
              <div key={qr._id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 flex flex-col hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-slate-800 dark:text-white">{qr.title}</h3>
                  <button 
                    onClick={() => handleDeleteQuickReply(qr._id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                    title="Delete Quick Reply"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm flex-1 whitespace-pre-wrap">{qr.text}</div>
              </div>
            ))}
            
            {quickReplies.length === 0 && !showQuickReplyForm && (
              <div className="col-span-full py-12 text-center text-slate-500">
                <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap size={24} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">No Quick Replies Yet</h3>
                <p>Create predefined messages to send to customers instantly.</p>
              </div>
            )}
          </div>
          
          {showQuickReplyForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">Create Quick Reply</h3>
                  <button onClick={() => setShowQuickReplyForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6">
                  <form id="quick-reply-form" onSubmit={handleQuickReplySubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                      <input
                        type="text"
                        required
                        value={quickReplyForm.title}
                        onChange={(e) => setQuickReplyForm({ ...quickReplyForm, title: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                        placeholder="e.g. Welcome Message"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message Text</label>
                      <textarea
                        required
                        rows={5}
                        value={quickReplyForm.text}
                        onChange={(e) => setQuickReplyForm({ ...quickReplyForm, text: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white resize-none"
                        placeholder="Type the full message here..."
                      />
                    </div>
                  </form>
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowQuickReplyForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button type="submit" form="quick-reply-form" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Save</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && activeContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
              <h3 className="font-semibold text-slate-800 dark:text-white">
                Notes for {activeContact.name || activeContact.phoneNumber}
              </h3>
              <button 
                onClick={() => setShowNotesModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Add notes about this contact..."
                rows={6}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white resize-none"
              />
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
              <button
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setNotesSaving(true);
                  await handleUpdateContact(activeContact._id, { notes: editingNotes });
                  setNotesSaving(false);
                  setShowNotesModal(false);
                }}
                disabled={notesSaving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-sm disabled:opacity-50"
              >
                {notesSaving ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Edit Contact Modal */}
      {editingContactId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
              <h3 className="font-semibold text-slate-800 dark:text-white">Edit Contact</h3>
              <button onClick={() => setEditingContactId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <form id="edit-contact-form" onSubmit={handleEditContactSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name</label>
                    <input
                      type="text"
                      value={editContactForm.name}
                      onChange={(e) => setEditContactForm({ ...editContactForm, name: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                    <select
                      value={editContactForm.status}
                      onChange={(e) => setEditContactForm({ ...editContactForm, status: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                    >
                      <option value="open">Open</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Daily Service Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={editContactForm.dailyServiceLimit}
                      onChange={(e) => setEditContactForm({ ...editContactForm, dailyServiceLimit: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Set to 0 for unlimited services.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tags</label>
                    <input
                      type="text"
                      value={editContactForm.tags}
                      onChange={(e) => setEditContactForm({ ...editContactForm, tags: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                      placeholder="e.g. VIP, urgent"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Separate multiple tags with commas.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                  <textarea
                    value={editContactForm.notes}
                    onChange={(e) => setEditContactForm({ ...editContactForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white resize-none"
                    placeholder="Add internal notes..."
                  />
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setEditingContactId(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-contact-form"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Send WhatsApp Template</h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {metaTemplates.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <LayoutTemplate size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No templates found or missing WABA_ID.</p>
                  <p className="text-sm mt-2">Ensure your WABA_ID is configured in the environment to fetch templates from Meta.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {metaTemplates.map((tpl) => (
                    <div 
                      key={tpl.id} 
                      className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer flex flex-col"
                      onClick={() => handleSendTemplate(tpl.name)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-slate-800 dark:text-white truncate">{tpl.name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${tpl.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {tpl.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mb-2">Language: {tpl.language}</div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded text-sm text-slate-600 dark:text-slate-300 flex-1 whitespace-pre-wrap">
                        {tpl.components?.find((c: any) => c.type === 'BODY')?.text || "No body content"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminWhatsApp;
