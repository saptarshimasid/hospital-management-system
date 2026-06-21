"use client";
import { API_BASE } from "@/utils/api";

import { useState, useEffect, useRef, createContext } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";
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

  // User Profile State and Modal controls
  const defaultProfile = {
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o",
    name: "Dr. Sarah Jenkins",
    age: 42,
    email: "sarah.jenkins@hospital.com",
    designation: "Chief Medical Officer"
  };

  const [profile, setProfile] = useState(defaultProfile);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("user_profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setProfile({
            img: typeof parsed.img === "string" ? parsed.img : defaultProfile.img,
            name: typeof parsed.name === "string" ? parsed.name : defaultProfile.name,
            age: typeof parsed.age === "number" ? parsed.age : (parseInt(parsed.age) || defaultProfile.age),
            email: typeof parsed.email === "string" ? parsed.email : defaultProfile.email,
            designation: typeof parsed.designation === "string" ? parsed.designation : defaultProfile.designation
          });
        }
      } catch (e) {
        console.error("Error loading user profile from localStorage:", e);
      }
    }
  }, []);

  const saveProfile = (newProfile: typeof defaultProfile) => {
    setProfile(newProfile);
    localStorage.setItem("user_profile", JSON.stringify(newProfile));
  };

  useEffect(() => {
    const dialog = profileDialogRef.current;
    if (!dialog) return;

    if (profileOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [profileOpen]);

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

  const clearAllNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/clear-all`, {
        method: "DELETE"
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

  const [navigationItems, setNavigationItems] = useState<any[]>([]);

  const fetchPages = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/pages`);
      if (res.ok) {
        const data = await res.json();
        setNavigationItems(data);
      } else {
        throw new Error();
      }
    } catch (e) {
      setNavigationItems([
        { name: "Dashboard", href: "/admin-dashboard", icon: "LayoutDashboard", status: "active" },
        { name: "Appointments", href: "/admin-dashboard/appointments", icon: "Calendar", status: "active" },
        { name: "Bed Availability", href: "/admin-dashboard/bed-availability", icon: "Bed", status: "active" },
        { name: "OT", href: "/admin-dashboard/ot", icon: "Scissors", status: "active" },
        { name: "Doctor", href: "/admin-dashboard/doctor", icon: "User", status: "active" },
        { name: "Patients", href: "/admin-dashboard/patients", icon: "Users", status: "active" },
        { name: "Staff", href: "/admin-dashboard/staff", icon: "Briefcase", status: "active" },
        { name: "Pharmacy", href: "/admin-dashboard/pharmacy", icon: "Pill", status: "active" },
        { name: "Diagnosis", href: "/admin-dashboard/diagnosis", icon: "Activity", status: "active" },
        { name: "Pantry", href: "/admin-dashboard/pantry", icon: "Utensils", status: "active" },
        { name: "Billing", href: "/admin-dashboard/billing", icon: "DollarSign", status: "active" },
        { name: "Revenue", href: "/admin-dashboard/revenue", icon: "TrendingUp", status: "active" },
        { name: "Reports", href: "/admin-dashboard/reports", icon: "BarChart", status: "active" },
        { name: "Settings", href: "#", icon: "Settings", status: "active" },
      ]);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

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
            {navigationItems.filter(item => item.status !== "inactive").map((item) => {
              const IconComponent = typeof item.icon === "string"
                ? ((Lucide as any)[item.icon] || Lucide.HelpCircle)
                : item.icon;
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
                  <IconComponent className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto px-4 pt-4 border-t border-white/5">
            <div
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high/40 border border-white/5 cursor-pointer hover:bg-white/5 transition-all"
            >
              <img
                src={profile.img || "https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o"}
                alt="Profile Portrait"
                className="w-10 h-10 rounded-full border border-primary/20 object-cover"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate">{profile.name}</p>
                <p className="text-[9px] uppercase tracking-wider text-primary opacity-70">{profile.designation}</p>
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
                      <div className="flex gap-2.5">
                        {notifications.some(n => !n.read) && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[10px] text-primary-container hover:underline cursor-pointer font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            onClick={clearAllNotifications}
                            className="text-[10px] text-error hover:underline cursor-pointer font-medium"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
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
            <button
              onClick={() => setProfileOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full overflow-hidden border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
            >
              <img src={profile.img || "https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o"} alt="Profile" className="w-full h-full object-cover" />
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

        {/* Unified User Profile Dialog Modal */}
        <dialog
          ref={profileDialogRef}
          onClose={() => setProfileOpen(false)}
          className="glass-card p-6 rounded-2xl w-full max-w-md bg-[#0b1326]/95 border border-white/10 text-[#dae2fd] shadow-2xl backdrop-blur-xl focus:outline-none m-auto backdrop:bg-[#0b1326]/60 backdrop:backdrop-blur-sm"
          onClick={(e) => {
            const rect = profileDialogRef.current?.getBoundingClientRect();
            if (rect) {
              const isInDialog = (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
              );
              if (!isInDialog) setProfileOpen(false);
            }
          }}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent" />
          <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
            <div>
              <h3 className="text-sm font-bold text-primary">Edit User Profile</h3>
              <p className="text-[10px] text-on-surface-variant">Update your administrative clinical credentials</p>
            </div>
            <button
              onClick={() => setProfileOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-on-surface-variant hover:text-error transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setProfileOpen(false);
            }}
            className="space-y-4"
          >
            {/* Image Upload Option */}
            <div className="space-y-2">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Profile Portrait</label>
              <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/10">
                <img
                  src={profile.img || "https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o"}
                  alt="Portrait Preview"
                  className="w-12 h-12 rounded-full border border-primary/20 object-cover bg-black/20"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-[#00f0ff] truncate font-mono">
                    {profile.img.startsWith("data:") ? "Uploaded Local Image File" : "Default Image"}
                  </p>
                </div>
              </div>

              <div className="relative flex items-center justify-center border border-dashed border-white/20 hover:border-[#00f0ff]/50 rounded-xl p-3 bg-white/2 hover:bg-[#00f0ff]/5 transition-all cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        saveProfile({ ...profile, img: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="text-center space-y-1 pointer-events-none">
                  <span className="material-symbols-outlined text-[#00f0ff]/80 group-hover:scale-110 transition-transform">cloud_upload</span>
                  <p className="text-[10px] text-on-surface-variant font-semibold">Change Portrait</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Name</label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => saveProfile({ ...profile, name: e.target.value })}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Age</label>
                <input
                  type="number"
                  required
                  value={profile.age}
                  onChange={(e) => saveProfile({ ...profile, age: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Designation</label>
                <input
                  type="text"
                  required
                  value={profile.designation}
                  onChange={(e) => saveProfile({ ...profile, designation: e.target.value })}
                  className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Email Address</label>
              <input
                type="email"
                required
                value={profile.email}
                onChange={(e) => saveProfile({ ...profile, email: e.target.value })}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5 mt-6">
              <button
                type="submit"
                className="bg-gradient-to-r from-primary-container to-[#14d1ff] text-on-primary font-bold px-5 py-2.5 rounded-xl text-xs hover:brightness-110 active:scale-[0.98] transition-all active-glow cursor-pointer"
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        </dialog>
      </div>
    </SmoothScroll>
  </SearchContext.Provider>
  );
}
