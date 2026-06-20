"use client";
import { API_BASE } from "@/utils/api";

import { useEffect, useState, useRef, useContext } from "react";
import { SearchContext } from "../layout";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  DollarSign,
  CheckCircle,
  AlertCircle,
  Plus,
  TrendingUp,
  Search,
  SlidersHorizontal,
  X,
  ShieldCheck,
  FileText,
  CreditCard,
  Calendar,
  Layers
} from "lucide-react";

interface Invoice {
  id: string;
  patientName: string;
  dept: string;
  services: string;
  amount: number;
  date: string;
  status: "Paid" | "Pending" | "Overdue";
  gender?: string;
  age?: number;
}

interface Claim {
  id: string;
  invoiceId: string;
  patientName: string;
  provider: string;
  amount: number;
  status: "Ready" | "Dispatched";
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error";
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: "INV-9021",
      patientName: "Arthur Morgan",
      dept: "Cardiology",
      services: "Coronary Angioplasty",
      amount: 12400,
      date: "2024-02-20",
      status: "Paid",
    },
    {
      id: "INV-8912",
      patientName: "Elena Fisher",
      dept: "Gen Medicine",
      services: "Inpatient Ward Stay (2 Days)",
      amount: 1850,
      date: "2024-02-23",
      status: "Pending",
    },
    {
      id: "INV-4412",
      patientName: "Joel Miller",
      dept: "Emergency",
      services: "Trauma Resuscitation & Stitching",
      amount: 4200,
      date: "2024-02-10",
      status: "Overdue",
    },
    {
      id: "INV-1092",
      patientName: "Leo Vance",
      dept: "Neurology",
      services: "MRI Brain & EEG Telemetry",
      amount: 3150,
      date: "2024-02-22",
      status: "Paid",
    },
  ]);

  const [claims, setClaims] = useState<Claim[]>([
    {
      id: "CLM-2001",
      invoiceId: "INV-8912",
      patientName: "Elena Fisher",
      provider: "BlueCross PPO",
      amount: 1850,
      status: "Ready",
    },
    {
      id: "CLM-2002",
      invoiceId: "INV-4412",
      patientName: "Joel Miller",
      provider: "Aetna Health",
      amount: 4200,
      status: "Ready",
    },
  ]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const searchTerm = searchQuery;
  const setSearchTerm = setSearchQuery;
  const [showModal, setShowModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Form states
  const [formPatientName, setFormPatientName] = useState("");
  const [formDept, setFormDept] = useState("Cardiology");
  const [formAmount, setFormAmount] = useState("");
  const [formServices, setFormServices] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStatus, setFormStatus] = useState<"Paid" | "Pending" | "Overdue">("Pending");
  const [formGender, setFormGender] = useState("Male");
  const [formAge, setFormAge] = useState("");
  const [displayDate, setDisplayDate] = useState("");

  const statsContainerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Set local machine date on mount and load invoices
  useEffect(() => {
    const today = new Date();
    setDisplayDate(today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    setFormDate(today.toISOString().split("T")[0]);
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      const res = await fetch(`${API_BASE}/api/invoices`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.map((item: any) => ({
          ...item,
          id: item._id || item.id
        })));
      }
    } catch (err) {
      console.error("Failed to load invoices from Database", err);
    }
  }

  // Stats calculation
  const totalBilledToday = invoices.reduce((acc, curr) => acc + curr.amount, 0);
  const outstandingClaims = claims.length;
  const paidCount = invoices.filter((i) => i.status === "Paid").length;
  const overdueCount = invoices.filter((i) => i.status === "Overdue").length;

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

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amt = parseFloat(formAmount) || 0;
    const randomInvId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;

    const payload = {
      patientName: formPatientName,
      dept: formDept,
      services: formServices,
      amount: amt,
      date: formDate,
      status: formStatus,
      gender: formGender,
      age: parseInt(formAge) || 0,
    };

    try {
      const res = await fetch(`${API_BASE}/api/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save invoice");
      
      const savedInvoice = await res.json();
      await fetchInvoices();
      triggerToast("Invoice Generated", `Voucher ${savedInvoice._id || randomInvId} for $${amt.toLocaleString()} generated.`);

      // If pending, optionally add to claims list
      if (formStatus === "Pending") {
        setClaims((prevClaims) => [
          {
            id: `CLM-${Math.floor(2000 + Math.random() * 8000)}`,
            invoiceId: savedInvoice._id || randomInvId,
            patientName: formPatientName,
            provider: "Self / Ins Broker",
            amount: amt,
            status: "Ready",
          },
          ...prevClaims,
        ]);
      }
    } catch (err) {
      console.error(err);
      triggerToast("Submission Error", "Failed to save invoice in Database.", "error");
    }

    setShowModal(false);

    // Reset Form
    setFormPatientName("");
    setFormAmount("");
    setFormServices("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormStatus("Pending");
    setFormGender("Male");
    setFormAge("");
  };

  const submitClaim = (claimId: string, invoiceId: string, amount: number) => {
    setClaims((prevClaims) => prevClaims.filter((c) => c.id !== claimId));
    triggerToast("Claim Submitted", `Insurance claim for invoice ${invoiceId} totaling $${amount.toLocaleString()} dispatched.`);
  };

  const filteredInvoices = invoices.filter((i) => {
    const matchesStatus = statusFilter === "all" || i.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch =
      i.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.dept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.services.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-tertiary-container/10 text-tertiary-container border border-tertiary-container/20";
      case "Pending":
        return "bg-secondary-container/10 text-secondary-container border border-secondary-container/20";
      default:
        return "bg-error/10 text-error border border-error/20";
    }
  };

  const getAmountColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "text-[#62fae3]";
      case "Pending":
        return "text-secondary-fixed-dim";
      default:
        return "text-[#ffb4ab]";
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-primary">Patient Billing & Claims</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Manage and audit patient invoice summaries, claims submissions, and overall collections.
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
            Generate Invoice
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div ref={statsContainerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-tertiary-container font-bold flex items-center gap-0.5">
              +18% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Billed Today</p>
            <h3 className="text-xl font-bold mt-1">${totalBilledToday.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-secondary-container/15 flex items-center justify-center text-secondary-container">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-secondary-container font-bold">Pending</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Outstanding Claims</p>
            <h3 className="text-xl font-bold mt-1">{outstandingClaims}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-tertiary-container/15 flex items-center justify-center text-tertiary-container">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Paid Invoices</p>
            <h3 className="text-xl font-bold mt-1">{paidCount}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-error/15 flex items-center justify-center text-error">
              <AlertCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-error font-bold">Overdue</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Overdue Accounts</p>
            <h3 className="text-xl font-bold mt-1">{overdueCount}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Collection Rate</p>
            <h3 className="text-xl font-bold mt-1">97.8%</h3>
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
                  placeholder="Search patient bills, Invoice IDs, or departments..."
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
                <option value="all">All Invoices</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-on-surface-variant/80 border-b border-white/5 font-medium uppercase tracking-wider text-[9px]">
                  <th className="pb-3.5">Invoice ID</th>
                  <th className="pb-3.5">Patient Name</th>
                  <th className="pb-3.5">Department</th>
                  <th className="pb-3.5">Diagnosis / Services</th>
                  <th className="pb-3.5">Amount</th>
                  <th className="pb-3.5">Issued Date</th>
                  <th className="pb-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence initial={false}>
                  {filteredInvoices.map((inv) => (
                    <motion.tr
                      key={inv.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="py-3 font-mono text-[10px] text-primary font-bold">{inv.id}</td>
                      <td className="py-3 font-semibold text-on-surface">{inv.patientName}</td>
                      <td className="py-3 text-on-surface-variant">{inv.dept}</td>
                      <td className="py-3 text-on-surface-variant">{inv.services}</td>
                      <td className={`py-3 font-bold ${getAmountColor(inv.status)}`}>
                        ${inv.amount.toLocaleString()}
                      </td>
                      <td className="py-3 text-on-surface-variant">{inv.date}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeClass(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Claims Desk */}
        <div className="col-span-12 lg:col-span-3 glass-card rounded-2xl p-6 inner-glow flex flex-col h-full">
          <h4 className="text-sm font-bold text-primary">Claims Desk</h4>
          <p className="text-[10px] text-on-surface-variant mt-0.5 mb-6">Insurance dispatch panel</p>
          <div className="space-y-4 flex-1">
            <AnimatePresence initial={false}>
              {claims.map((claim) => (
                <motion.div
                  key={claim.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 rounded-xl bg-surface-container-high/20 border border-white/5 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">{claim.patientName}</span>
                    <span className="text-[8px] uppercase font-bold text-secondary-container bg-secondary-container/10 px-2 py-0.5 rounded border border-secondary-container/20">Ready</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant">
                    <span className="font-semibold text-primary-container">Total:</span> ${claim.amount.toLocaleString()} • {claim.provider}
                  </p>
                  <button
                    onClick={() => submitClaim(claim.id, claim.invoiceId, claim.amount)}
                    className="w-full mt-1 bg-gradient-to-r from-primary-container to-secondary-container text-on-primary font-bold py-1.5 rounded-lg text-[10px] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Submit Claim
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {claims.length === 0 && (
              <p className="text-xs text-on-surface-variant italic text-center py-6">All claims dispatched.</p>
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
            <h3 className="text-sm font-bold text-primary">Generate Patient Invoice</h3>
            <p className="text-[10px] text-on-surface-variant">Bill client for operational/clinical treatments</p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-on-surface-variant hover:text-error transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleInvoiceSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Patient Name</label>
            <input
              type="text"
              required
              value={formPatientName}
              onChange={(e) => setFormPatientName(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
              placeholder="e.g. John Doe"
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Department</label>
              <select
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
              >
                <option value="Cardiology">Cardiology</option>
                <option value="Gen Medicine">Gen Medicine</option>
                <option value="Neurology">Neurology</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Invoice Cost ($)</label>
              <input
                type="number"
                required
                min="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                placeholder="e.g. 1500"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Diagnosis / Rendered Services</label>
            <input
              type="text"
              required
              value={formServices}
              onChange={(e) => setFormServices(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
              placeholder="e.g. EEG Consult & Diagnostics"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Issued Date</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Billing Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
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
              Generate Bill <ShieldCheck className="w-4 h-4" />
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
