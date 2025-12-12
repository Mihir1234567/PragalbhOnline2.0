import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Service, Language } from "../types";
import api from "../lib/client";

interface ServiceContextType {
  services: Service[];
  addService: (service: Omit<Service, "id">) => void;
  deleteService: (id: string) => void;
  fetchServices: () => Promise<void>;
  isLoading: boolean;
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

export const ServiceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load services from local storage or fallback to constants
  // Load services from API
  // Load services from API
  // Load services from API
  const fetchServices = async (retries = 3, delay = 1000) => {
    setIsLoading(true);
    for (let i = 0; i < retries; i++) {
      try {
        const { data } = await api.get("/services");
        const mappedData = data.map((s: any) => ({ ...s, id: s._id || s.id }));
        setServices(mappedData);
        localStorage.setItem(
          "pragalbh_services_data",
          JSON.stringify(mappedData)
        );
        return;
      } catch (error) {
        console.error(
          `Failed to fetch services (Attempt ${i + 1}/${retries})`,
          error
        );
        if (i === retries - 1) {
          const savedServices = localStorage.getItem("pragalbh_services_data");
          if (savedServices) {
            const parsedServices = JSON.parse(savedServices);
            setServices(
              parsedServices.map((s: any) => ({ ...s, id: s._id || s.id }))
            );
          } else {
            setServices([]);
          }
        } else {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const addService = (serviceData: Omit<Service, "id">) => {
    const newService: Service = { ...serviceData, id: crypto.randomUUID() };
    setServices((prev) => [...prev, newService]);
  };

  const deleteService = (id: string) => {
    setServices((prev) => prev.filter((service) => service.id !== id));
  };

  return (
    <ServiceContext.Provider
      value={{ services, addService, deleteService, fetchServices, isLoading }}
    >
      {children}
    </ServiceContext.Provider>
  );
};

export const useServices = () => {
  const context = useContext(ServiceContext);
  if (context === undefined) {
    throw new Error("useServices must be used within a ServiceProvider");
  }
  return context;
};
