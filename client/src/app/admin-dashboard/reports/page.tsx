"use client";
import { API_BASE } from "@/utils/api";

import { useEffect, useState, useRef, useContext } from "react";
import { SearchContext } from "../layout";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  BarChart,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Download,
  Terminal,
  Calendar,
  Layers,
  FileSpreadsheet,
  FileCheck
} from "lucide-react";

interface Report {
  id: string;
  name: string;
  category: "Clinical" | "Financial" | "Operational";
  date: string;
  size: string;
  author: string;
}

interface LogMessage {
  id: string;
  timestamp: string;
  text: string;
  type: "info" | "success" | "warn";
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error";
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [doctors, setDoctors] = useState<{name: string}[]>([]);
  const [loading, setLoading] = useState(true);

  const [logs, setLogs] = useState<LogMessage[]>([
    { id: "log-1", timestamp: "19:15:01", text: "GET /api/v1/patient/metrics - 200 OK", type: "success" },
    { id: "log-2", timestamp: "19:15:02", text: "POST /api/v1/clinical/graph - Classify Node Class A", type: "info" },
    { id: "log-3", timestamp: "19:15:05", text: "WARN Bed census threshold reached in Ward-C", type: "warn" },
    { id: "log-4", timestamp: "19:15:10", text: "CRON /audit-sync - Run database snapshot sync...", type: "info" },
  ]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const searchTerm = searchQuery;
  const setSearchTerm = setSearchQuery;
  const [showModal, setShowModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Form states
  const [formReportName, setFormReportName] = useState("");
  const [formCategory, setFormCategory] = useState<"Clinical" | "Financial" | "Operational">("Clinical");
  const [formAuthor, setFormAuthor] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formSize, setFormSize] = useState("1.2 MB");
  const [displayDate, setDisplayDate] = useState("");

  const statsContainerRef = useRef<HTMLDivElement>(null);
  const logStreamRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.map((r: any) => ({
          ...r,
          id: r._id || r.id
        })));
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
      triggerToast("Network Error", "Could not fetch reports from Database.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Set local machine date on mount
  useEffect(() => {
    const today = new Date();
    setDisplayDate(today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    setFormDate(today.toISOString().split("T")[0]);
    fetchReports();
    fetchDoctors();
  }, []);

  async function fetchDoctors() {
    try {
      const res = await fetch(`${API_BASE}/api/doctors`);
      if (res.ok) {
        const data = await res.json();
        setDoctors(data.map((d: any) => ({ name: d.name })));
      }
    } catch (err) {
      console.error("Failed to load doctors for author dropdown", err);
    }
  }

  // Stats calculation
  const clinicalAudits = reports.filter((r) => r.category === "Clinical").length;
  const systemUptime = "99.98%";
  const reportsExported = reports.filter((r) => r.id.startsWith("exported-")).length;
  const pendingReviews = reports.length;

  useEffect(() => {
    if (statsContainerRef.current) {
      const cards = statsContainerRef.current.children;
      gsap.fromTo(
        cards,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.1,
          duration: 0.6,
          ease: "power2.out",
        }
      );
    }
  }, []);

  // Set up live logger ticker
  useEffect(() => {
    const logMessages = [
      "GET /api/v1/telemetry/stats - 200 OK",
      "POST /api/v1/copilot/message - AI classified successfully",
      "WARN DB pool connection capacity at 82%",
      "INFO Executed cron sync check...",
      "GET /api/v1/appointments/today - 200 OK"
    ];

    const interval = setInterval(() => {
      const selected = logMessages[Math.floor(Math.random() * logMessages.length)];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      
      let type: "info" | "success" | "warn" = "info";
      if (selected.includes("200 OK")) type = "success";
      else if (selected.includes("WARN")) type = "warn";

      const newLog: LogMessage = {
        id: `log-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: timeStr,
        text: selected,
        type: type,
      };

      setLogs((prev) => {
        const updated = [...prev, newLog];
        // Limit log array size to 25 to avoid memory leak
        return updated.slice(-25);
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logStreamRef.current) {
      logStreamRef.current.scrollTop = logStreamRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (showModal) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [showModal]);

  const triggerToast = (title: string, message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formReportName,
      category: formCategory,
      date: formDate,
      size: formSize,
      author: formAuthor
    };

    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to generate report");
      
      triggerToast("Report Generated", `Draft for "${formReportName}" has been saved to Database.`);
      await fetchReports();
    } catch (err) {
      console.error(err);
      triggerToast("Error Generating Report", "Could not save report to Database.", "error");
    }

    setShowModal(false);
    // Reset Form
    setFormReportName("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormSize("1.2 MB");
  };

  const simulateDownload = (name: string, id: string) => {
    // Add exported tracking
    if (!id.startsWith("exported-")) {
      const exportId = `exported-${id}`;
      // Just to update state counter locally
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, id: exportId } : r));
    }
    triggerToast("Report Exported", `File "${name}.xlsx" compiled and downloaded to local machine.`);
  };

  const filteredReports = reports.filter((r) => {
    const matchesCategory = statusFilter === "all" || r.category.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getLogColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-[#62fae3]";
      case "warn":
        return "text-[#e8a317]";
      default:
        return "text-[#dae2fd]/70";
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-primary">System Telemetry & Reports</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Access operational metrics digests, clinical audits logs, and system console logs.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-surface-container-high border border-white/5 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-surface-variant/40 transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            {displayDate}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-primary-container to-secondary-container text-on-primary font-bold px-5 py-2 rounded-xl text-xs hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-1.5 active-glow cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Generate Custom Report
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div ref={statsContainerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Clinical Audits</p>
            <h3 className="text-xl font-bold mt-1">{clinicalAudits}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-tertiary-container/15 flex items-center justify-center text-tertiary-container">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-tertiary-container font-bold">Optimal</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">System Uptime</p>
            <h3 className="text-xl font-bold mt-1">{systemUptime}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-secondary-container/15 flex items-center justify-center text-secondary-container">
              <Download className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Reports Exported</p>
            <h3 className="text-xl font-bold mt-1">{reportsExported}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Pending Reviews</p>
            <h3 className="text-xl font-bold mt-1">{pendingReviews}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
              <BarChart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Diagnostic Acc.</p>
            <h3 className="text-xl font-bold mt-1">98.9%</h3>
          </div>
        </div>
      </div>

      {/* Workspace Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Table Column */}
        <div className="col-span-12 lg:col-span-9 glass-card rounded-2xl p-6 inner-glow">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-3.5 h-3.5 opacity-60" />
                <input
                  type="text"
                  placeholder="Search report name, author, or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#060e20]/60 border border-white/5 rounded-full py-1.5 pl-9 pr-4 text-xs focus:ring-1 focus:ring-primary/50 text-on-surface placeholder-on-surface-variant/40 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-on-surface-variant" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-container/60 border border-white/5 text-[11px] rounded-lg py-1 px-2.5 focus:ring-1 focus:ring-primary text-on-surface focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="Clinical">Clinical</option>
                <option value="Financial">Financial</option>
                <option value="Operational">Operational</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-on-surface-variant">Accessing clinical database archives...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-20 text-on-surface-variant/60 text-xs">
                No matching telemetry reports found in Database.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-on-surface-variant/80 border-b border-white/5 font-medium uppercase tracking-wider text-[9px]">
                    <th className="pb-3.5">Report Name</th>
                    <th className="pb-3.5">Category</th>
                    <th className="pb-3.5">Generated Date</th>
                    <th className="pb-3.5">File Size</th>
                    <th className="pb-3.5">Author</th>
                    <th className="pb-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence initial={false}>
                    {filteredReports.map((rep) => (
                      <motion.tr
                        key={rep.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.3 }}
                        className="hover:bg-white/5 transition-colors group"
                      >
                        <td className="py-3 font-semibold text-on-surface">{rep.name}</td>
                        <td className="py-3 text-on-surface-variant">{rep.category}</td>
                        <td className="py-3 text-on-surface font-semibold">{rep.date}</td>
                        <td className="py-3 font-mono text-[10px] text-on-surface-variant">{rep.size}</td>
                        <td className="py-3 text-on-surface-variant">{rep.author}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => simulateDownload(rep.name, rep.id)}
                            className="p-1.5 rounded-lg bg-surface-container border border-white/5 hover:bg-primary-container/10 hover:border-primary-container/20 text-on-surface-variant hover:text-primary-container transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Command Console feed */}
        <div className="col-span-12 lg:col-span-3 glass-card rounded-2xl p-6 inner-glow flex flex-col h-[400px]">
          <h4 className="text-sm font-bold text-primary flex items-center gap-1.5">
            <Terminal className="w-4 h-4" /> Command Console
          </h4>
          <p className="text-[10px] text-on-surface-variant mt-0.5 mb-4">System server telemetry</p>
          <div ref={logStreamRef} className="flex-1 overflow-y-auto space-y-3 custom-scrollbar text-[9px] font-mono select-text">
            {logs.map((log) => (
              <div key={log.id} className={getLogColor(log.type)}>
                [{log.timestamp}] {log.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HTML5 Booking Dialog Modal */}
      <dialog
        ref={dialogRef}
        onClose={() => setShowModal(false)}
        className="glass-card p-6 rounded-2xl w-full max-w-lg bg-[#0b1326]/95 border border-white/10 text-[#dae2fd] shadow-2xl backdrop-blur-xl focus:outline-none m-auto backdrop:bg-[#0b1326]/60 backdrop:backdrop-blur-sm"
        onClick={(e) => {
          const dialog = dialogRef.current;
          if (!dialog) return;
          const rect = dialog.getBoundingClientRect();
          const isInDialog = (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          );
          if (!isInDialog) {
            setShowModal(false);
          }
        }}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent" />
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
          <div>
            <h3 className="text-sm font-bold text-primary">Generate Custom Report</h3>
            <p className="text-[10px] text-on-surface-variant">Export system datasets and clinical telemetry</p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-on-surface-variant hover:text-error transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleReportSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Report Name</label>
            <input
              type="text"
              required
              value={formReportName}
              onChange={(e) => setFormReportName(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
              placeholder="e.g. Bed Occupancy Audit"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
              >
                <option value="Clinical">Clinical</option>
                <option value="Financial">Financial</option>
                <option value="Operational">Operational</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Author</label>
              <select
                value={formAuthor}
                onChange={(e) => setFormAuthor(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
              >
                {doctors.length > 0 ? doctors.map((d) => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                )) : (
                  <option value="">No doctors available</option>
                )}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Date Created</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">File Size Limit</label>
              <select
                value={formSize}
                onChange={(e) => setFormSize(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
              >
                <option value="1.2 MB">Standard (1-2 MB)</option>
                <option value="820 KB">Compressed (800 KB)</option>
                <option value="4.5 MB">Heavy (4-5 MB)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-white/10 rounded-xl text-xs text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-primary-container to-[#14d1ff] text-on-primary font-bold px-5 py-2 rounded-xl text-xs hover:brightness-110 active:scale-[0.98] transition-all active-glow flex items-center gap-1 cursor-pointer"
            >
              Compile & Export <ShieldCheck className="w-4 h-4" />
            </button>
          </div>
        </form>
      </dialog>

      {/* Global Glassmorphic Toasts Overlay */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none select-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={`glass-card p-4 rounded-xl flex items-start gap-3 w-80 shadow-2xl pointer-events-auto border`}
              style={{
                borderColor: toast.type === "success" ? "rgba(0, 240, 255, 0.3)" : "rgba(255, 180, 171, 0.3)",
              }}
            >
              {toast.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-primary-container mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-error mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-xs font-bold text-on-surface">{toast.title}</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">{toast.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
