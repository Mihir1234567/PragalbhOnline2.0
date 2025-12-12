import React from "react";
import { X, Globe } from "lucide-react";

interface ServicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: any;
}

const LANGUAGES = [
  { key: "EN", label: "English" },
  { key: "GU", label: "Gujarati" },
];

const ServicePreviewModal: React.FC<ServicePreviewModalProps> = ({
  isOpen,
  onClose,
  service,
}) => {
  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Globe className="text-primary-500" />
              Service Preview
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Preview service details in all supported languages
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {LANGUAGES.map((lang) => (
              <div
                key={lang.key}
                className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600"
              >
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-600">
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {lang.label}
                  </h3>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Title
                  </h4>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {service.title?.[lang.key] || (
                      <span className="text-red-400 italic">Missing</span>
                    )}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Description
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {service.description?.[lang.key] || (
                      <span className="text-red-400 italic">Missing</span>
                    )}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Documents
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300">
                    {service.documents?.[lang.key]?.map(
                      (doc: string, i: number) => (
                        <li key={i}>
                          {doc || (
                            <span className="text-red-400 italic">Empty</span>
                          )}
                        </li>
                      )
                    ) || (
                      <span className="text-red-400 italic">No documents</span>
                    )}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 text-slate-700 font-medium hover:bg-slate-300 rounded-lg dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServicePreviewModal;
