import React, { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./context/ThemeContext";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";
import { ServiceProvider } from "./context/ServiceContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Apply from "./pages/Apply";
import Contact from "./pages/Contact";
import VisitTracker from "./components/VisitTracker";

import { AdminProvider } from "./context/AdminContext";
import { AdminProfileProvider } from "./context/AdminProfileContext";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminServices from "./pages/admin/AdminServices";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminWhatsApp from "./pages/admin/AdminWhatsApp";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminProtected from "./components/admin/AdminAuth";
import AutoLogout from "./components/admin/AutoLogout";

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AdminProvider>
          <AdminProfileProvider>
            <ServiceProvider>
              <HashRouter>
                <Toaster position="bottom-right" />
                <ScrollToTop />
                <VisitTracker />
                <div className="flex flex-col min-h-screen font-sans dark:bg-slate-900 dark:text-white">
                  <Routes>
                    {/* Public Routes */}
                    <Route
                      path="/"
                      element={
                        <>
                          <Header />
                          <main className="flex-grow">
                            <Home />
                          </main>
                          <Footer />
                        </>
                      }
                    />
                    <Route
                      path="/services"
                      element={
                        <>
                          <Header />
                          <main className="flex-grow">
                            <Services />
                          </main>
                          <Footer />
                        </>
                      }
                    />
                    <Route
                      path="/apply"
                      element={
                        <>
                          <Header />
                          <main className="flex-grow">
                            <Apply />
                          </main>
                          <Footer />
                        </>
                      }
                    />
                    <Route
                      path="/contact"
                      element={
                        <>
                          <Header />
                          <main className="flex-grow">
                            <Contact />
                          </main>
                          <Footer />
                        </>
                      }
                    />

                    {/* Admin Routes */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route
                      path="/admin"
                      element={
                        <AdminProfileProvider>
                          <AdminProtected>
                            <>
                              <AutoLogout />
                              <AdminLayout />
                            </>
                          </AdminProtected>
                        </AdminProfileProvider>
                      }
                    >
                      <Route index element={<AdminDashboard />} />
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="services" element={<AdminServices />} />
                      <Route path="reviews" element={<AdminReviews />} />
                      <Route path="whatsapp" element={<AdminWhatsApp />} />
                    </Route>
                  </Routes>
                </div>
              </HashRouter>
            </ServiceProvider>
          </AdminProfileProvider>
        </AdminProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
