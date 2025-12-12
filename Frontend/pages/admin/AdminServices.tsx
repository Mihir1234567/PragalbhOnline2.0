import React, { useState, useEffect } from "react";
import { useServices } from "../../context/ServiceContext";
import { useAdmin } from "../../context/AdminContext";
import { useLanguage } from "../../context/LanguageContext";
import {
  Search,
  Plus,
  X,
  Check,
  FilePlus,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import AddServiceModal from "../../components/admin/AddServiceModal";
import ServicePreviewModal from "../../components/admin/ServicePreviewModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import { useToast } from "../../context/ToastContext";
import api from "../../lib/client";

const AdminServices: React.FC = () => {
  const { addApplication } = useAdmin();
  const { services, fetchServices } = useServices(); // Added fetchServices check
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);

  // Custom Confirmation Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedService, setSelectedService] = useState<{
    id: string;
    title: { EN: string; [key: string]: any };
    documents?: { EN: string[]; [key: string]: any };
  } | null>(null);
  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    messageLanguage: "EN",
  });
  const [successMsg, setSuccessMsg] = useState("");

  const [editingService, setEditingService] = useState<any>(null);
  const [previewService, setPreviewService] = useState<any>(null);

  const filteredServices = services.filter(
    (service) =>
      service.title.EN.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.title.GU?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.title.GU?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApplyClick = (service: any) => {
    setSelectedService(service);
    setFormData({
      customerName: "",
      phone: "",
      messageLanguage: language === "GU" ? "GU" : "EN",
    });
    setIsModalOpen(true);
    setSuccessMsg("");
  };

  const handleEditClick = (service: any) => {
    setEditingService(service);
    setIsAddServiceModalOpen(true);
  };

  const confirmDelete = (serviceId: string) => {
    setDeleteId(serviceId);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/services/${deleteId}`);
      fetchServices();
      showToast("Service deleted successfully", "success");
    } catch (error) {
      console.error("Failed to delete service", error);
      showToast("Failed to delete service", "error");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    addApplication({
      customerName: formData.customerName,
      phone: formData.phone,
      serviceId: selectedService.id,
      serviceName: selectedService.title.EN,
    });

    // Construct WhatsApp Message using selected language
    const msgLang = formData.messageLanguage;
    const serviceTitle =
      selectedService.title[msgLang] || selectedService.title.EN;

    let text = `Hello ${formData.customerName},\n\nHere is your *${serviceTitle}* Document list.`;

    // Customize greeting based on language
    if (msgLang === "GU") {
      text = `નમસ્તે ${formData.customerName},\n\nતમારા *${serviceTitle}* માટેના દસ્તાવેજોની સૂચિ અહીં છે.`;
      text = `નમસ્તે ${formData.customerName},\n\nતમારા *${serviceTitle}* માટેના દસ્તાવેજોની સૂચિ અહીં છે.`;
    }

    // Add documents list if available
    const documentsList =
      selectedService.documents?.[msgLang] || selectedService.documents?.["EN"];

    if (documentsList && documentsList.length > 0) {
      if (msgLang === "GU") text += `\n\n*જરૂરી દસ્તાવેજો:*\n`;
      if (msgLang === "GU") text += `\n\n*જરૂરી દસ્તાવેજો:*\n`;
      else text += `\n\n*Required Documents:*\n`;

      documentsList.forEach((doc: string, index: number) => {
        text += `${index + 1}. ${doc}\n`;
      });
    }

    // Add footer
    text += `\n\nRegards,\nPragalbh Services`;

    // ✅ ✅ ✅ ONLY NECESSARY FIX (Phone number formatting for WhatsApp)
    let phone = formData.phone.replace(/\D/g, ""); // remove spaces, +, -

    if (phone.length === 10) {
      phone = "91" + phone; // auto add India country code
    }

    // Open WhatsApp
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");

    setSuccessMsg("Application added & WhatsApp opened successfully!");

    // Reset and close after a delay
    setTimeout(() => {
      setIsModalOpen(false);
      setSuccessMsg("");
      setFormData({ customerName: "", phone: "", messageLanguage: "EN" });
    }, 1500);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto bg-white dark:bg-slate-900 transition-colors">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
            {t("admin.service_management") || "Service Management"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("admin.apply_services_desc") ||
              "Apply for services on behalf of customers"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <button
            onClick={() => setIsAddServiceModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition whitespace-nowrap"
          >
            <FilePlus size={20} />
            {"Add New Service"}
          </button>

          <div className="relative w-full sm:w-80">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500"
              size={20}
            />
            <input
              type="text"
              placeholder={t("admin.search_services") || "Search services..."}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="rounded-xl shadow-sm border p-4 sm:p-6 hover:shadow-md transition-shadow bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
          >
            <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
              <div className="flex gap-2">
                <div className="p-2 sm:p-3 rounded-lg flex-shrink-0 bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-400">
                  <Plus size={20} className="sm:w-6 sm:h-6" />
                </div>
                <span className="px-2 sm:px-3 py-1 text-xs rounded-full font-medium whitespace-nowrap bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 h-fit self-center">
                  {service.category}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setPreviewService(service)}
                  className="p-1.5 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                  title="Preview Service"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => handleEditClick(service)}
                  className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Edit Service"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => confirmDelete(service.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete Service"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold mb-2 line-clamp-2 text-slate-800 dark:text-white">
              {service.title[language] || service.title.EN}
            </h3>
            <p className="text-xs sm:text-sm mb-4 line-clamp-2 text-slate-500 dark:text-slate-400">
              {service.description[language] || service.description.EN}
            </p>

            <button
              onClick={() => handleApplyClick(service)}
              className="w-full py-2 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 border-2 text-sm sm:text-base bg-white dark:bg-slate-700 border-primary-600 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-600"
            >
              <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />{" "}
              {t("admin.apply_for_user") || "Apply for User"}
            </button>
          </div>
        ))}

        {filteredServices.length === 0 && (
          <div className="col-span-full text-center py-8 sm:py-12 text-slate-500 dark:text-slate-400">
            <p className="text-sm sm:text-base">
              {t("admin.no_services_found") ||
                "No services found matching your search."}
            </p>
          </div>
        )}
      </div>

      {/* Application Modal */}
      {isModalOpen && selectedService && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 bg-white dark:bg-slate-800">
            <div className="p-4 sm:p-6 border-b flex justify-between items-center gap-2 border-slate-100 dark:border-slate-700">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                {t("admin.new_application") || "New Application"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-shrink-0 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
              {successMsg ? (
                <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-green-600">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Check size={28} className="sm:w-8 sm:h-8" />
                  </div>
                  <p className="font-bold text-base sm:text-lg text-center">
                    {successMsg}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="p-3 sm:p-4 rounded-lg mb-4 bg-slate-50 dark:bg-slate-700">
                    <p className="text-xs sm:text-sm mb-1 text-slate-500 dark:text-slate-400">
                      {t("admin.applying_for") || "Applying for:"}
                    </p>
                    <p className="font-semibold text-sm sm:text-base line-clamp-2 text-primary-700 dark:text-primary-400">
                      {selectedService.title[formData.messageLanguage] ||
                        selectedService.title.EN}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                      {t("form.name") || "Customer Name"}
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                      placeholder={
                        t("admin.enter_customer_name") || "Enter customer name"
                      }
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerName: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                      {t("admin.whatsapp_number") || "WhatsApp Number"}
                    </label>
                    <input
                      type="tel"
                      required
                      className="w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                      placeholder="e.g 9876543210"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                      {"Message Language"}
                    </label>
                    <select
                      className="w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                      value={formData.messageLanguage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          messageLanguage: e.target.value,
                        })
                      }
                    >
                      <option value="EN">English</option>
                      <option value="GU">Gujarati</option>
                    </select>
                  </div>

                  <div className="pt-2 sm:pt-4">
                    <button
                      type="submit"
                      className="w-full py-2 sm:py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-shadow shadow-md hover:shadow-lg text-sm sm:text-base"
                    >
                      {t("admin.submit_application") || "Submit Application"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      <AddServiceModal
        isOpen={isAddServiceModalOpen}
        onClose={() => {
          setIsAddServiceModalOpen(false);
          setEditingService(null);
        }}
        onSuccess={() => {
          // Refresh services
          fetchServices();
        }}
        serviceToEdit={editingService}
      />

      {/* Service Preview Modal */}
      <ServicePreviewModal
        isOpen={!!previewService}
        onClose={() => setPreviewService(null)}
        service={previewService}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Service"
        message="Are you sure you want to delete this service? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};

export default AdminServices;
