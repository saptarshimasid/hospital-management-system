"use client";

import { useEffect, useState, useRef, useContext } from "react";
import { SearchContext } from "../layout";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  ShieldCheck,
  DollarSign,
  ArrowRightLeft,
  Activity,
  CreditCard,
  Calendar,
  Undo2
} from "lucide-react";

interface Transaction {
  id: string;
  patientName: string;
  type: "Insurance" | "Copay" | "Direct";
  amount: number;
  method: string;
  date: string;
  gender?: string;
  age?: number;
  email?: string;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error";
}

export default function RevenuePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "TXN-00129",
      patientName: "Arthur Morgan",
      type: "Insurance",
      amount: 11160,
      method: "ACH Transfer",
      date: "2024-02-23",
    },
    {
      id: "TXN-00130",
      patientName: "Elena Fisher",
      type: "Copay",
      amount: 35,
      method: "Credit Card",
      date: "2024-02-24",
    },
    {
      id: "TXN-00131",
      patientName: "Joel Miller",
      type: "Direct",
      amount: 1200,
      method: "Direct Debit",
      date: "2024-02-18",
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
  const [formType, setFormType] = useState<"Insurance" | "Copay" | "Direct">("Insurance");
  const [formAmount, setFormAmount] = useState("");
  const [formMethod, setFormMethod] = useState("Credit Card");
  const [formDate, setFormDate] = useState("");
  const [formGender, setFormGender] = useState("Male");
  const [formAge, setFormAge] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [displayDate, setDisplayDate] = useState("");

  const statsContainerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Set local machine date on mount and load transactions
  useEffect(() => {
    const today = new Date();
    setDisplayDate(today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    setFormDate(today.toISOString().split("T")[0]);
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      const res = await fetch("http://localhost:5001/api/transactions");
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.map((item: any) => ({
          ...item,
          id: item._id || item.id
        })));
      }
    } catch (err) {
      console.error("Failed to load transactions from MongoDB", err);
    }
  }

  // Stats calculations
  const totalYTD = 1240000 + transactions.reduce((acc, curr) => acc + curr.amount, 0);
  const avgTxn = Math.round(transactions.reduce((acc, curr) => acc + curr.amount, 0) / (transactions.length || 1));
  const copaysCount = 84 + transactions.filter((t) => t.type === "Copay").length;

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

  const handleTxnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amt = parseFloat(formAmount) || 0;
    const randomTxnId = `TXN-${Math.floor(10000 + Math.random() * 90000)}`;

    const payload = {
      patientName: formPatientName,
      type: formType,
      amount: amt,
      method: formMethod,
      date: formDate,
      gender: formGender,
      age: parseInt(formAge) || 0,
      email: formEmail
    };

    try {
      const res = await fetch("http://localhost:5001/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save transaction");
      
      const savedTxn = await res.json();
      await fetchTransactions();
      triggerToast("Transaction Logged", `Voucher ${savedTxn._id || randomTxnId} for $${amt.toLocaleString()} logged.`);
    } catch (err) {
      console.error(err);
      triggerToast("Logging Error", "Failed to log transaction in MongoDB.", "error");
    }

    setShowModal(false);

    // Reset Form
    setFormPatientName("");
    setFormAmount("");
    setFormMethod("Credit Card");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormType("Insurance");
    setFormGender("Male");
    setFormAge("");
    setFormEmail("");
  };

  const handleRefund = async (id: string, amount: number) => {
    try {
      const res = await fetch(`http://localhost:5001/api/transactions/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to refund transaction");
      await fetchTransactions();
      triggerToast("Transaction Refunded", `Voucher ${id} for $${amount.toLocaleString()} has been fully refunded and closed.`, "error");
    } catch (err) {
      console.error(err);
      triggerToast("Refund Error", "Failed to refund transaction in MongoDB.", "error");
    }
  };

  const filteredTxns = transactions.filter((t) => {
    const matchesFilter = statusFilter === "all" || t.type.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch =
      t.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.method.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && (searchTerm === "all" || searchTerm === "" ? true : matchesSearch);
  });

  const getBadgeClass = (type: string) => {
    switch (type) {
      case "Insurance":
        return "bg-primary-container/10 text-primary-container border border-primary-container/20";
      case "Copay":
        return "bg-secondary-container/10 text-secondary-container border border-secondary-container/20";
      default:
        return "bg-[#e8a317]/10 text-[#e8a317] border border-[#e8a317]/25";
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-primary">Financial Transaction Command</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Real-time hospital cash-flows, transaction auditing, and refund logs.
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
            Log Transaction
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
              +12.4% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">YTD Revenue</p>
            <h3 className="text-xl font-bold mt-1">${(totalYTD / 1000000).toFixed(2)}M</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-secondary-container/15 flex items-center justify-center text-secondary-container">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Avg Transaction</p>
            <h3 className="text-xl font-bold mt-1">${avgTxn.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-tertiary-container/15 flex items-center justify-center text-tertiary-container">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Copays Collected</p>
            <h3 className="text-xl font-bold mt-1">{copaysCount}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-error/15 flex items-center justify-center text-error">
              <Undo2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-tertiary-container font-bold">Stable</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Refund Rate</p>
            <h3 className="text-xl font-bold mt-1">0.2%</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Growth Rate</p>
            <h3 className="text-xl font-bold mt-1">+12.4%</h3>
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
                  placeholder="Search transactions, methods, or patients..."
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
                <option value="all">All Types</option>
                <option value="insurance">Insurance</option>
                <option value="copay">Copay</option>
                <option value="direct">Direct</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-on-surface-variant/80 border-b border-white/5 font-medium uppercase tracking-wider text-[9px]">
                  <th className="pb-3.5">Transaction ID</th>
                  <th className="pb-3.5">Patient Name</th>
                  <th className="pb-3.5">Type</th>
                  <th className="pb-3.5">Amount</th>
                  <th className="pb-3.5">Payment Method</th>
                  <th className="pb-3.5">Date</th>
                  <th className="pb-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence initial={false}>
                  {filteredTxns.map((txn) => (
                    <motion.tr
                      key={txn.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="py-3 font-mono text-[10px] text-primary font-bold">{txn.id}</td>
                      <td className="py-3 font-semibold text-on-surface">{txn.patientName}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getBadgeClass(txn.type)}`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-[#62fae3]">${txn.amount.toLocaleString()}</td>
                      <td className="py-3 text-on-surface-variant">{txn.method}</td>
                      <td className="py-3 text-on-surface-variant font-semibold">{txn.date}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleRefund(txn.id, txn.amount)}
                          title="Refund Transaction"
                          className="p-1.5 rounded-lg bg-surface-container border border-white/5 hover:bg-error/10 hover:border-error/20 text-on-surface-variant hover:text-error transition-all cursor-pointer"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Cash-Flow Highlights */}
        <div className="col-span-12 lg:col-span-3 glass-card rounded-2xl p-6 inner-glow flex flex-col h-full">
          <h4 className="text-sm font-bold text-primary">Cash-Flow Insights</h4>
          <p className="text-[10px] text-on-surface-variant mt-0.5 mb-6">Monthly highlights</p>
          <div className="space-y-4 flex-1 text-xs text-on-surface-variant">
            <div className="p-4 rounded-xl bg-surface-container-high/30 border border-white/5">
              <p className="font-bold text-on-surface mb-2">Claim Success Rate</p>
              <p className="text-[11px] leading-relaxed">
                Out of 328 claims filed this month, 98.4% were approved on first submission. Average review duration is 4.8 days.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-container-high/30 border border-white/5">
              <p className="font-bold text-on-surface mb-2">Copays Revenue Peak</p>
              <p className="text-[11px] leading-relaxed">
                Copay values reached $2,940 today, largely driven by outpatient oncology and radiology clinic slots.
              </p>
            </div>
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
            <h3 className="text-sm font-bold text-primary">Log Financial Transaction</h3>
            <p className="text-[10px] text-on-surface-variant">Register a new financial transaction voucher</p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-on-surface-variant hover:text-error transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleTxnSubmit} className="space-y-4">
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

          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Email Address</label>
            <input
              type="email"
              required
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
              placeholder="e.g. john.doe@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Transaction Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
              >
                <option value="Insurance">Insurance</option>
                <option value="Copay">Copay</option>
                <option value="Direct">Direct</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Amount ($)</label>
              <input
                type="number"
                required
                min="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                placeholder="e.g. 350"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Payment Method</label>
              <select
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
              >
                <option value="Credit Card">Credit Card</option>
                <option value="ACH Transfer">ACH Transfer</option>
                <option value="Direct Debit">Direct Debit</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Transaction Date</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
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
              Log Voucher <ShieldCheck className="w-4 h-4" />
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
