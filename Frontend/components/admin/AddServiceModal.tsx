import React, { useState } from "react";
import { X, Globe, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import api from "../../lib/client";

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type LanguageKey = "EN" | "GU";

const LANGUAGES: { key: LanguageKey; label: string }[] = [
  { key: "EN", label: "English" },
  { key: "GU", label: "Gujarati" },
];

const AddServiceModal: React.FC<
  AddServiceModalProps & { serviceToEdit?: any }
> = ({ isOpen, onClose, onSuccess, serviceToEdit }) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<LanguageKey>("EN");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const [formData, setFormData] = useState({
    title: { EN: "", GU: "" },
    description: { EN: "", GU: "" },
    documents: { EN: [""], GU: [""] },
    category: "ONLINE", // Default
    price: "",
    iconName: "FileText",
  });

  React.useEffect(() => {
    if (serviceToEdit) {
      setFormData({
        title: serviceToEdit.title || { EN: "", GU: "" },
        description: serviceToEdit.description || { EN: "", GU: "" },
        documents: serviceToEdit.documents || { EN: [""], GU: [""] },
        category: serviceToEdit.category || "ONLINE",
        price: serviceToEdit.price || "",
        iconName: serviceToEdit.iconName || "FileText",
      });
      setIsPreviewMode(false);
    } else {
      // Reset form when opening in "Add" mode
      setFormData({
        title: { EN: "", GU: "" },
        description: { EN: "", GU: "" },
        documents: { EN: [""], GU: [""] },
        category: "ONLINE",
        price: "",
        iconName: "FileText",
      });
      setIsPreviewMode(false);
    }
  }, [serviceToEdit, isOpen]);

  if (!isOpen) return null;

  const handleTextChange = (
    field: "title" | "description",
    lang: LanguageKey,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: { ...prev[field], [lang]: value },
    }));
  };

  const handleDocumentChange = (
    lang: LanguageKey,
    index: number,
    value: string
  ) => {
    const newDocs = [...formData.documents[lang]];
    newDocs[index] = value;
    setFormData((prev) => ({
      ...prev,
      documents: { ...prev.documents, [lang]: newDocs },
    }));
  };

  const addDocument = (lang: LanguageKey) => {
    setFormData((prev) => ({
      ...prev,
      documents: { ...prev.documents, [lang]: [...prev.documents[lang], ""] },
    }));
  };

  const removeDocument = (lang: LanguageKey, index: number) => {
    const newDocs = formData.documents[lang].filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      documents: { ...prev.documents, [lang]: newDocs },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPreviewMode) {
      setIsPreviewMode(true);
      return;
    }

    // Phase 2: Actual Submission
    setIsSubmitting(true);
    try {
      if (serviceToEdit) {
        await api.put(
          `/services/${serviceToEdit._id || serviceToEdit.id}`,
          formData
        );
      } else {
        await api.post("/services", formData);
      }
      onSuccess();
      onClose();
      showToast(
        serviceToEdit
          ? "Service updated successfully"
          : "Service created successfully",
        "success"
      );
    } catch (error) {
      console.error("Failed to save service", error);
      showToast("Failed to save service", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Plus className="text-primary-500" />
              {isPreviewMode
                ? "Review & Confirm"
                : serviceToEdit
                ? "Edit Service"
                : "Add New Service"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isPreviewMode
                ? "Please review all translations before saving"
                : serviceToEdit
                ? "Update service details"
                : "Create a new service"}
            </p>
          </div>
          <button
            onClick={() => {
              if (isPreviewMode) {
                setIsPreviewMode(false);
              } else {
                onClose();
              }
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isPreviewMode ? (
            // Edit Mode Form
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
                <div className="flex gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.key}
                      onClick={() => setActiveTab(lang.key)}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                        activeTab === lang.key
                          ? "bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>

                <div className="hidden sm:block">
                  {/* Hidden on desktop since submit button now handles this, but keeping logic just in case user wants manual trigger */}
                </div>
              </div>

              <form
                id="add-service-form"
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {/* Common Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                    >
                      <option value="ONLINE">Online</option>
                      <option value="CERTIFICATE">Certificate</option>
                      <option value="ASSISTANCE">Assistance</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                {/* Language Specific Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                      Service Title (
                      {LANGUAGES.find((l) => l.key === activeTab)?.label})
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title[activeTab]}
                      onChange={(e) =>
                        handleTextChange("title", activeTab, e.target.value)
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600"
                      placeholder={`Enter title in ${
                        LANGUAGES.find((l) => l.key === activeTab)?.label
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                      Description (
                      {LANGUAGES.find((l) => l.key === activeTab)?.label})
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.description[activeTab]}
                      onChange={(e) =>
                        handleTextChange(
                          "description",
                          activeTab,
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600"
                      placeholder={`Enter description in ${
                        LANGUAGES.find((l) => l.key === activeTab)?.label
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                      Required Documents (
                      {LANGUAGES.find((l) => l.key === activeTab)?.label})
                    </label>
                    <div className="space-y-2">
                      {formData.documents[activeTab].map((doc, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={doc}
                            onChange={(e) =>
                              handleDocumentChange(
                                activeTab,
                                index,
                                e.target.value
                              )
                            }
                            className="flex-1 px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                            placeholder={`Document ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeDocument(activeTab, index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addDocument(activeTab)}
                        className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1 mt-2"
                      >
                        <Plus size={16} /> Add Document
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </>
          ) : (
            // Preview Mode
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {LANGUAGES.map((lang) => (
                  <div
                    key={lang.key}
                    className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600"
                  >
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-600">
                      <Globe size={16} className="text-primary-500" />
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {lang.label}
                      </h3>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Title
                      </h4>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {formData.title[lang.key] || (
                          <span className="text-red-400 italic">Missing</span>
                        )}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Description
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {formData.description[lang.key] || (
                          <span className="text-red-400 italic">Missing</span>
                        )}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Documents
                      </h4>
                      <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300">
                        {formData.documents[lang.key].map((doc, i) => (
                          <li key={i}>
                            {doc || (
                              <span className="text-red-400 italic">Empty</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-xl flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            type="button"
            className="w-full sm:w-auto px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg dark:text-slate-300 dark:hover:bg-slate-700 transition"
          >
            Cancel
          </button>

          {isPreviewMode && (
            <button
              type="button"
              onClick={() => setIsPreviewMode(false)}
              className="w-full sm:w-auto px-4 py-2 bg-slate-200 text-slate-700 font-medium hover:bg-slate-300 rounded-lg dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition"
            >
              Back to Edit
            </button>
          )}

          <button
            type={isPreviewMode ? "button" : "submit"}
            form={isPreviewMode ? undefined : "add-service-form"}
            onClick={isPreviewMode ? (e) => handleSubmit(e as any) : undefined}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition shadow-lg hover:shadow-primary-500/30 flex justify-center items-center gap-2"
          >
            {isSubmitting
              ? "Saving..."
              : isPreviewMode
              ? "Confirm & Save"
              : "Review & Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddServiceModal;
