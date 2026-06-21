"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  User,
  Briefcase,
  Calendar,
  Bed,
  Scissors,
  FileText,
  DollarSign,
  Pill,
  Activity,
  Utensils,
  Search,
  Plus,
  Edit2,
  Trash2,
  Database,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle,
  HelpCircle
} from "lucide-react";

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "warning";
}

interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "email";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

interface CollectionConfig {
  id: string;
  label: string;
  endpoint: string;
  icon: any;
}

const COLLECTIONS: CollectionConfig[] = [
  { id: "patients", label: "Patients", endpoint: "patients", icon: Users },
  { id: "doctors", label: "Doctors", endpoint: "doctors", icon: User },
  { id: "staff", label: "Staff", endpoint: "staff", icon: Briefcase },
  { id: "appointments", label: "Appointments", endpoint: "appointments", icon: Calendar },
  { id: "beds", label: "Beds", endpoint: "beds", icon: Bed },
  { id: "surgeries", label: "Surgeries", endpoint: "surgeries", icon: Scissors },
  { id: "invoices", label: "Invoices", endpoint: "invoices", icon: FileText },
  { id: "transactions", label: "Transactions", endpoint: "transactions", icon: DollarSign },
  { id: "medications", label: "Medications", endpoint: "medications", icon: Pill },
  { id: "prescriptions", label: "Prescriptions", endpoint: "prescriptions", icon: FileText },
  { id: "reports", label: "Reports", endpoint: "reports", icon: Activity },
  { id: "diagnoses", label: "Diagnoses", endpoint: "diagnoses", icon: Activity },
  { id: "pantry_inventory", label: "Pantry Inventory", endpoint: "pantry/inventory", icon: Utensils },
  { id: "pantry_orders", label: "Pantry Orders", endpoint: "pantry", icon: Utensils },
  { id: "pages", label: "Dashboard Pages", endpoint: "pages", icon: LayoutDashboard }
];

const COLLECTION_SCHEMAS: Record<string, { fields: FieldConfig[] }> = {
  patients: {
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "age", label: "Age", type: "number", required: true },
      { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"], required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "condition", label: "Condition", type: "text", required: true },
      { key: "status", label: "Status", type: "select", options: ["Stable", "Critical", "ICU", "Under Observation"], required: true },
      { key: "admission", label: "Admission Status", type: "select", options: ["Admitted", "Discharged", "Under Observation", "Just now"], required: true },
      { key: "img", label: "Image URL", type: "text", placeholder: "https://..." }
    ]
  },
  doctors: {
    fields: [
      { key: "name", label: "Doctor Name", type: "text", required: true },
      { key: "age", label: "Age", type: "number" },
      { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
      { key: "email", label: "Email", type: "email" },
      { key: "dept", label: "Department", type: "select", options: ["Cardiology", "Neurology", "Pediatrics", "Oncology", "ER", "General Medicine"], required: true },
      { key: "status", label: "Status", type: "select", options: ["available", "on duty", "off duty", "on leave"], required: true },
      { key: "schedule", label: "Schedule", type: "text", placeholder: "e.g. 08:00 - 16:00" },
      { key: "img", label: "Image URL", type: "text", placeholder: "https://..." }
    ]
  },
  staff: {
    fields: [
      { key: "name", label: "Staff Name", type: "text", required: true },
      { key: "age", label: "Age", type: "number" },
      { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
      { key: "email", label: "Email", type: "email" },
      { key: "role", label: "Role", type: "text", required: true, placeholder: "e.g. Nurse, Radiologist" },
      { key: "dept", label: "Department", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive"], required: true },
      { key: "shift", label: "Shift", type: "select", options: ["Day Shift", "Night Shift", "Double Shift"] },
      { key: "img", label: "Image URL", type: "text", placeholder: "https://..." }
    ]
  },
  appointments: {
    fields: [
      { key: "name", label: "Patient Name", type: "text", required: true },
      { key: "age", label: "Patient Age", type: "number" },
      { key: "gender", label: "Patient Gender", type: "select", options: ["Male", "Female", "Other"] },
      { key: "email", label: "Patient Email", type: "email" },
      { key: "doctor", label: "Doctor Name", type: "text", required: true },
      { key: "dept", label: "Department", type: "select", options: ["Cardiology", "Neurology", "Pediatrics", "Oncology", "ER", "General Medicine"], required: true },
      { key: "date", label: "Date", type: "date", required: true },
      { key: "time", label: "Time", type: "text", placeholder: "e.g. 10:30 AM", required: true },
      { key: "status", label: "Status", type: "select", options: ["Scheduled", "Completed", "Cancelled"], required: true },
      { key: "img", label: "Patient Image URL", type: "text", placeholder: "https://..." }
    ]
  },
  beds: {
    fields: [
      { key: "id", label: "Bed ID (For New Bed)", type: "text", required: true, placeholder: "e.g. BED-401, ICU-12" },
      { key: "ward", label: "Ward Type", type: "select", options: ["Men's Ward", "Women's Ward", "ICU", "VIP Suite"], required: true },
      { key: "status", label: "Status", type: "select", options: ["available", "occupied", "cleaning"], required: true },
      { key: "patient", label: "Patient Name (Occupied only)", type: "text" },
      { key: "diagnosis", label: "Diagnosis", type: "text" },
      { key: "timer", label: "Cleaning Timer (mins)", type: "number" },
      { key: "gender", label: "Gender Match", type: "select", options: ["", "Male", "Female", "Other"] },
      { key: "age", label: "Age Match", type: "number" }
    ]
  },
  surgeries: {
    fields: [
      { key: "room", label: "Operating Room / OT", type: "text", required: true, placeholder: "e.g. OT-3" },
      { key: "patientName", label: "Patient Name", type: "text", required: true },
      { key: "surgeon", label: "Surgeon Name", type: "text", required: true },
      { key: "procedure", label: "Procedure", type: "text", required: true, placeholder: "e.g. Cardiac Bypass" },
      { key: "time", label: "Time Schedule", type: "text", required: true, placeholder: "e.g. 09:00 - 11:30" },
      { key: "status", label: "Status", type: "select", options: ["Scheduled", "In Progress", "Completed", "Cancelled"], required: true },
      { key: "gender", label: "Patient Gender", type: "select", options: ["Male", "Female", "Other"] },
      { key: "age", label: "Patient Age", type: "number" },
      { key: "img", label: "Patient Image URL", type: "text", placeholder: "https://..." }
    ]
  },
  invoices: {
    fields: [
      { key: "patientName", label: "Patient Name", type: "text", required: true },
      { key: "age", label: "Patient Age", type: "number" },
      { key: "gender", label: "Patient Gender", type: "select", options: ["Male", "Female", "Other"] },
      { key: "dept", label: "Department", type: "text" },
      { key: "services", label: "Services Rendered", type: "text", required: true, placeholder: "e.g. ICU Stay, Ventilation" },
      { key: "amount", label: "Total Amount ($)", type: "number", required: true },
      { key: "date", label: "Invoice Date", type: "date", required: true },
      { key: "status", label: "Payment Status", type: "select", options: ["Paid", "Pending", "Overdue"], required: true }
    ]
  },
  transactions: {
    fields: [
      { key: "patientName", label: "Name / Payee", type: "text" },
      { key: "age", label: "Age", type: "number" },
      { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
      { key: "email", label: "Email", type: "email" },
      { key: "type", label: "Transaction Type", type: "select", options: ["Income", "Expense"], required: true },
      { key: "amount", label: "Amount ($)", type: "number", required: true },
      { key: "method", label: "Method", type: "select", options: ["Card", "Cash", "Insurance", "Bank Transfer"], required: true },
      { key: "date", label: "Date", type: "date", required: true }
    ]
  },
  medications: {
    fields: [
      { key: "name", label: "Medication Name", type: "text", required: true },
      { key: "category", label: "Category", type: "text", required: true, placeholder: "e.g. Antibiotics" },
      { key: "dosage", label: "Dosage", type: "text", required: true, placeholder: "e.g. 500mg" },
      { key: "sku", label: "SKU / Code", type: "text", required: true, placeholder: "e.g. MED-SKU-1002" },
      { key: "quantity", label: "Quantity in Stock", type: "number", required: true },
      { key: "status", label: "Status", type: "select", options: ["In Stock", "Low Stock", "Out of Stock"], required: true }
    ]
  },
  prescriptions: {
    fields: [
      { key: "patientName", label: "Patient Name", type: "text", required: true },
      { key: "drug", label: "Drug Prescribed", type: "text", required: true },
      { key: "dosage", label: "Dosage Instructions", type: "text", required: true, placeholder: "e.g. 1 tab daily" },
      { key: "date", label: "Date Issued", type: "date", required: true },
      { key: "status", label: "Status", type: "select", options: ["active", "dispensed", "completed"], required: true }
    ]
  },
  reports: {
    fields: [
      { key: "name", label: "Report Title", type: "text", required: true },
      { key: "category", label: "Category", type: "select", options: ["Radiology", "Lab Report", "Discharge Summary", "Operation Note"], required: true },
      { key: "date", label: "Date Created", type: "date", required: true },
      { key: "size", label: "File Size", type: "text", placeholder: "e.g. 1.2 MB", required: true },
      { key: "author", label: "Authoring Doctor / Staff", type: "text", required: true }
    ]
  },
  diagnoses: {
    fields: [
      { key: "patientName", label: "Patient Name", type: "text", required: true },
      { key: "age", label: "Patient Age", type: "number", required: true },
      { key: "gender", label: "Patient Gender", type: "select", options: ["Male", "Female", "Other"], required: true },
      { key: "doctorName", label: "Doctor Name", type: "text", required: true },
      { key: "testType", label: "Test Type", type: "select", options: ["Pathology", "Radiology", "Cardiology Test", "Neurology Test"], required: true },
      { key: "testDate", label: "Test Date", type: "date", required: true },
      { key: "results", label: "Results / Findings", type: "text", required: true },
      { key: "status", label: "Status", type: "select", options: ["Completed", "Pending"], required: true }
    ]
  },
  pantry_inventory: {
    fields: [
      { key: "name", label: "Food / Drink Name", type: "text", required: true },
      { key: "stock", label: "Stock Available", type: "number", required: true },
      { key: "unit", label: "Unit", type: "select", options: ["Plates", "Cups", "Packets", "Pieces", "Servings"], required: true }
    ]
  },
  pantry_orders: {
    fields: [
      { key: "patientName", label: "Patient Name", type: "text", required: true },
      { key: "room", label: "Room No.", type: "text", required: true },
      { key: "item", label: "Food / Item Ordered", type: "text", required: true },
      { key: "quantity", label: "Quantity", type: "number", required: true },
      { key: "status", label: "Status", type: "select", options: ["Pending", "Preparing", "Delivered", "Cancelled"], required: true },
      { key: "deliveryTime", label: "Delivery Time", type: "text", placeholder: "e.g. ASAP or 13:00" }
    ]
  },
  pages: {
    fields: [
      { key: "name", label: "Page Name", type: "text", required: true },
      { key: "href", label: "Route Path / URL", type: "text", required: true, placeholder: "e.g. /admin-dashboard/my-page" },
      { key: "icon", label: "Lucide Icon Name", type: "text", required: true, placeholder: "e.g. Calendar, Heart, Shield" },
      { key: "subtitle", label: "Subtitle / Description", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive"], required: true },
      { key: "order_index", label: "Sort Order Index", type: "number", required: true }
    ]
  }
};

export default function AdminConsolePage() {
  const [activeCollectionId, setActiveCollectionId] = useState<string>("patients");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Dialog state
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  const activeCollection = COLLECTIONS.find((c) => c.id === activeCollectionId) || COLLECTIONS[0];
  const activeSchema = COLLECTION_SCHEMAS[activeCollectionId] || { fields: [] };

  useEffect(() => {
    fetchRecords();
  }, [activeCollectionId]);

  const triggerToast = (title: string, message: string, type: "success" | "error" | "warning" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/${activeCollection.endpoint}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      } else {
        throw new Error(`Failed with status ${res.status}`);
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("Connection Error", `Could not retrieve records for ${activeCollection.label}.`, "error");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    const initialData: Record<string, any> = {};
    activeSchema.fields.forEach((f) => {
      if (f.type === "select" && f.options && f.options.length > 0) {
        initialData[f.key] = f.options[0];
      } else if (f.type === "number") {
        initialData[f.key] = "";
      } else {
        initialData[f.key] = "";
      }
    });
    setFormData(initialData);
    setEditingRecord(null);
    setShowFormModal(true);
  };

  const openEditModal = (record: any) => {
    const editData: Record<string, any> = {};
    activeSchema.fields.forEach((f) => {
      editData[f.key] = record[f.key] !== undefined && record[f.key] !== null ? record[f.key] : "";
    });
    setFormData(editData);
    setEditingRecord(record);
    setShowFormModal(true);
  };

  const handleDelete = async (record: any) => {
    const recId = record._id || record.id;
    const name = record.name || record.patientName || record.patient_name || recId;
    if (!confirm(`Are you sure you want to delete this record (${name}) from ${activeCollection.label}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/${activeCollection.endpoint}/${recId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        triggerToast("Deleted", `Successfully removed record from ${activeCollection.label}.`, "warning");
        fetchRecords();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Delete failed");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("Deletion Error", err.message || "Failed to remove the record.", "error");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Cast properties to proper types (numbers, trimmed strings)
    const payload: Record<string, any> = {};
    activeSchema.fields.forEach((f) => {
      const value = formData[f.key];
      if (f.type === "number") {
        payload[f.key] = value === "" ? null : Number(value);
      } else {
        payload[f.key] = typeof value === "string" ? value.trim() : value;
      }
    });

    const isEditMode = !!editingRecord;
    const recId = editingRecord ? (editingRecord._id || editingRecord.id) : null;
    const url = isEditMode
      ? `${API_BASE}/api/${activeCollection.endpoint}/${recId}`
      : `${API_BASE}/api/${activeCollection.endpoint}`;

    try {
      const res = await fetch(url, {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        triggerToast(
          isEditMode ? "Record Updated" : "Record Created",
          `Successfully saved changes in ${activeCollection.label}.`,
          "success"
        );
        setShowFormModal(false);
        fetchRecords();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Save failed");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("Database Error", err.message || "Could not save the record.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Filter records based on search query
  const filteredRecords = records.filter((r) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return Object.values(r).some((val) => {
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(term);
    });
  });

  const ActiveIcon = activeCollection.icon;

  return (
    <div className="space-y-6">
      {/* Toast notifications portal */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`p-4 rounded-xl border flex items-start gap-3 shadow-2xl min-w-72 backdrop-blur-md ${
                t.type === "error"
                  ? "bg-red-950/80 border-red-500/30 text-red-200"
                  : t.type === "warning"
                  ? "bg-amber-950/80 border-amber-500/30 text-amber-200"
                  : "bg-emerald-950/80 border-emerald-500/30 text-emerald-200"
              }`}
            >
              {t.type === "error" ? (
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="font-semibold text-xs">{t.title}</h4>
                <p className="text-[11px] opacity-80 mt-0.5">{t.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Admin Panel Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary">
            <Database className="w-6 h-6 text-[#00f0ff]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              Clinical Database Console
            </h1>
            <p className="text-xs text-on-surface-variant opacity-70">
              System Admin HUD &bull; Full CRUD Telemetry Control
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Table Selection Dropdown */}
          <div className="relative w-full sm:w-56">
            <select
              value={activeCollectionId}
              onChange={(e) => setActiveCollectionId(e.target.value)}
              className="w-full h-11 px-4 pr-10 text-xs bg-[#16223f]/80 border border-white/10 rounded-xl text-[#dae2fd] focus:outline-none focus:border-[#00f0ff]/50 appearance-none cursor-pointer"
            >
              {COLLECTIONS.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0b1326] text-[#dae2fd]">
                  {c.label}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
              <span className="material-symbols-outlined !text-sm">keyboard_arrow_down</span>
            </div>
          </div>

          {/* Action buttons */}
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="h-11 px-3.5 border border-white/10 rounded-xl hover:bg-white/5 text-on-surface-variant flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={openAddModal}
            className="h-11 px-4 bg-tertiary-container text-xs font-semibold rounded-xl flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all text-[#0b1326] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Record
          </button>
        </div>
      </div>

      {/* Database View Section */}
      <div className="bg-[#16223f]/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        {/* Table Search & Meta Header */}
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <ActiveIcon className="w-4 h-4 text-[#00f0ff] opacity-80" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#dae2fd]">
              {activeCollection.label} Records ({filteredRecords.length})
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder={`Search ${activeCollection.label}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-xs bg-white/5 border border-white/10 rounded-lg text-[#dae2fd] placeholder:opacity-55 focus:outline-none focus:border-[#00f0ff]/50"
            />
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
          </div>
        </div>

        {/* Data Grid Table */}
        <div className="overflow-x-auto custom-scrollbar max-h-[600px] overflow-y-auto pr-1" data-lenis-prevent="">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-[#00f0ff] animate-spin" />
              <p className="text-xs opacity-60">Synchronizing database tables...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-20 text-center text-on-surface-variant opacity-60 flex flex-col items-center gap-2">
              <HelpCircle className="w-8 h-8 text-on-surface-variant opacity-50" />
              <p className="text-xs font-semibold">No Records Found</p>
              <p className="text-[10px]">Create a new entry or adjust your search filter.</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-white/2 sticky top-0 border-b border-white/10 text-on-surface-variant uppercase text-[10px] tracking-wider select-none backdrop-blur-md">
                <tr>
                  <th className="py-3.5 px-6 font-semibold">ID / Key</th>
                  {activeSchema.fields.map((f) => (
                    <th key={f.key} className="py-3.5 px-6 font-semibold">
                      {f.label}
                    </th>
                  ))}
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRecords.map((record) => {
                  const id = record._id || record.id;
                  return (
                    <tr
                      key={id}
                      className="hover:bg-white/2 transition-colors group"
                    >
                      <td className="py-3 px-6 font-mono text-[10px] text-[#00f0ff] select-all max-w-[120px] truncate">
                        {id}
                      </td>
                      {activeSchema.fields.map((f) => {
                        const val = record[f.key];
                        return (
                          <td key={f.key} className="py-3 px-6 text-[#dae2fd]">
                            {f.key === "img" && val ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={val}
                                  alt="Preview"
                                  className="w-6 h-6 rounded-full border border-white/10 object-cover shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "https://lh3.googleusercontent.com/aida-public/AB6AXuBUR93vsX8-PeJEf1vGo8anymPqpciIEu9_x9IjqrdZVQwRFInWdZrZh6EzF98zhcTAmu_qo75Zgq62h2u1qhebSvRpv8x9AdnDALYA2yPyr7nokvD2GDDZcOQynWOdukWkeiebcJhfXbKTWxTKwBvrfayAZQVJWFzwXqW01XzNzkzLnGnX6VWvfWZzXmROwFxKzACpOmHaTRUfrTcmj9buFrYebCfW0MG8AUWnuLh0dNVA-DRbYj5WYsqfFohmMdu7i7c3SPhaaDI";
                                  }}
                                />
                                <span className="truncate max-w-[120px] font-mono text-[9px] opacity-60">
                                  {val}
                                </span>
                              </div>
                            ) : typeof val === "boolean" ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  val
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-white/5 text-on-surface-variant border border-white/10"
                                }`}
                              >
                                {val ? "TRUE" : "FALSE"}
                              </span>
                            ) : f.type === "number" && val !== undefined && val !== null ? (
                              <span className="font-semibold text-right">
                                {f.key === "amount" ? `$${Number(val).toLocaleString()}` : val}
                              </span>
                            ) : val !== undefined && val !== null ? (
                              String(val)
                            ) : (
                              <span className="opacity-30 italic">none</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-6 text-right select-none">
                        <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(record)}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-[#00f0ff]/10 hover:text-[#00f0ff] transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Dynamic Overlay Form Modal (Create / Edit) - Premium Fixed Header/Footer with Scrollbar */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFormModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              data-lenis-prevent=""
              data-is-modal=""
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-[#0b1326] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] relative z-10 text-xs overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#16223f]/40 shrink-0">
                <div className="flex items-center gap-2">
                  <ActiveIcon className="w-4 h-4 text-[#00f0ff]" />
                  <h3 className="font-bold text-[#dae2fd]">
                    {editingRecord ? "Edit Record" : "Add Record"} &bull; {activeCollection.label}
                  </h3>
                </div>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="p-1 rounded-lg text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0">
                {/* Scrollable Fields Container */}
                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 pr-2">
                  {activeSchema.fields.map((f) => {
                    // If Bed ID is being edited on edit mode, we make it read-only
                    const isIdField = f.key === "id";
                    const isReadOnly = isIdField && !!editingRecord;

                    if (isIdField && activeCollectionId !== "beds") {
                      return null; // ID field only visible/editable for new beds
                    }

                    return (
                      <div key={f.key} className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-[#dae2fd]/85">
                          {f.label} {f.required && <span className="text-[#00f0ff]">*</span>}
                        </label>

                        {f.key === "img" ? (
                          <div className="space-y-2">
                            {/* Visual Preview Area */}
                            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/10">
                              <img
                                src={formData[f.key] || "https://lh3.googleusercontent.com/aida-public/AB6AXuBUR93vsX8-PeJEf1vGo8anymPqpciIEu9_x9IjqrdZVQwRFInWdZrZh6EzF98zhcTAmu_qo75Zgq62h2u1qhebSvRpv8x9AdnDALYA2yPyr7nokvD2GDDZcOQynWOdukWkeiebcJhfXbKTWxTKwBvrfayAZQVJWFzwXqW01XzNzkzLnGnX6VWvfWZzXmROwFxKzACpOmHaTRUfrTcmj9buFrYebCfW0MG8AUWnuLh0dNVA-DRbYj5WYsqfFohmMdu7i7c3SPhaaDI"}
                                alt="Preview"
                                className="w-12 h-12 rounded-full border border-white/10 object-cover bg-black/20"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://lh3.googleusercontent.com/aida-public/AB6AXuBUR93vsX8-PeJEf1vGo8anymPqpciIEu9_x9IjqrdZVQwRFInWdZrZh6EzF98zhcTAmu_qo75Zgq62h2u1qhebSvRpv8x9AdnDALYA2yPyr7nokvD2GDDZcOQynWOdukWkeiebcJhfXbKTWxTKwBvrfayAZQVJWFzwXqW01XzNzkzLnGnX6VWvfWZzXmROwFxKzACpOmHaTRUfrTcmj9buFrYebCfW0MG8AUWnuLh0dNVA-DRbYj5WYsqfFohmMdu7i7c3SPhaaDI";
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-on-surface-variant">Image Preview</p>
                                <p className="text-[9px] text-[#00f0ff] truncate font-mono mt-0.5">
                                  {formData[f.key] ? (formData[f.key].startsWith("data:") ? "Base64 Data Image" : formData[f.key]) : "No image selected"}
                                </p>
                              </div>
                              {formData[f.key] && (
                                <button
                                  type="button"
                                  onClick={() => handleInputChange(f.key, "")}
                                  className="text-[10px] text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            {/* File Upload Button / Input */}
                            <div className="relative flex items-center justify-center border border-dashed border-white/20 hover:border-[#00f0ff]/50 rounded-xl p-4 bg-white/2 hover:bg-[#00f0ff]/5 transition-all cursor-pointer group">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      handleInputChange(f.key, reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                              <div className="text-center space-y-1 pointer-events-none">
                                <span className="material-symbols-outlined text-[#00f0ff]/80 group-hover:scale-110 transition-transform">cloud_upload</span>
                                <p className="text-[10px] text-on-surface-variant font-semibold">
                                  Click or Drag & Drop to upload image
                                </p>
                                <p className="text-[8px] text-on-surface-variant/40">
                                  PNG, JPG or WEBP (Max 2MB recommended)
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : f.type === "select" ? (
                          <select
                            value={formData[f.key] || ""}
                            onChange={(e) => handleInputChange(f.key, e.target.value)}
                            required={f.required}
                            className="w-full h-10 px-3.5 bg-white/5 border border-white/10 rounded-xl text-[#dae2fd] focus:outline-none focus:border-[#00f0ff]/50 cursor-pointer"
                          >
                            {f.options?.map((opt) => (
                              <option key={opt} value={opt} className="bg-[#0b1326] text-[#dae2fd]">
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={f.type}
                            value={formData[f.key] || ""}
                            onChange={(e) => handleInputChange(f.key, e.target.value)}
                            required={f.required}
                            placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
                            disabled={isReadOnly}
                            className="w-full h-10 px-3.5 bg-white/5 border border-white/10 rounded-xl text-[#dae2fd] placeholder:opacity-40 focus:outline-none focus:border-[#00f0ff]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Fixed Footer Controls */}
                <div className="p-5 border-t border-white/10 flex justify-end gap-3 bg-[#16223f]/20 shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="h-10 px-5 border border-white/10 rounded-xl hover:bg-white/5 text-[#dae2fd] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-10 px-5 bg-tertiary-container text-[#0b1326] font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Save Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
