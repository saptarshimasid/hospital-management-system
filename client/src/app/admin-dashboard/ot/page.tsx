"use client";
import { API_BASE } from "@/utils/api";

import { useEffect, useState, useRef, useContext } from "react";
import { SearchContext } from "../layout";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Scissors,
  CheckCircle,
  AlertCircle,
  Plus,
  TrendingUp,
  User,
  Search,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Play,
  Check,
  Calendar,
  Clock,
  Activity
} from "lucide-react";

interface SurgeryCase {
  id: string;
  room: string;
  patientName: string;
  surgeon: string;
  procedure: string;
  time: string;
  status: "scheduled" | "in progress" | "completed" | "cancelled";
  img: string;
  gender?: string;
  age?: number;
}

interface Surgeon {
  name: string;
  status: "available" | "in-ot" | "consultation" | "off-duty";
  room?: string;
  img: string;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error";
}

export default function OTPage() {
  const [surgeries, setSurgeries] = useState<SurgeryCase[]>([]);
  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);

  interface Patient {
    name: string;
    gender: string;
    age: number;
  }
  const [patients, setPatients] = useState<Patient[]>([]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const searchTerm = searchQuery;
  const setSearchTerm = setSearchQuery;
  const [showModal, setShowModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Form states
  const [formPatientName, setFormPatientName] = useState("");
  const [formSuite, setFormSuite] = useState("OT Suite 1");
  const [formSurgeon, setFormSurgeon] = useState("");
  const [formProcedure, setFormProcedure] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("11:00");
  const [formGender, setFormGender] = useState("Male");
  const [formAge, setFormAge] = useState("");
  const [displayDate, setDisplayDate] = useState("");

  const statsContainerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Set local machine date on mount and load surgeries
  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    fetchSurgeries();
    fetchSurgeons();
    fetchPatients();
  }, []);

  async function fetchPatients() {
    try {
      const res = await fetch(`${API_BASE}/api/patients`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.error("Failed to load patients from Database", err);
    }
  }

  async function fetchSurgeons() {
    try {
      const res = await fetch(`${API_BASE}/api/doctors`);
      if (res.ok) {
        const data = await res.json();
        const surgeonList = data.map((item: any) => ({
          name: item.name,
          status: item.status === "busy" ? "in-ot" : item.status === "consulting" ? "consultation" : item.status,
          img: item.img || "https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o"
        }));
        setSurgeons(surgeonList);
        if (surgeonList.length > 0 && !formSurgeon) {
          setFormSurgeon(surgeonList[0].name);
        }
      }
    } catch (err) {
      console.error("Failed to load surgeons from Database", err);
    }
  }

  async function fetchSurgeries() {
    try {
      const res = await fetch(`${API_BASE}/api/surgeries`);
      if (res.ok) {
        const data = await res.json();
        setSurgeries(data.map((item: any) => ({
          ...item,
          id: item._id || item.id
        })));
      }
    } catch (err) {
      console.error("Failed to load surgeries from Database", err);
    }
  }


  // Animate stats cards on mount
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

  // Sync Dialog state
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

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const avatars = [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDmVsYcVmImeZHkXR5iUfIXPI5aazV4igMcaxMipsm2kMl5kuVusqoSIq-_yNJFvRtmx8XT825hAdfxKHm-uLdedCQx8UUlPTKptmJMQ2djWKfH3-GAkQcOrF3HxxoeEyJZQGfYd1IbXEdL0CnvJRvSHAnNzMaCI7UtJec2u2omFQCj1GWZZ2pRt9XNSCO4eoCRCrG-bXSl5ofe3yq-gt_OF0pG-A3Xnf-SFBpyhOtZip_ULAYFhioMcc4K9XMrYT3Q59FkV-OTwBw",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBDN3UVTzPzv0Af2e0RzKnIIEO4r9e__EQuYHMnJvh8UWv-6lnXFoZRlJKfi3IvG3LLUscX7j-SPCjcEm0KgmjBmAnhC72OshfvEi8pRB-SQCzdTNWkTSsMT7kZitjLz-d3s3iLxtJfFw-iLSvTcA9S0n-tUmzRtM2g-S0qOEN1qSdigBzn5aT2mtV550DjEN1kz_ZLg95eUGLgGJM4N9nVwt2TYQZfAYgh1xulrJwbYA7exPFK3j0QF1bsBBtzt0yyWHaVnLn9wik",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA23_Q91hh10bCN4f7gJMFJprKGgpdptxHMK6c2eIhhcE7Q1TwIjwKEdPjyA9YYKSl032mfuO_o3N6s9MQFH4wr0DGj2Us5Wp0mJFGwNWwhDCBhrD0RbRv1QbKMm8J2aKhnnm1_ZAcm530LQcyGmWwAtM2GziqffApwuWxx8-KpmpGPPZAucb8LNGMiTBmoS0xf4dEgNGrr--uC1FJxMybebjelAz2aB0FssgL75f3n8a9Tl3FPaC4cu6ASoSH5rEHOXQ85i2rHMq8",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBzLc-0PWFHLrfwLUNgEq48dDtFLusQjORiJhyAfCUgvYExrc_n6uN6rkyJlK8Go7hirf_te7NG-fXD7XDbC2gCGoWXKCdkwl5DOrUlMVwbhj_OFawGKER3rxK1fs9605FDUh5HTfYITdo2tEHU_nEKhkQWf7FZ-pbWIXWfiiyTnaUqFGgOeG_2yOARP6sroNOt-E1ylF-DrJCdHkMoHImiKHjK3kAQ0HKnDU08iq7uKukIFsUGRNdex7d0xSkceUiMAnPVp6g5ecg"
    ];
    const avatarUrl = avatars[Math.floor(Math.random() * avatars.length)];

    const payload = {
      room: formSuite,
      patientName: formPatientName,
      surgeon: formSurgeon,
      procedure: formProcedure,
      time: `${formStartTime} - ${formEndTime}`,
      status: "scheduled",
      img: avatarUrl,
      gender: formGender,
      age: parseInt(formAge) || 0,
    };

    try {
      const res = await fetch(`${API_BASE}/api/surgeries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to schedule surgery");
      await fetchSurgeries();
      triggerToast("Procedure Scheduled", `Successfully scheduled surgery for ${formPatientName} with ${formSurgeon}.`);
    } catch (err) {
      console.error(err);
      triggerToast("Booking Error", "Failed to schedule surgery in Database.", "error");
    }

    setShowModal(false);

    // Reset Form
    setFormPatientName("");
    setFormSuite("OT Suite 1");
    setFormSurgeon("");
    setFormProcedure("");
    setFormStartTime("09:00");
    setFormEndTime("11:00");
    setFormGender("Male");
    setFormAge("");
  };

  const changeCaseStatus = async (id: string, nextStatus: "in progress" | "completed") => {
    try {
      const res = await fetch(`${API_BASE}/api/surgeries/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) throw new Error("Failed to change status");
      
      const updatedCase = await res.json();
      await fetchSurgeries();

      if (nextStatus === "in progress") {
        triggerToast("Procedure Started", `Surgical procedure for ${updatedCase.patientName} has started.`);
        // Set doctor status to in-ot
        setSurgeons((prevS) =>
          prevS.map((s) =>
            s.name === updatedCase.surgeon
              ? { ...s, status: "in-ot", room: updatedCase.room }
              : s
          )
        );
      } else if (nextStatus === "completed") {
        triggerToast(
          "Procedure Completed",
          `Surgical case for ${updatedCase.patientName} was closed. Patient transferred to Recovery.`
        );
        // Set doctor status back to available
        setSurgeons((prevS) =>
          prevS.map((s) =>
            s.name === updatedCase.surgeon
              ? { ...s, status: "available", room: undefined }
              : s
          )
        );
      }
    } catch (err) {
      console.error(err);
      triggerToast("Status Error", "Failed to update surgery in Database.", "error");
    }
  };

  const cancelCase = async (id: string, patientName: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/surgeries/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete surgery case");
      await fetchSurgeries();
      triggerToast("Case Cancelled", `Surgery for ${patientName} was cancelled and removed.`, "error");
    } catch (err) {
      console.error(err);
      triggerToast("Cancellation Error", "Failed to remove surgery from Database.", "error");
    }
  };

  const filteredSurgeries = surgeries.filter((c) => {
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesSearch =
      c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.procedure.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.surgeon.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.room.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "in progress":
        return "bg-error/10 text-error border border-error/20";
      case "completed":
        return "bg-tertiary-container/10 text-tertiary-container border border-tertiary-container/20";
      case "scheduled":
        return "bg-primary-container/10 text-primary-container border border-primary-container/20";
      default:
        return "bg-on-surface-variant/10 text-on-surface-variant border border-white/5";
    }
  };

  const getSurgeonStatusDot = (status: string) => {
    switch (status) {
      case "available":
        return "bg-tertiary-container";
      case "in-ot":
        return "bg-error";
      case "consultation":
        return "bg-[#e8a317]";
      default:
        return "bg-on-surface-variant/40";
    }
  };

  // Stats calculation
  const totalProcedures = surgeries.length;
  const activeOTs = surgeries.filter((c) => c.status === "in progress").length;
  const emergencyCases = surgeries.filter((c) => c.procedure.toLowerCase().includes("emergency") || c.procedure.toLowerCase().includes("trauma")).length;
  const surgeonsOnDuty = surgeons.filter(s => s.status !== "off-duty").length;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-primary">OT Command Center</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Real-time operating theatre scheduling, surgical procedure logs, and statuses.
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
            Schedule Surgery
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div ref={statsContainerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
              <Scissors className="w-4 h-4" />
            </div>
            {totalProcedures > 0 && (
              <span className="text-[10px] text-tertiary-container font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
              </span>
            )}
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Total Procedures</p>
            <h3 className="text-xl font-bold mt-1">{totalProcedures}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-[#00f0ff]/15 flex items-center justify-center text-[#00f0ff]">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-secondary-container font-bold">
              {Math.round((activeOTs / 50) * 100)}% load
            </span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Active OTs</p>
            <h3 className="text-xl font-bold mt-1">{activeOTs} / 50</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-error/15 flex items-center justify-center text-error">
              <AlertCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-error font-bold">Active</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Emergency Cases</p>
            <h3 className="text-xl font-bold mt-1">{emergencyCases}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Surgeons on Duty</p>
            <h3 className="text-xl font-bold mt-1">{surgeonsOnDuty}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-[#e8a317]/15 flex items-center justify-center text-[#e8a317]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Avg Procedure</p>
            <h3 className="text-xl font-bold mt-1">{surgeries.length > 0 ? (() => { const durations = surgeries.map(s => { const parts = s.time.split(' - '); if (parts.length === 2) { const [sh, sm] = parts[0].split(':').map(Number); const [eh, em] = parts[1].split(':').map(Number); return (eh * 60 + em) - (sh * 60 + sm); } return 0; }).filter(d => d > 0); return durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : '--'; })() : '--'} mins</h3>
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
                  placeholder="Search surgeries, patients, or rooms..."
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
                <option value="all">All Statuses</option>
                <option value="in progress">In Progress</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-on-surface-variant/80 border-b border-white/5 font-medium uppercase tracking-wider text-[9px]">
                  <th className="pb-3.5">OT Room</th>
                  <th className="pb-3.5">Patient Name</th>
                  <th className="pb-3.5">Surgeon</th>
                  <th className="pb-3.5">Procedure</th>
                  <th className="pb-3.5">Time</th>
                  <th className="pb-3.5">Status</th>
                  <th className="pb-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence initial={false}>
                  {filteredSurgeries.map((c) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="py-3 font-mono text-[10px] text-primary font-bold">{c.room}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={c.img || "https://lh3.googleusercontent.com/aida-public/AB6AXuDmVsYcVmImeZHkXR5iUfIXPI5aazV4igMcaxMipsm2kMl5kuVusqoSIq-_yNJFvRtmx8XT825hAdfxKHm-uLdedCQx8UUlPTKptmJMQ2djWKfH3-GAkQcOrF3HxxoeEyJZQGfYd1IbXEdL0CnvJRvSHAnNzMaCI7UtJec2u2omFQCj1GWZZ2pRt9XNSCO4eoCRCrG-bXSl5ofe3yq-gt_OF0pG-A3Xnf-SFBpyhOtZip_ULAYFhioMcc4K9XMrYT3Q59FkV-OTwBw"}
                            alt={c.patientName}
                            className="w-7 h-7 rounded-full border border-white/10 object-cover"
                          />
                          <span className="font-semibold text-on-surface">{c.patientName}</span>
                        </div>
                      </td>
                      <td className="py-3 text-on-surface">{c.surgeon}</td>
                      <td className="py-3 text-on-surface-variant">{c.procedure}</td>
                      <td className="py-3 text-on-surface font-semibold">{c.time}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeClass(c.status)}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          {c.status === "scheduled" && (
                            <>
                              <button
                                onClick={() => changeCaseStatus(c.id, "in progress")}
                                title="Start Surgery"
                                className="p-1.5 rounded-lg bg-surface-container border border-white/5 hover:bg-primary-container/10 hover:border-primary-container/20 text-on-surface-variant hover:text-primary-container transition-all cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => cancelCase(c.id, c.patientName)}
                                title="Cancel Case"
                                className="p-1.5 rounded-lg bg-surface-container border border-white/5 hover:bg-error/10 hover:border-error/20 text-on-surface-variant hover:text-error transition-all cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {c.status === "in progress" && (
                            <button
                              onClick={() => changeCaseStatus(c.id, "completed")}
                              title="Complete Surgery"
                              className="p-1.5 rounded-lg bg-surface-container border border-white/5 hover:bg-tertiary-container/10 hover:border-tertiary-container/20 text-on-surface-variant hover:text-tertiary-container transition-all cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {c.status === "completed" && (
                            <span className="text-[10px] text-on-surface-variant italic px-2">Completed</span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Surgeon Status Roster */}
        <div className="col-span-12 lg:col-span-3 glass-card rounded-2xl p-6 inner-glow flex flex-col h-full">
          <h4 className="text-sm font-bold text-primary">Surgeons Ledger</h4>
          <p className="text-[10px] text-on-surface-variant mt-0.5 mb-6">Live scrub statuses</p>
          <div className="space-y-4 flex-1">
            {surgeons.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high/20 border border-white/5 transition-all">
                <div className="relative">
                  <img src={s.img || "https://lh3.googleusercontent.com/aida-public/AB6AXuBUR93vsX8-PeJEf1vGo8anymPqpciIEu9_x9IjqrdZVQwRFInWdZrZh6EzF98zhcTAmu_qo75Zgq62h2u1qhebSvRpv8x9AdnDALYA2yPyr7nokvD2GDDZcOQynWOdukWkeiebcJhfXbKTWxTKwBvrfayAZQVJWFzwXqW01XzNzkzLnGnX6VWvfWZzXmROwFxKzACpOmHaTRUfrTcmj9buFrYebCfW0MG8AUWnuLh0dNVA-DRbYj5WYsqfFohmMdu7i7c3SPhaaDI"} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-white/5" />
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface ${getSurgeonStatusDot(s.status)}`} />
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-[11px] font-semibold truncate">{s.name}</p>
                  <p className="text-[9px] text-on-surface-variant font-mono uppercase truncate">
                    {s.status === "in-ot" ? `Scrubbed • ${s.room}` : s.status}
                  </p>
                </div>
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
            <h3 className="text-sm font-bold text-primary">Schedule Surgery Case</h3>
            <p className="text-[10px] text-on-surface-variant">Register a new OR procedure slot</p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-on-surface-variant hover:text-error transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleBookingSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Patient Name</label>
            <select
              required
              value={formPatientName}
              onChange={(e) => {
                const selectedName = e.target.value;
                setFormPatientName(selectedName);
                const selectedPatient = patients.find(p => p.name === selectedName);
                if (selectedPatient) {
                  setFormGender(selectedPatient.gender || "Male");
                  setFormAge(selectedPatient.age ? String(selectedPatient.age) : "");
                }
              }}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff] cursor-pointer"
            >
              <option value="" disabled>Select Admitted Patient</option>
              {patients.map((p, idx) => (
                <option key={idx} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Gender</label>
              <select
                value={formGender}
                onChange={(e) => setFormGender(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff] cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Age</label>
              <input
                type="number"
                required
                min="0"
                max="150"
                value={formAge}
                onChange={(e) => setFormAge(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
                placeholder="e.g. 35"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Procedure Suite</label>
              <select
                value={formSuite}
                onChange={(e) => setFormSuite(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff] cursor-pointer"
              >
                {Array.from({ length: 50 }, (_, i) => `OT Suite ${i + 1}`).map((suite) => (
                  <option key={suite} value={suite}>{suite}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Surgeon Assigned</label>
              <select
                value={formSurgeon}
                onChange={(e) => setFormSurgeon(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff] cursor-pointer"
              >
                {surgeons.length > 0 ? surgeons.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                )) : (
                  <option value="">No surgeons available</option>
                )}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Surgical Procedure</label>
            <input
              type="text"
              required
              value={formProcedure}
              onChange={(e) => setFormProcedure(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
              placeholder="e.g. Hernia Repair"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Start Time</label>
              <input
                type="time"
                required
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">End Time</label>
              <input
                type="time"
                required
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
              />
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
              Confirm Schedule <ShieldCheck className="w-4 h-4" />
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
