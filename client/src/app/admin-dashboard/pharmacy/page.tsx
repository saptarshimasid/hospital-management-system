"use client";
import { API_BASE } from "@/utils/api";

import { useEffect, useState, useRef, useContext } from "react";
import { SearchContext } from "../layout";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Pill,
  CheckCircle,
  AlertCircle,
  Plus,
  TrendingUp,
  Search,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Thermometer,
  Boxes,
  ClipboardList,
  Calendar
} from "lucide-react";

interface Medication {
  id: string;
  name: string;
  sku: string;
  category: "Analgesic" | "Antibiotic" | "Cardiovascular" | "Respiratory";
  dosage: string;
  quantity: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
}

interface Prescription {
  id: string;
  patientName: string;
  drug: string;
  dosage: string;
  quantity: number;
  status: "pending" | "completed";
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error";
}

export default function PharmacyPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const searchTerm = searchQuery;
  const setSearchTerm = setSearchQuery;
  const [showModal, setShowModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [displayDate, setDisplayDate] = useState("");

  // Set local machine date on mount and load pharmacy data
  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    fetchPharmacyData();
  }, []);

  async function fetchPharmacyData() {
    try {
      const medRes = await fetch(`${API_BASE}/api/medications`);
      const rxRes = await fetch(`${API_BASE}/api/prescriptions`);
      
      if (medRes.ok && rxRes.ok) {
        const medsData = await medRes.json();
        const rxData = await rxRes.json();
        
        setMedications(medsData.map((item: any) => ({
          ...item,
          id: item._id || item.id
        })));
        
        // Only display prescriptions that are still pending
        setPrescriptions(rxData
          .filter((r: any) => r.status === "pending")
          .map((item: any) => ({
            ...item,
            id: item._id || item.id
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load pharmacy data from Database", err);
    }
  }

  // Form states
  const [formDrugName, setFormDrugName] = useState("");
  const [formCategory, setFormCategory] = useState<"Analgesic" | "Antibiotic" | "Cardiovascular" | "Respiratory">("Analgesic");
  const [formDosage, setFormDosage] = useState("");
  const [formSKU, setFormSKU] = useState("SKU-55412");
  const [formQuantity, setFormQuantity] = useState("100");

  const statsContainerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Stats calculation
  const totalMedications = medications.length;
  const lowStockCount = medications.filter((m) => m.quantity > 0 && m.quantity < 50).length;
  const pendingRx = prescriptions.filter((r) => r.status === "pending").length;
  const dispatchedToday = prescriptions.filter((r) => r.status === "completed").length;

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

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const qty = parseInt(formQuantity) || 0;
    let status: "In Stock" | "Low Stock" | "Out of Stock" = "In Stock";
    if (qty === 0) status = "Out of Stock";
    else if (qty < 50) status = "Low Stock";

    const payload = {
      name: formDrugName,
      sku: formSKU,
      category: formCategory,
      dosage: formDosage,
      quantity: qty,
      status: status,
    };

    try {
      const res = await fetch(`${API_BASE}/api/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to formulate medication");
      await fetchPharmacyData();
      triggerToast("Medication Registered", `Successfully registered ${qty} units of ${formDrugName}.`);
    } catch (err) {
      console.error(err);
      triggerToast("Registration Error", "Failed to register medication in Database.", "error");
    }

    setShowModal(false);

    // Reset
    setFormDrugName("");
    setFormDosage("");
    setFormSKU(`SKU-${Math.floor(10000 + Math.random() * 90000)}`);
    setFormQuantity("100");
  };

  const dispensePrescription = async (rxId: string, drugName: string, dispenseQty: number) => {
    try {
      const matchingMed = medications.find(
        (med) =>
          med.name.toLowerCase().includes(drugName.toLowerCase()) ||
          drugName.toLowerCase().includes(med.name.toLowerCase())
      );

      if (matchingMed) {
        await fetch(`${API_BASE}/api/medications/${matchingMed.id}/dispense`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: dispenseQty })
        });
      }

      await fetch(`${API_BASE}/api/prescriptions/${rxId}/dispense`, {
        method: "POST"
      });

      await fetchPharmacyData();
      triggerToast("Prescription Dispensed", `Dispensed ${dispenseQty} units of ${drugName} successfully.`);
    } catch (err) {
      console.error(err);
      triggerToast("Dispense Error", "Failed to dispense prescription in Database.", "error");
    }
  };

  const filteredMeds = medications.filter((m) => {
    const matchesCategory = statusFilter === "all" || m.category.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.dosage.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "In Stock":
        return "bg-tertiary-container/10 text-tertiary-container border border-tertiary-container/20";
      case "Low Stock":
        return "bg-error/10 text-error border border-error/20";
      default:
        return "bg-white/5 text-on-surface-variant border border-white/10";
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-primary">Pharmacy Roster & Inventory</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Real-time prescription dispensing ledgers and medication inventory audits.
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
            Register New Stock
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div ref={statsContainerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Total Medications</p>
            <h3 className="text-xl font-bold mt-1">{totalMedications}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-error/15 flex items-center justify-center text-error">
              <AlertCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-error font-bold">Alert</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Low Stock Items</p>
            <h3 className="text-xl font-bold mt-1">{lowStockCount}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-secondary-container/15 flex items-center justify-center text-secondary-container">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Pending Rx</p>
            <h3 className="text-xl font-bold mt-1">{pendingRx}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-tertiary-container/15 flex items-center justify-center text-tertiary-container">
              <CheckCircle className="w-4 h-4" />
            </div>
            {dispatchedToday > 0 && <span className="text-[10px] text-tertiary-container font-bold">{dispatchedToday} Done</span>}
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Dispatched Today</p>
            <h3 className="text-xl font-bold mt-1">{dispatchedToday}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
              <Thermometer className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-tertiary-container font-bold">Stable</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Cold Vault Temp</p>
            <h3 className="text-xl font-bold mt-1">4.2 °C</h3>
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
                  placeholder="Search medications, categories, or SKUs..."
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
                <option value="Analgesic">Analgesic</option>
                <option value="Antibiotic">Antibiotic</option>
                <option value="Cardiovascular">Cardiovascular</option>
                <option value="Respiratory">Respiratory</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-on-surface-variant/80 border-b border-white/5 font-medium uppercase tracking-wider text-[9px]">
                  <th className="pb-3.5">Drug Name</th>
                  <th className="pb-3.5">SKU</th>
                  <th className="pb-3.5">Category</th>
                  <th className="pb-3.5">Dosage</th>
                  <th className="pb-3.5">Stock Level</th>
                  <th className="pb-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence initial={false}>
                  {filteredMeds.map((med) => (
                    <motion.tr
                      key={med.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="py-3 font-semibold text-on-surface">{med.name}</td>
                      <td className="py-3 font-mono text-[10px] text-primary-container">{med.sku}</td>
                      <td className="py-3 text-on-surface-variant">{med.category}</td>
                      <td className="py-3 text-on-surface">{med.dosage}</td>
                      <td className="py-3 font-bold text-on-surface">{med.quantity} units</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeClass(med.status)}`}>
                          {med.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Prescription dispensing roster */}
        <div className="col-span-12 lg:col-span-3 glass-card rounded-2xl p-6 inner-glow flex flex-col h-full">
          <h4 className="text-sm font-bold text-primary">Prescription Feed</h4>
          <p className="text-[10px] text-on-surface-variant mt-0.5 mb-6">Dispense queues</p>
          <div className="space-y-4 flex-1">
            <AnimatePresence initial={false}>
              {prescriptions.map((rx) => (
                <motion.div
                  key={rx.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 rounded-xl bg-surface-container-high/20 border border-white/5 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">{rx.id} • {rx.patientName}</span>
                    <span className="text-[8px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">Pending</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant">
                    <span className="font-semibold text-primary-container">Drug:</span> {rx.drug}, {rx.dosage} (Qty: {rx.quantity})
                  </p>
                  <button
                    onClick={() => dispensePrescription(rx.id, rx.drug, rx.quantity)}
                    className="w-full mt-1 bg-gradient-to-r from-primary-container to-secondary-container text-on-primary font-bold py-1.5 rounded-lg text-[10px] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle className="w-3 h-3" /> Dispense
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {prescriptions.length === 0 && (
              <p className="text-xs text-on-surface-variant italic text-center py-6">All prescriptions dispensed.</p>
            )}
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
            <h3 className="text-sm font-bold text-primary">Register New Medication</h3>
            <p className="text-[10px] text-on-surface-variant">Add new pharmaceutical inventory entry</p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-on-surface-variant hover:text-error transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleStockSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Medication Name</label>
            <input
              type="text"
              required
              value={formDrugName}
              onChange={(e) => setFormDrugName(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
              placeholder="e.g. Ibuprofen"
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
                <option value="Analgesic">Analgesic</option>
                <option value="Antibiotic">Antibiotic</option>
                <option value="Cardiovascular">Cardiovascular</option>
                <option value="Respiratory">Respiratory</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Dosage Format</label>
              <input
                type="text"
                required
                value={formDosage}
                onChange={(e) => setFormDosage(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                placeholder="e.g. 500mg"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">SKU Code</label>
              <input
                type="text"
                required
                value={formSKU}
                onChange={(e) => setFormSKU(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Initial Stock Quantity</label>
              <input
                type="number"
                required
                min="0"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
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
              Confirm Entry <ShieldCheck className="w-4 h-4" />
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
