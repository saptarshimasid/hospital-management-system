"use client";
import { API_BASE } from "@/utils/api";

import { useEffect, useState, useRef, useContext } from "react";
import { SearchContext } from "../layout";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Bed,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Zap,
  Activity,
  User,
  Coffee,
  Check,
  Calendar,
  Search
} from "lucide-react";

interface BedInfo {
  id: string;
  ward: "ICU" | "ER" | "General" | "Pediatrics";
  status: "occupied" | "available" | "cleaning";
  patient: string;
  diagnosis: string;
  timer?: number; // Minutes left for sanitation
  gender?: string;
  age?: number;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error";
}

export default function BedAvailabilityPage() {
  const [beds, setBeds] = useState<BedInfo[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(30);

  const [wardFilter, setWardFilter] = useState<string>("all");
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Reservation Form State
  const [formPatientName, setFormPatientName] = useState("");
  const [formDiagnosis, setFormDiagnosis] = useState("");
  const [formGender, setFormGender] = useState("Male");
  const [formAge, setFormAge] = useState("");
  const [displayDate, setDisplayDate] = useState("");

  const statsContainerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Set local machine date on mount and load beds
  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    fetchBeds();
  }, []);

  useEffect(() => {
    setVisibleCount(30);
  }, [wardFilter, searchQuery]);

  async function fetchBeds() {
    try {
      const res = await fetch(`${API_BASE}/api/beds`);
      if (res.ok) {
        const data = await res.json();
        setBeds(data.map((item: any) => ({
          ...item,
          id: item.id || item._id
        })));
      }
    } catch (err) {
      console.error("Failed to load beds from Database", err);
    }
  }

  // GSAP cascade animation
  useEffect(() => {
    if (statsContainerRef.current) {
      const cards = statsContainerRef.current.children;
      gsap.fromTo(
        cards,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.1,
          duration: 0.8,
          ease: "power2.out",
        }
      );
    }
  }, []);

  // HTML5 Dialog triggers
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
    
    // Auto dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDischarge = async (bedId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/beds/${bedId}/discharge`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to discharge bed");
      await fetchBeds();
      triggerToast("Patient Discharged", `Bed ${bedId} queued for sanitation.`);
    } catch (err) {
      console.error(err);
      triggerToast("Discharge Error", "Failed to update bed status in Database.", "error");
    }
  };

  const handleCompleteCleaning = async (bedId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/beds/${bedId}/clean`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to complete cleaning");
      await fetchBeds();
      triggerToast("Sanitization Complete", `Bed ${bedId} is sterile and available for intake.`);
    } catch (err) {
      console.error(err);
      triggerToast("Cleaning Error", "Failed to update bed status in Database.", "error");
    }
  };

  const handleOpenReservation = (bedId: string) => {
    setSelectedBedId(bedId);
    setShowModal(true);
  };

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBedId) return;

    const payload = {
      patient: formPatientName,
      diagnosis: formDiagnosis,
      gender: formGender,
      age: parseInt(formAge) || 0
    };

    try {
      const res = await fetch(`${API_BASE}/api/beds/${selectedBedId}/reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to reserve bed");
      await fetchBeds();
      triggerToast("Bed Reserved", `Allocated bed ${selectedBedId} to patient ${formPatientName}.`);
    } catch (err) {
      console.error(err);
      triggerToast("Reservation Error", "Failed to update bed in Database.", "error");
    }

    // Reset Form & Close Modal
    setFormPatientName("");
    setFormDiagnosis("");
    setFormGender("Male");
    setFormAge("");
    setShowModal(false);
    setSelectedBedId(null);
  };

  // Stats Calculations
  const occupiedCount = beds.filter((b) => b.status === "occupied").length;
  const cleaningCount = beds.filter((b) => b.status === "cleaning").length;
  const totalBedsCount = beds.length;
  const availableCount = totalBedsCount - occupiedCount - cleaningCount;
  const occupancyPercentage = totalBedsCount > 0 ? ((occupiedCount / totalBedsCount) * 100).toFixed(1) : "0.0";

  const icuBeds = beds.filter((b) => b.ward.toUpperCase() === "ICU");
  const icuTotal = icuBeds.length;
  const icuAvailable = icuBeds.filter((b) => b.status === "available").length;

  const vipBeds = beds.filter((b) => b.ward.toUpperCase() === "VIP");
  const vipTotal = vipBeds.length;
  const vipAvailable = vipBeds.filter((b) => b.status === "available").length;

  // Filters
  const filteredBeds = beds.filter((bed) => {
    const matchesWard = wardFilter === "all" || bed.ward === wardFilter;
    const matchesSearch =
      bed.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bed.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bed.ward.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesWard && matchesSearch;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "occupied":
        return "bg-error/10 text-error border border-error/20";
      case "cleaning":
        return "bg-[#e8a317]/10 text-[#e8a317] border border-[#e8a317]/20";
      default:
        return "bg-tertiary-container/10 text-tertiary-container border border-tertiary-container/20";
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Page Title */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-primary">Bed Command Center</h2>
          <p className="text-xs text-on-surface-variant mt-1">Real-time bed tracking, ward occupancy, and sanitation logs.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-surface-container-high border border-white/5 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-surface-variant/40 transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            {displayDate}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div ref={statsContainerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-error font-bold flex items-center gap-0.5">
              {occupancyPercentage}% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Occupied Beds</p>
            <h3 className="text-xl font-bold mt-1">{occupiedCount} / {totalBedsCount}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-tertiary-container/15 flex items-center justify-center text-tertiary-container">
              <CheckCircle className="w-4 h-4" />
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-error/15 text-error border border-error/25 font-bold uppercase tracking-wider">Stable</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Available / Vacant</p>
            <h3 className="text-xl font-bold mt-1">{availableCount}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-error/15 flex items-center justify-center text-error">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-error text-[10px] font-bold">{icuAvailable} Left</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">ICU Vacancies</p>
            <h3 className="text-xl font-bold mt-1">{icuAvailable} / {icuTotal}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-secondary-container/15 flex items-center justify-center text-secondary-container">
              <Bed className="w-4 h-4" />
            </div>
            <span className="text-secondary-container text-[10px] font-bold">{vipAvailable} Vacant</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">VIP Room</p>
            <h3 className="text-xl font-bold mt-1">{vipAvailable} / {vipTotal}</h3>
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-[#e8a317]/15 flex items-center justify-center text-[#e8a317]">
              <Coffee className="w-4 h-4" />
            </div>
            {cleaningCount > 0 && (
              <span className="text-[#e8a317] text-[10px] font-bold">Active</span>
            )}
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Sanitizing / Prep</p>
            <h3 className="text-xl font-bold mt-1">{cleaningCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Side: Beds monitor grid */}
        <div className="col-span-12 lg:col-span-9 glass-card rounded-2xl p-6 inner-glow flex flex-col min-h-[500px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 opacity-50" />
              <input
                type="text"
                placeholder="Search bed ID or patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/5 rounded-full py-1.5 pl-10 pr-4 text-xs focus:ring-1 focus:ring-primary text-on-surface placeholder-on-surface-variant/40 focus:outline-none"
              />
            </div>
            <div className="flex bg-surface-container/60 border border-white/5 rounded-lg p-0.5 text-[11px] font-medium">
              {["all", "ICU", "ER", "General", "Pediatrics", "VIP"].map((w) => (
                <button
                  key={w}
                  onClick={() => setWardFilter(w)}
                  className={`px-4 py-1.5 rounded-md transition-all cursor-pointer ${
                    wardFilter === w
                      ? "bg-primary-container/10 text-primary-container font-bold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {w === "all" ? "All Wards" : w}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[580px] pr-2 custom-scrollbar" data-lenis-prevent="">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <AnimatePresence initial={false}>
                {filteredBeds.slice(0, visibleCount).map((bed) => (
                  <motion.div
                    key={bed.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className={`glass-card p-5 rounded-2xl flex flex-col justify-between h-[12.5rem] border relative overflow-hidden transition-all`}
                  style={{
                    borderColor:
                      bed.status === "occupied"
                        ? "rgba(239, 68, 68, 0.15)"
                        : bed.status === "cleaning"
                        ? "rgba(232, 163, 23, 0.15)"
                        : "rgba(0, 240, 255, 0.15)",
                  }}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] text-on-surface-variant font-mono uppercase tracking-widest">
                          {bed.ward} Unit
                        </span>
                        <h5 className="text-sm font-bold text-primary mt-0.5">{bed.id}</h5>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusStyle(bed.status)}`}>
                        {bed.status}
                      </span>
                    </div>

                    {bed.status === "occupied" && (
                      <div className="mt-4">
                        <p className="text-xs font-bold text-on-surface truncate">{bed.patient}</p>
                        <p className="text-[10px] text-on-surface-variant mt-0.5 truncate">{bed.diagnosis}</p>
                      </div>
                    )}

                    {bed.status === "cleaning" && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-[#e8a317] font-semibold">
                          <span>Sanitization Cycle</span>
                          <span className="font-mono">{bed.timer} min</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#e8a317] to-[#ffd46c] rounded-full" style={{ width: "40%" }}></div>
                        </div>
                      </div>
                    )}

                    {bed.status === "available" && (
                      <div className="mt-4">
                        <p className="text-[10px] text-on-surface-variant italic">Ready for clinical admission</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    {bed.status === "occupied" && (
                      <button
                        onClick={() => handleDischarge(bed.id)}
                        className="w-full py-2 rounded-xl bg-error/10 hover:bg-error/20 border border-error/20 text-error text-[11px] font-bold transition-all cursor-pointer"
                      >
                        Initiate Discharge
                      </button>
                    )}
                    {bed.status === "cleaning" && (
                      <button
                        onClick={() => handleCompleteCleaning(bed.id)}
                        className="w-full py-2 rounded-xl bg-[#e8a317]/10 hover:bg-[#e8a317]/20 border border-[#e8a317]/20 text-[#e8a317] text-[11px] font-bold transition-all cursor-pointer"
                      >
                        Complete Sanitizing
                      </button>
                    )}
                    {bed.status === "available" && (
                      <button
                        onClick={() => handleOpenReservation(bed.id)}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-on-primary font-bold text-[11px] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Reserve Bed
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
          </div>

          {filteredBeds.length > visibleCount && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setVisibleCount((prev) => prev + 30)}
                className="bg-surface-container-high border border-white/5 px-6 py-2 rounded-xl text-xs font-semibold text-primary hover:bg-surface-variant/40 hover:text-white transition-all active:scale-95 cursor-pointer"
              >
                Load More Beds ({filteredBeds.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Ward Summary census list */}
        <div className="col-span-12 lg:col-span-3 glass-card rounded-2xl p-6 inner-glow flex flex-col justify-between h-full">
          <div>
            <h4 className="text-sm font-bold text-primary mb-0.5">Ward Censuses</h4>
            <p className="text-[10px] text-on-surface-variant mb-6">Occupancy metrics by unit</p>
            
            <div className="space-y-6">
              {[
                { label: "ICU (Wing A)", ward: "ICU", color: "error" },
                { label: "Emergency Room", ward: "ER", color: "[#e8a317]" },
                { label: "General Ward", ward: "General", color: "primary-container" },
                { label: "Pediatric Wing", ward: "Pediatrics", color: "tertiary-container" },
                { label: "VIP Suites", ward: "VIP", color: "secondary-container" },
              ].map(({ label, ward, color }) => {
                const wardBeds = beds.filter((b) => b.ward.toUpperCase() === ward.toUpperCase());
                const wardTotal = wardBeds.length;
                const wardOccupied = wardBeds.filter((b) => b.status === "occupied").length;
                const pct = wardTotal > 0 ? ((wardOccupied / wardTotal) * 100).toFixed(1) : "0.0";
                const barColor = parseFloat(pct) > 85 ? "bg-error" : parseFloat(pct) > 60 ? `bg-[#e8a317]` : `bg-tertiary-container`;
                const textColor = parseFloat(pct) > 85 ? "text-error" : parseFloat(pct) > 60 ? "text-[#e8a317]" : "text-tertiary-container";
                return (
                  <div key={ward} className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span className="text-on-surface-variant">{label}</span>
                      <span className={`${textColor} font-bold font-mono`}>{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }}></div>
                    </div>
                    <p className="text-[9px] text-on-surface-variant text-right">{wardOccupied} / {wardTotal} Beds Occupied</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/5">
            <div className="flex items-center gap-3 p-3 bg-surface-container/60 border border-white/5 rounded-xl">
              <SlidersHorizontal className="w-5 h-5 text-[#e8a317] animate-spin" />
              <div>
                <p className="text-[11px] font-semibold text-on-surface">Auto-Refresh Active</p>
                <p className="text-[9px] text-on-surface-variant">Syncing with hospital EPR system...</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* HTML5 Reservation Dialog Modal */}
      <dialog
        ref={dialogRef}
        onClose={() => setShowModal(false)}
        className="glass-card p-6 rounded-2xl w-full max-w-md bg-[#0b1326]/95 border border-white/10 text-[#dae2fd] shadow-2xl backdrop-blur-xl focus:outline-none m-auto backdrop:bg-[#0b1326]/60 backdrop:backdrop-blur-sm"
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
            <h3 className="text-sm font-bold text-primary">Intake Reservation</h3>
            <p className="text-[10px] text-on-surface-variant">Assign patient to a vacant bed slot</p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-on-surface-variant hover:text-error transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleReservationSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Bed Identifier</label>
            <p className="font-mono text-xs text-primary-container font-bold bg-[#060e20]/60 p-2.5 rounded-xl border border-white/5">
              Room {selectedBedId} ({beds.find((b) => b.id === selectedBedId)?.ward} Unit)
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Patient Name</label>
            <input
              type="text"
              required
              value={formPatientName}
              onChange={(e) => setFormPatientName(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
              placeholder="e.g. Arthur Morgan"
            />
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
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Diagnosis / Case Details</label>
            <input
              type="text"
              required
              value={formDiagnosis}
              onChange={(e) => setFormDiagnosis(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
              placeholder="e.g. Post-OP Recovery"
            />
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
              Reserve Bed <ShieldCheck className="w-4 h-4" />
            </button>
          </div>
        </form>
      </dialog>

      {/* Global Toasts Overlay */}
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
