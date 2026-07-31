import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Edit2,
  Calendar,
  Phone,
  User,
  FileText,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Application, useAdmin } from "../../context/AdminContext";
import { useLanguage } from "../../context/LanguageContext";
import { useServices } from "../../context/ServiceContext";

interface ApplicationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
}

const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({
  isOpen,
  onClose,
  application,
}) => {
  const { updateApplication } = useAdmin();
  const { services } = useServices(); // Fetch available services
  const { t, language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Application>>({});

  useEffect(() => {
    if (application) {
      setFormData({
        customerName: application.customerName,
        phone: application.phone,
        message: application.message || "",
        status: application.status,
        serviceId: application.serviceId,
        serviceName: application.serviceName,
      });
      setIsEditing(false);
    }
  }, [application, isOpen]);

  if (!isOpen || !application) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (application.id) {
      await updateApplication(application.id, formData);
      setIsEditing(false);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span className="text-primary-600 dark:text-primary-400">
              #{application.id.slice(-6).toUpperCase()}
            </span>
            <span>Application Details</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customerName || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, customerName: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Service
                </label>
                <select
                  value={formData.serviceId}
                  onChange={(e) => {
                    const selectedService = services.find(
                      (s) => s.id === e.target.value
                    );
                    if (selectedService) {
                      setFormData({
                        ...formData,
                        serviceId: selectedService.id,
                        serviceName: selectedService.title.EN,
                      });
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                >
                  <option value="" disabled>
                    Select a Service
                  </option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.title.EN}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "pending" | "completed",
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Message / Notes
                </label>
                <textarea
                  rows={4}
                  value={formData.message || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  placeholder="Add notes about this application..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                  <Save size={18} /> Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Customer Info
                  </h3>
                  <div className="flex items-start gap-3">
                    <User className="text-primary-500 mt-0.5" size={18} />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-lg">
                        {application.customerName}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Customer
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="text-primary-500 mt-0.5" size={18} />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {application.phone}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Phone
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Application Info
                  </h3>
                  <div className="flex items-start gap-3">
                    <FileText className="text-primary-500 mt-0.5" size={18} />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {(() => {
                          const service = services.find(
                            (s) => s.id === application.serviceId
                          );
                          return service
                            ? service.title[language] ||
                                service.title["EN"] ||
                                application.serviceName
                            : application.serviceName;
                        })()}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Service Applied For
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="text-primary-500 mt-0.5" size={18} />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {formatDate(application.date)}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Submission Date
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    {application.status === "completed" ? (
                      <CheckCircle
                        className="text-green-500 mt-0.5"
                        size={18}
                      />
                    ) : (
                      <Clock className="text-amber-500 mt-0.5" size={18} />
                    )}
                    <div>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          application.status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {application.status === "completed"
                          ? "Completed"
                          : "Pending"}
                      </span>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Current Status
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {application.message && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Notes
                    </h3>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">
                    {application.message}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                  <Edit2 size={18} /> Edit Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetailsModal;
