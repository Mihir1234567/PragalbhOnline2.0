import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import api from "../lib/client";

export interface Application {
  id: string;
  phone: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  date: string; // ISO string
  status: "pending" | "completed";
  message?: string;
}

import { Review } from "./AdminTypes";

interface AdminContextType {
  applications: Application[];
  fetchApplications: () => Promise<void>;
  addApplication: (app: Omit<Application, "id" | "date" | "status">) => void;
  updateStatus: (id: string, status: "pending" | "completed") => void;
  updateApplication: (id: string, data: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  deleteApplications: (ids: string[]) => Promise<void>;
  // Reviews
  reviews: Review[];
  fetchReviews: () => Promise<void>;
  approveReview: (id: string, approved: boolean) => Promise<void>;
  addReview: (review: Partial<Review>) => Promise<void>;
  updateReview: (id: string, review: Partial<Review>) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const fetchReviews = async () => {
    try {
      const { data } = await api.get("/reviews?isAdmin=true");
      setReviews(data);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
    }
  };

  const fetchApplications = async () => {
    try {
      const { data } = await api.get("/applications");
      const mappedData = data.map((app: any) => ({
        ...app,
        id: app._id || app.id, // Map _id from backend to id
      }));
      setApplications(mappedData);
      localStorage.setItem("pragalbh_admin_data", JSON.stringify(mappedData));
    } catch (e) {
      console.error("Failed to fetch applications", e);
      // Fallback to LS
      const saved = localStorage.getItem("pragalbh_admin_data");
      if (saved) {
        setApplications(JSON.parse(saved));
      }
    }
  };

  // Load apps from API
  useEffect(() => {

    const token = localStorage.getItem("pragalbh_admin_token");
    if (token) {
      fetchApplications();
      fetchReviews();
    }
  }, []);

  // Save to local storage whenever applications change
  useEffect(() => {
    localStorage.setItem("pragalbh_admin_data", JSON.stringify(applications));
  }, [applications]);

  const addApplication = async (
    appData: Omit<Application, "id" | "date" | "status">
  ) => {
    try {
      const { data } = await api.post("/applications", appData);
      const newApp: Application = {
        ...data,
        id: data._id || data.id,
      };
      setApplications((prev) => [newApp, ...prev]);
    } catch (error) {
      console.error("Failed to add application", error);
      // Fallback local add if offline? Or just alert? For now log error.
    }
  };

  const updateStatus = async (id: string, status: "pending" | "completed") => {
    try {
      await api.patch(`/applications/${id}/status`, { status });
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status } : app))
      );
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const updateApplication = async (id: string, data: Partial<Application>) => {
    try {
      const { data: updatedApp } = await api.patch(`/applications/${id}`, data);
      const mappedApp = {
        ...updatedApp,
        id: updatedApp._id || updatedApp.id,
      };
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? mappedApp : app))
      );
    } catch (error) {
      console.error("Failed to update application", error);
    }
  };

  const deleteApplication = async (id: string) => {
    try {
      await api.delete(`/applications/${id}`);
      setApplications((prev) => prev.filter((app) => app.id !== id));
    } catch (error) {
      console.error("Failed to delete application", error);
    }
  };

  const deleteApplications = async (ids: string[]) => {
    try {
      await api.post("/applications/bulk-delete", { ids });
      setApplications((prev) => prev.filter((app) => !ids.includes(app.id)));
    } catch (error) {
      console.error("Failed to bulk delete applications", error);
    }
  };

  const approveReview = async (id: string, approved: boolean) => {
    try {
      const { data } = await api.put(`/reviews/${id}`, { approved });
      setReviews((prev) =>
        prev.map((review) => (review._id === id ? data : review))
      );
    } catch (error) {
      console.error("Failed to update review status", error);
    }
  };

  const addReview = async (review: Partial<Review>) => {
    try {
      const { data } = await api.post("/reviews", review);
      setReviews((prev) => [data, ...prev]);
    } catch (error) {
      console.error("Failed to add review", error);
    }
  };

  const updateReview = async (id: string, updates: Partial<Review>) => {
    try {
      const { data } = await api.put(`/reviews/${id}`, updates);
      setReviews((prev) =>
        prev.map((review) => (review._id === id ? data : review))
      );
    } catch (error) {
      console.error("Failed to update review", error);
    }
  };

  const deleteReview = async (id: string) => {
    try {
      await api.delete(`/reviews/${id}`);
      setReviews((prev) => prev.filter((review) => review._id !== id));
    } catch (error) {
      console.error("Failed to delete review", error);
    }
  };

  return (
    <AdminContext.Provider
      value={{
        applications,
        fetchApplications,
        addApplication,
        updateStatus,
        updateApplication,
        deleteApplication,
        deleteApplications,
        reviews,
        fetchReviews,
        approveReview,
        addReview,
        updateReview,
        deleteReview,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
