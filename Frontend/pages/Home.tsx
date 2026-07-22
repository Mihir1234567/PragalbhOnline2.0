import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Shield,
  Star,
  Users,
  Calendar,
  Briefcase,
} from "lucide-react";
import { motion, useInView, animate } from "framer-motion";
import { useLanguage } from "../context/LanguageContext";
import { useServices } from "../context/ServiceContext";
import ServiceCard from "../components/ServiceCard";
import Testimonials from "../components/Testimonials";
import api from "../lib/client";
const Counter = ({
  from,
  to,
  suffix,
}: {
  from: number;
  to: number;
  suffix?: string;
}) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(nodeRef, { once: true });

  useEffect(() => {
    if (inView) {
      const node = nodeRef.current;
      const controls = animate(from, to, {
        duration: 2,
        onUpdate(value) {
          if (node) node.textContent = Math.floor(value) + (suffix || "");
        },
      });
      return () => controls.stop();
    }
  }, [from, to, inView, suffix]);

  return <span ref={nodeRef} />;
};

const Home: React.FC = () => {
  const { language, t } = useLanguage();
  const { services, isLoading: isServicesLoading } = useServices();

  const featuredServices = services.slice(0, 4);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const [stats, setStats] = React.useState<any[]>([]);
  const [isStatsLoading, setIsStatsLoading] = React.useState(true);

  useEffect(() => {
    const fetchData = async (retries = 3, delay = 1000) => {
      setIsStatsLoading(true);
      for (let i = 0; i < retries; i++) {
        try {
          const statsRes = await api.get("/stats");
          setStats(statsRes.data);
          setIsStatsLoading(false);
          return;
        } catch (error) {
          console.error(
            `Failed to fetch home data (Attempt ${i + 1}/${retries})`,
            error
          );
          if (i < retries - 1) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
      setIsStatsLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-900 to-primary-800 text-white py-12 md:py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] opacity-10 bg-cover bg-center" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-tight mb-6"
            >
              {t("hero.title")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-primary-100 mb-8 max-w-2xl leading-relaxed"
            >
              {t("hero.subtitle")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4"
            >

              <Link
                to="/services"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-primary-500/30 transition-all transform hover:-translate-y-0.5"
              >
                {t("hero.cta")}
                <ArrowRight className="ml-2" size={20} />
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-lg transition-all"
              >
                {t("hero.secondary_cta")}
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white dark:bg-slate-800 py-12 border-b border-slate-100 dark:border-slate-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {isStatsLoading
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="p-6 animate-pulse">
                    <div className="w-12 h-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded-full mb-4" />
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16 mx-auto mb-2" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mx-auto" />
                  </div>
                ))
              : stats.map((stat) => {
                  const Icon =
                    stat.iconName === "Users"
                      ? Users
                      : stat.iconName === "Calendar"
                      ? Calendar
                      : Briefcase;
                  return (
                    <motion.div
                      key={stat.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      className="p-6"
                    >
                      <div className="w-12 h-12 mx-auto bg-primary-50 rounded-full flex items-center justify-center text-primary-600 mb-4">
                        <Icon size={24} />
                      </div>
                      <h3 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                        {typeof stat.value === "number" ? (
                          <Counter
                            from={0}
                            to={stat.value}
                            suffix={stat.suffix}
                          />
                        ) : (
                          stat.value
                        )}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide text-sm">
                        {stat.label[language] || stat.label["EN"]}
                      </p>
                    </motion.div>
                  );
                })}
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-heading font-bold text-slate-900 dark:text-white mb-3">
                {t("section.our_services")}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 max-w-xl">
                We provide comprehensive documentation support for all your
                personal and business needs.
              </p>
            </div>
            <Link
              to="/services"
              className="hidden md:flex items-center text-primary-600 font-semibold hover:text-primary-700 mt-4 md:mt-0"
            >
              View All Services <ArrowRight size={18} className="ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {isServicesLoading
              ? [1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 h-80 animate-pulse border border-slate-100 dark:border-slate-800"
                  >
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4" />
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4" />
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6" />
                    </div>
                  </div>
                ))
              : featuredServices.map((service) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                  >
                    <ServiceCard service={service} />
                  </motion.div>
                ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link
              to="/services"
              className="inline-flex items-center text-primary-600 font-semibold hover:text-primary-700"
            >
              View All Services <ArrowRight size={18} className="ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-heading font-bold text-slate-900 dark:text-white mb-4">
              {t("section.why_choose_us")}
            </h2>
            <div className="h-1 w-20 bg-primary-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-6 transform rotate-3 hover:rotate-6 transition-transform">
                <Clock size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {t("wcu.fast_title")}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t("wcu.fast_desc")}
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-6 transform -rotate-3 hover:-rotate-6 transition-transform">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {t("wcu.expert_title")}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t("wcu.expert_desc")}
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mx-auto mb-6 transform rotate-3 hover:rotate-6 transition-transform">
                <Shield size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {t("wcu.secure_title")}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t("wcu.secure_desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />
    </div>
  );
};

export default Home;
