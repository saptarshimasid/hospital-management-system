"use client";
import { API_BASE } from "@/utils/api";

import { useEffect, useState, useRef, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Utensils,
  Search,
  SlidersHorizontal,
  Plus,
  X,
  User,
  Activity,
  Heart,
  TrendingUp,
  Trash2,
  Eye,
  Mail,
  Calendar,
  AlertCircle,
  ShieldCheck,
  CheckCircle,
  Clock,
  Coffee
} from "lucide-react";
import { SearchContext } from "../layout";

interface PantryOrder {
  id: string;
  patientName: string;
  room: string;
  item: string;
  quantity: number;
  status: "Pending" | "Preparing" | "Delivered";
  deliveryTime: string;
  createdAt?: string;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error";
}

export default function PantryPage() {
  const [orders, setOrders] = useState<PantryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and Filters
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const searchTerm = searchQuery;
  const setSearchTerm = setSearchQuery;
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PantryOrder | null>(null);
  
  // Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Add Order Form State
  const [formPatientName, setFormPatientName] = useState("");
  const [formRoom, setFormRoom] = useState("");
  const [formItem, setFormItem] = useState("Regular Diet Meal");
  const [formQuantity, setFormQuantity] = useState("1");
  const [formDeliveryTime, setFormDeliveryTime] = useState("ASAP");
  const [formStatus, setFormStatus] = useState<"Pending" | "Preparing" | "Delivered">("Pending");
  const [displayDate, setDisplayDate] = useState("");

  const statsContainerRef = useRef<HTMLDivElement>(null);
  const addDialogRef = useRef<HTMLDialogElement>(null);
  const detailDialogRef = useRef<HTMLDialogElement>(null);

  // Fetch Orders on Mount
  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    fetchOrders();
  }, []);

  // GSAP animation
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
  }, [loading]);

  // Dialog triggers
  useEffect(() => {
    if (showAddModal) {
      addDialogRef.current?.showModal();
    } else {
      addDialogRef.current?.close();
    }
  }, [showAddModal]);

  useEffect(() => {
    if (selectedOrder) {
      detailDialogRef.current?.showModal();
    } else {
      detailDialogRef.current?.close();
    }
  }, [selectedOrder]);

  const triggerToast = (title: string, message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/pantry`);
      if (res.ok) {
        const data = await res.json();
        setOrders(
          data.map((o: any) => ({
            ...o,
            id: o._id || o.id,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch pantry orders", err);
      triggerToast("Network Error", "Could not retrieve pantry orders from MongoDB.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      patientName: formPatientName,
      room: formRoom,
      item: formItem,
      quantity: parseInt(formQuantity) || 1,
      status: formStatus,
      deliveryTime: formDeliveryTime
    };

    try {
      const res = await fetch(`${API_BASE}/api/pantry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to add pantry order");
      
      triggerToast("Order Created", `Successfully logged pantry request for Room ${formRoom}.`);
      fetchOrders();
      setShowAddModal(false);
      
      // Reset
      setFormPatientName("");
      setFormRoom("");
      setFormItem("Regular Diet Meal");
      setFormQuantity("1");
      setFormDeliveryTime("ASAP");
      setFormStatus("Pending");
    } catch (err) {
      console.error(err);
      triggerToast("Database Error", "Failed to log pantry order.", "error");
    }
  };

  const handleStatusChange = async (id: string, newStatus: "Pending" | "Preparing" | "Delivered") => {
    try {
      const res = await fetch(`${API_BASE}/api/pantry/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        triggerToast("Order Status Updated", `Order marked as ${newStatus}.`);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
      triggerToast("Update Error", "Could not change status.", "error");
    }
  };

  const handleDeleteOrder = async (id: string, room: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/pantry/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        triggerToast("Order Archived", `Pantry log for Room ${room} has been archived.`, "error");
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
      triggerToast("Archive Error", "Failed to delete pantry order.", "error");
    }
  };

  // Filter Orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.item.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus =
      statusFilter === "all" ||
      order.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === "Pending").length;
  const preparingOrders = orders.filter(o => o.status === "Preparing").length;
  const deliveredOrders = orders.filter(o => o.status === "Delivered").length;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-tertiary-container/10 text-tertiary-container border border-tertiary-container/20";
      case "Pending":
        return "bg-error/10 text-error border border-error/20";
      case "Preparing":
        return "bg-[#e8a317]/10 text-[#e8a317] border border-[#e8a317]/20";
      default:
        return "bg-white/5 text-on-surface-variant border border-white/10";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary" />
            Pantry Services
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Manage dietary logs, patient meals, and nutrition distributions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-surface-container-high border border-white/5 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-surface-variant/40 transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            {displayDate}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-primary-container to-secondary-container text-on-primary font-bold px-5 py-2.5 rounded-xl text-xs hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-1.5 active-glow cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Request Pantry Order
          </button>
        </div>
      </div>

      {/* Bento Telemetry Row */}
      <div ref={statsContainerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Total Orders</p>
            <h3 className="text-xl font-bold mt-1">{totalOrders}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-error/15 flex items-center justify-center text-error">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Pending Orders</p>
            <h3 className="text-xl font-bold mt-1 text-error">{pendingOrders}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-[#e8a317]/15 flex items-center justify-center text-[#e8a317]">
            <Coffee className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Preparing</p>
            <h3 className="text-xl font-bold mt-1 text-[#e8a317]">{preparingOrders}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-tertiary-container/15 flex items-center justify-center text-tertiary-container">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Delivered</p>
            <h3 className="text-xl font-bold mt-1 text-tertiary-container">{deliveredOrders}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Table Section */}
      <div className="glass-panel p-6 rounded-2xl space-y-6 bg-surface-container/20 border border-white/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 opacity-60" />
            <input
              type="text"
              placeholder="Search by patient, room, or meal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-xs focus:ring-1 focus:ring-primary/50 text-on-surface placeholder-on-surface-variant/40 focus:outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-on-surface-variant" />
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#0b1326] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table view */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-on-surface-variant/80 border-b border-white/5 font-medium uppercase tracking-wider text-[9px]">
                <th className="pb-3.5">Patient Name</th>
                <th className="pb-3.5">Room</th>
                <th className="pb-3.5">Requested Item</th>
                <th className="pb-3.5">Qty</th>
                <th className="pb-3.5">Target Time</th>
                <th className="pb-3.5">Status</th>
                <th className="pb-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 font-mono text-primary/70">
                    SYNCHRONIZING DIETARY LOGS...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-on-surface-variant opacity-60">
                    No active dietary requests.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3.5 font-bold text-on-surface">{order.patientName}</td>
                    <td className="py-3.5 text-primary-container font-mono">{order.room}</td>
                    <td className="py-3.5 text-on-surface">{order.item}</td>
                    <td className="py-3.5 font-bold">{order.quantity}</td>
                    <td className="py-3.5 text-on-surface-variant">{order.deliveryTime}</td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status !== "Delivered" && (
                          <button
                            onClick={() => handleStatusChange(order.id, order.status === "Pending" ? "Preparing" : "Delivered")}
                            className="px-2.5 py-1 rounded-lg bg-surface-container border border-white/5 hover:bg-tertiary-container/10 text-on-surface-variant hover:text-tertiary-container text-[10px] font-semibold transition-all cursor-pointer"
                          >
                            {order.status === "Pending" ? "Start Prep" : "Mark Delivered"}
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 rounded-lg bg-surface-container border border-white/5 hover:bg-primary-container/10 hover:border-primary-container/20 text-on-surface-variant hover:text-primary-container transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id, order.room)}
                          className="p-1.5 rounded-lg bg-surface-container border border-white/5 hover:bg-error/10 hover:border-error/20 text-on-surface-variant hover:text-error transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Order Modal */}
      <dialog
        ref={addDialogRef}
        onClose={() => setShowAddModal(false)}
        className="glass-card p-6 rounded-2xl w-full max-w-lg bg-[#0b1326]/95 border border-white/10 text-[#dae2fd] shadow-2xl backdrop-blur-xl focus:outline-none m-auto backdrop:bg-[#0b1326]/60 backdrop:backdrop-blur-sm"
        onClick={(e) => {
          const rect = addDialogRef.current?.getBoundingClientRect();
          if (rect) {
            const isInDialog = (
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom
            );
            if (!isInDialog) setShowAddModal(false);
          }
        }}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent" />
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
          <div>
            <h3 className="text-sm font-bold text-primary">New Dietary Request</h3>
            <p className="text-[10px] text-on-surface-variant">Log patient pantry order and meal plan schedules</p>
          </div>
          <button
            onClick={() => setShowAddModal(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-on-surface-variant hover:text-error transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-4">
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
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Room Number</label>
              <input
                type="text"
                required
                value={formRoom}
                onChange={(e) => setFormRoom(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
                placeholder="e.g. ICU-01"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Quantity</label>
              <input
                type="number"
                required
                min="1"
                max="10"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
                placeholder="1"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Diet Plan / Meal Item</label>
            <select
              value={formItem}
              onChange={(e) => setFormItem(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff] cursor-pointer"
            >
              <option value="Regular Diet Meal">Regular Diet Meal</option>
              <option value="Liquid Diet (Broth + Apple Juice)">Liquid Diet (Broth + Apple Juice)</option>
              <option value="Soft Non-Chew Diet Meal">Soft Non-Chew Diet Meal</option>
              <option value="Low-Sodium Diabetic Lunch">Low-Sodium Diabetic Lunch</option>
              <option value="High-Protein Recovery Meal">High-Protein Recovery Meal</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Target Delivery Time</label>
              <input
                type="text"
                required
                value={formDeliveryTime}
                onChange={(e) => setFormDeliveryTime(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
                placeholder="e.g. ASAP / 01:30 PM"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Order Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff] cursor-pointer"
              >
                <option value="Pending">Pending</option>
                <option value="Preparing">Preparing</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5 mt-6">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 border border-white/10 rounded-xl text-xs text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-primary-container to-[#14d1ff] text-on-primary font-bold px-5 py-2 rounded-xl text-xs hover:brightness-110 active:scale-[0.98] transition-all active-glow flex items-center gap-1 cursor-pointer"
            >
              Dispatch Order <Utensils className="w-4 h-4" />
            </button>
          </div>
        </form>
      </dialog>

      {/* Details View Modal */}
      <dialog
        ref={detailDialogRef}
        onClose={() => setSelectedOrder(null)}
        className="glass-card p-6 rounded-2xl w-full max-w-md bg-[#0b1326]/95 border border-white/10 text-[#dae2fd] shadow-2xl backdrop-blur-xl focus:outline-none m-auto backdrop:bg-[#0b1326]/60 backdrop:backdrop-blur-sm"
        onClick={(e) => {
          const rect = detailDialogRef.current?.getBoundingClientRect();
          if (rect) {
            const isInDialog = (
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom
            );
            if (!isInDialog) setSelectedOrder(null);
          }
        }}
      >
        {selectedOrder && (
          <>
            <div className="absolute top-0 left-0 w-full h-1 bg-[#00f0ff]" />
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Dietary Service Slip</h3>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Room {selectedOrder.room} • {selectedOrder.patientName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-on-surface-variant hover:text-error transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 border-t border-b border-white/5 py-4">
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Patient Name</p>
                  <p className="font-semibold mt-0.5 text-on-surface">{selectedOrder.patientName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Room Number</p>
                  <p className="font-semibold mt-0.5 text-on-surface">{selectedOrder.room}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Ordered Item / Diet</p>
                <p className="font-semibold mt-0.5 text-on-surface">
                  {selectedOrder.item} (Qty: {selectedOrder.quantity})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Target Delivery</p>
                  <p className="font-semibold mt-0.5 text-on-surface">{selectedOrder.deliveryTime}</p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Status</p>
                  <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusStyle(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5 mt-6">
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-surface-container border border-white/5 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-surface-variant/40 transition-colors cursor-pointer"
              >
                Close Slip
              </button>
            </div>
          </>
        )}
      </dialog>

      {/* Global glassmorphic toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none select-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="glass-card p-4 rounded-xl flex items-start gap-3 w-80 shadow-2xl pointer-events-auto border border-primary-container/20"
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
