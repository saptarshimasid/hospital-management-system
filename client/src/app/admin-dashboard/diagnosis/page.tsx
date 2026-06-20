"use client";
import { API_BASE } from "@/utils/api";

import { useEffect, useState, useRef, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Activity,
  Plus,
  X,
  Search,
  Eye,
  Trash2,
  Calendar,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  ClipboardList
} from "lucide-react";
import { SearchContext } from "../layout";

interface DiagnosisRecord {
  id: string;
  patientName: string;
  age: number;
  gender: string;
  doctorName: string;
  testType: string;
  testDate: string;
  results: string;
  status: string;
  createdAt?: string;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error";
}

export default function DiagnosisPage() {
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and Filters
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const [testFilter, setTestFilter] = useState("all");
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DiagnosisRecord | null>(null);
  
  // Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Add Form State
  const [formPatientName, setFormPatientName] = useState("");
  const [formAge, setFormAge] = useState("");
  const [formGender, setFormGender] = useState("Male");
  const [formDoctor, setFormDoctor] = useState("");
  const [formTestType, setFormTestType] = useState("Pathology");
  const [formResults, setFormResults] = useState("");
  const [formStatus, setFormStatus] = useState("Completed");
  const [displayDate, setDisplayDate] = useState("");

  const statsContainerRef = useRef<HTMLDivElement>(null);
  const addDialogRef = useRef<HTMLDialogElement>(null);
  const detailDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    fetchDiagnoses();
  }, []);

  // GSAP Entrance
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
    if (selectedRecord) {
      detailDialogRef.current?.showModal();
    } else {
      detailDialogRef.current?.close();
    }
  }, [selectedRecord]);

  const triggerToast = (title: string, message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchDiagnoses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/diagnoses`);
      if (res.ok) {
        const data = await res.json();
        setDiagnoses(
          data.map((d: any) => ({
            ...d,
            id: d._id || d.id,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch diagnoses", err);
      triggerToast("Network Error", "Could not retrieve diagnoses from Database.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      patientName: formPatientName,
      age: parseInt(formAge) || 30,
      gender: formGender,
      doctorName: formDoctor || "Dr. Sarah Jenkins",
      testType: formTestType,
      testDate: new Date().toISOString().split('T')[0],
      results: formResults,
      status: formStatus
    };

    try {
      const res = await fetch(`${API_BASE}/api/diagnoses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to log diagnosis");
      
      triggerToast("Record Added", `Successfully logged ${formTestType} results for ${formPatientName}.`);
      fetchDiagnoses();
      setShowAddModal(false);
      
      // Reset form
      setFormPatientName("");
      setFormAge("");
      setFormGender("Male");
      setFormDoctor("");
      setFormResults("");
      setFormStatus("Completed");
    } catch (err) {
      console.error(err);
      triggerToast("Database Error", "Failed to upload diagnosis record.", "error");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove the diagnostic log for ${name}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/diagnoses/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        triggerToast("Record Deleted", `Diagnosis details for ${name} removed.`, "error");
        fetchDiagnoses();
      }
    } catch (err) {
      console.error(err);
      triggerToast("Archive Error", "Failed to delete record.", "error");
    }
  };

  const filteredDiagnoses = diagnoses.filter((d) => {
    const matchesSearch =
      d.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.testType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.doctorName.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesFilter =
      testFilter === "all" ||
      d.testType.toLowerCase() === testFilter.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  // Stats calculation
  const totalCount = diagnoses.length;
  const pathologyCount = diagnoses.filter((d) => d.testType === "Pathology").length;
  const usgCount = diagnoses.filter((d) => d.testType === "USG").length;
  const imagingCount = diagnoses.filter((d) => d.testType === "MRI" || d.testType === "X-Ray").length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Diagnostics & Lab Reports
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Track and search patients' laboratory tests, pathology files, scans, and USG results.
          </p>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button className="bg-surface-container-high border border-white/5 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-surface-variant/40 transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            {displayDate}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-primary-container to-secondary-container text-on-primary font-bold px-5 py-2.5 rounded-xl text-xs hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-1.5 active-glow cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Upload Test Results
          </button>
        </div>
      </div>

      {/* Stats Cards - Fully Responsive */}
      <div ref={statsContainerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Total Tests</p>
            <h3 className="text-xl font-bold mt-1">{totalCount}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-[#56f0da]/15 flex items-center justify-center text-tertiary-container">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Pathology Labs</p>
            <h3 className="text-xl font-bold mt-1 text-tertiary-container">{pathologyCount}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-[#14d1ff]/15 flex items-center justify-center text-secondary-container">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Ultrasound (USG)</p>
            <h3 className="text-xl font-bold mt-1 text-secondary-container">{usgCount}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-error/15 flex items-center justify-center text-error">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Imaging Scans (MRI/X-Ray)</p>
            <h3 className="text-xl font-bold mt-1 text-error">{imagingCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="glass-panel p-6 rounded-2xl space-y-6 bg-surface-container/20 border border-white/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 opacity-60" />
            <input
              type="text"
              placeholder="Search by patient, doctor, or test type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-xs focus:ring-1 focus:ring-primary/50 text-on-surface placeholder-on-surface-variant/40 focus:outline-none"
            />
          </div>

          {/* Test filters */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Test Category</span>
            <select
              value={testFilter}
              onChange={(e) => setTestFilter(e.target.value)}
              className="bg-[#0b1326] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
            >
              <option value="all">All Tests</option>
              <option value="pathology">Pathology</option>
              <option value="usg">USG</option>
              <option value="mri">MRI</option>
              <option value="x-ray">X-Ray</option>
            </select>
          </div>
        </div>

        {/* Responsive Table Container */}
        <div className="overflow-x-auto custom-scrollbar w-full">
          <table className="w-full text-left border-collapse text-xs min-w-[600px]">
            <thead>
              <tr className="text-on-surface-variant/80 border-b border-white/5 font-medium uppercase tracking-wider text-[9px]">
                <th className="pb-3.5">Patient Name</th>
                <th className="pb-3.5">Test Type</th>
                <th className="pb-3.5">Physician</th>
                <th className="pb-3.5">Tested Date</th>
                <th className="pb-3.5">Status</th>
                <th className="pb-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 font-mono text-primary/70">
                    RETRIEVING DIAGNOSTIC LAB RECORDS...
                  </td>
                </tr>
              ) : filteredDiagnoses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-on-surface-variant opacity-60">
                    No matching diagnostic records found.
                  </td>
                </tr>
              ) : (
                filteredDiagnoses.map((record) => (
                  <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3.5 font-bold text-on-surface">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="px-2.5 py-1 rounded-lg bg-primary-container/10 border border-primary-container/20 text-primary-container hover:bg-primary-container/20 transition-all font-bold text-[10px]"
                        >
                          View Test Result
                        </button>
                        <span>{record.patientName}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="font-semibold text-secondary-container">{record.testType}</span>
                    </td>
                    <td className="py-3.5 text-on-surface-variant">{record.doctorName}</td>
                    <td className="py-3.5 font-mono text-on-surface-variant/80">{record.testDate}</td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        record.status === "Completed" 
                          ? "bg-tertiary-container/10 text-tertiary-container border border-tertiary-container/20"
                          : "bg-error/10 text-error border border-error/20"
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="p-1.5 rounded-lg bg-surface-container border border-white/5 hover:bg-primary-container/10 hover:border-primary-container/20 text-on-surface-variant hover:text-primary-container transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id, record.patientName)}
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

      {/* Add Diagnosis Record Modal - Centered & Responsive */}
      <dialog
        ref={addDialogRef}
        onClose={() => setShowAddModal(false)}
        className="glass-card p-6 rounded-2xl w-[92%] sm:w-full max-w-lg bg-[#0b1326]/95 border border-white/10 text-[#dae2fd] shadow-2xl backdrop-blur-xl focus:outline-none m-auto backdrop:bg-[#0b1326]/60 backdrop:backdrop-blur-sm"
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
            <h3 className="text-sm font-bold text-primary">Upload Test Results</h3>
            <p className="text-[10px] text-on-surface-variant">Log patient lab report, pathology, USG or scans</p>
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
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
              placeholder="e.g. Arthur Morgan"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Age</label>
              <input
                type="number"
                required
                value={formAge}
                onChange={(e) => setFormAge(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                placeholder="30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Gender</label>
              <select
                value={formGender}
                onChange={(e) => setFormGender(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Test Category</label>
              <select
                value={formTestType}
                onChange={(e) => setFormTestType(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
              >
                <option value="Pathology">Pathology</option>
                <option value="USG">USG</option>
                <option value="MRI">MRI</option>
                <option value="X-Ray">X-Ray</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Roster Physician</label>
              <input
                type="text"
                required
                value={formDoctor}
                onChange={(e) => setFormDoctor(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                placeholder="e.g. Dr. Sarah Jenkins"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Diagnosis Results / Findings</label>
            <textarea
              required
              rows={3}
              value={formResults}
              onChange={(e) => setFormResults(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] resize-none"
              placeholder="Explain findings, measurements, diagnostic inferences..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Status</label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
            >
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
            </select>
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
              Upload Record <Activity className="w-4 h-4" />
            </button>
          </div>
        </form>
      </dialog>

      {/* Details View Modal - Animated using Framer Motion */}
      <dialog
        ref={detailDialogRef}
        onClose={() => setSelectedRecord(null)}
        className="glass-card p-0 rounded-2xl w-[92%] sm:w-full max-w-md bg-[#0b1326]/95 border border-white/10 text-[#dae2fd] shadow-2xl backdrop-blur-xl focus:outline-none m-auto backdrop:bg-[#0b1326]/60 backdrop:backdrop-blur-sm overflow-hidden"
        onClick={(e) => {
          const rect = detailDialogRef.current?.getBoundingClientRect();
          if (rect) {
            const isInDialog = (
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom
            );
            if (!isInDialog) setSelectedRecord(null);
          }
        }}
      >
        <AnimatePresence>
          {selectedRecord && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="p-6"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-[#00f0ff]" />
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary">Diagnostic Analysis</h3>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{selectedRecord.testType} REPORT</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-on-surface-variant hover:text-error transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 border-t border-b border-white/5 py-4">
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Patient Name</p>
                    <p className="font-semibold mt-0.5 text-on-surface">{selectedRecord.patientName}</p>
                    <p className="text-[9px] text-on-surface-variant">{selectedRecord.gender}, {selectedRecord.age} yrs</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Referral Doctor</p>
                    <p className="font-semibold mt-0.5 text-on-surface">{selectedRecord.doctorName}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Test / Scan Date</p>
                  <p className="font-mono text-on-surface font-semibold mt-0.5">{selectedRecord.testDate}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 mt-2">
                  <p className="text-[10px] text-primary uppercase tracking-wider font-bold mb-1">Clinical Findings</p>
                  <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">{selectedRecord.results}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Category</p>
                    <p className="font-semibold mt-0.5 text-on-surface">{selectedRecord.testType}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Verification</p>
                    <span className="inline-flex items-center gap-1 mt-1 text-tertiary-container font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Certified
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/5 mt-6">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="bg-surface-container border border-white/5 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-surface-variant/40 transition-colors cursor-pointer"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
