"use client";
import { API_BASE } from "@/utils/api";

import { useState, useEffect, useRef, createContext } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Bed,
  Scissors,
  User,
  Users,
  Briefcase,
  Pill,
  Utensils,
  DollarSign,
  TrendingUp,
  BarChart,
  Settings,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  Activity
} from "lucide-react";
import SmoothScroll from "../components/SmoothScroll";
import CopilotChat from "../components/CopilotChat";

export const SearchContext = createContext<{
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}>({
  searchQuery: "",
  setSearchQuery: () => {},
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  interface DBNotification {
    _id?: string;
    id?: string;
    text: string;
    type: string;
    time: string;
    read: boolean;
  }
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.map((n: any) => ({ ...n, id: n._id || n.id })));
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: "POST"
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true })
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const navigationItems = [
    { name: "Dashboard", href: "/admin-dashboard", icon: LayoutDashboard },
    { name: "Appointments", href: "/admin-dashboard/appointments", icon: Calendar },
    { name: "Bed Availability", href: "/admin-dashboard/bed-availability", icon: Bed },
    { name: "OT", href: "/admin-dashboard/ot", icon: Scissors },
    { name: "Doctor", href: "/admin-dashboard/doctor", icon: User },
    { name: "Patients", href: "/admin-dashboard/patients", icon: Users },
    { name: "Staff", href: "/admin-dashboard/staff", icon: Briefcase },
    { name: "Pharmacy", href: "/admin-dashboard/pharmacy", icon: Pill },
    { name: "Diagnosis", href: "/admin-dashboard/diagnosis", icon: Activity },
    { name: "Pantry", href: "/admin-dashboard/pantry", icon: Utensils },
    { name: "Billing", href: "/admin-dashboard/billing", icon: DollarSign },
    { name: "Revenue", href: "/admin-dashboard/revenue", icon: TrendingUp },
    { name: "Reports", href: "/admin-dashboard/reports", icon: BarChart },
    { name: "Settings", href: "#", icon: Settings },
  ];

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      <SmoothScroll>
        <div className="min-h-screen bg-[#0b1326] flex text-[#dae2fd]">
        
        {/* Sidebar Navigation */}
        <aside className={`w-72 fixed left-0 top-0 h-screen bg-[#0b1326]/95 border-r border-white/10 shadow-2xl flex flex-col py-6 z-40 select-none transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}>
          <div className="px-6 mb-10 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#00f0ff] animate-pulse" />
                Health Copilot
              </h1>
              <p className="text-[10px] text-on-surface-variant opacity-70 uppercase tracking-widest mt-1">
                Medical Command Center
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-white/5 hover:text-error transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto custom-scrollbar">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-6 py-3.5 transition-all text-xs ${
                    isActive
                      ? "text-tertiary-container border-l-4 border-tertiary-container bg-tertiary-container/5 font-semibold"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto px-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high/40 border border-white/5">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o"
                alt="Profile Portrait"
                className="w-10 h-10 rounded-full border border-primary/20 object-cover"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate">Dr. Sarah Jenkins</p>
                <p className="text-[9px] uppercase tracking-wider text-primary opacity-70">Chief Medical Officer</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Sidebar backdrop overlay for mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-fade-in"
          />
        )}

        {/* Top Header */}
        <header className="fixed top-0 right-0 w-full md:w-[calc(100%-18rem)] h-20 z-20 bg-[#0b1326]/30 backdrop-blur-md border-b border-white/5 flex justify-between items-center px-4 md:px-10 shadow-sm">
          <div className="flex items-center gap-2 flex-1 md:flex-initial">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-on-surface-variant hover:bg-white/5 border border-white/5 mr-2 cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative w-full max-w-[24rem]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 opacity-60" />
              <input
                type="text"
                placeholder="Search patients, medical records, or doctors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/5 rounded-full py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-primary/50 text-on-surface placeholder-on-surface-variant/40 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-white/5 transition-all relative border border-white/5 cursor-pointer"
              >
                <span className="material-symbols-outlined !text-xl">notifications</span>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-error text-white font-extrabold text-[8px] w-4.5 h-4.5 flex items-center justify-center rounded-full animate-pulse select-none border border-[#0b1326] px-1">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-80 glass-card bg-[#0b1326]/95 border border-white/10 rounded-2xl shadow-2xl p-4 z-50 text-xs text-[#dae2fd]"
                  >
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                      <span className="font-bold text-primary">Clinical Alerts</span>
                      {notifications.some(n => !n.read) && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[10px] text-primary-container hover:underline cursor-pointer font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar select-text">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-on-surface-variant opacity-60">No new alerts</div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id || n._id}
                            onClick={() => markAsRead(n.id || n._id || "")}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                              n.read 
                                ? "bg-white/2 border-white/5 opacity-60" 
                                : "bg-primary-container/5 border-primary-container/20 hover:bg-primary-container/10"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <p className={`font-medium ${n.read ? "text-on-surface-variant" : "text-primary"}`}>
                                {n.text}
                              </p>
                              <span className="text-[8px] text-on-surface-variant font-mono shrink-0">{n.time}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                              <span className={`text-[8px] uppercase tracking-wider font-bold ${
                                n.type === 'urgent' ? 'text-error' : n.type === 'success' ? 'text-tertiary-container' : 'text-primary-container'
                              }`}>
                                {n.type}
                              </span>
                              {!n.read && <span className="w-1.5 h-1.5 bg-[#00f0ff] rounded-full" />}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-full overflow-hidden border border-white/10 hover:bg-white/5 transition-all">
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o" alt="Profile" className="w-full h-full object-cover" />
            </button>
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-white/5 transition-all border border-white/5">
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Main Content Layout Container */}
        <main className="ml-0 md:ml-72 pt-28 px-4 md:px-10 pb-12 w-full md:w-[calc(100%-18rem)] min-h-screen">
          {children}
        </main>

        {/* Floating AI Clinical Copilot Chat Widget */}
        <CopilotChat />
      </div>
    </SmoothScroll>
  </SearchContext.Provider>
  );
}
