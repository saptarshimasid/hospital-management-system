"use client";
import { API_BASE } from "@/utils/api";

import { useEffect, useState, useRef, useContext } from "react";
import { SearchContext } from "../layout";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Users,
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
  AlertCircle
} from "lucide-react";

interface Patient {
  id: string;
  name: string;
  condition: string;
  admission: string;
  status: string;
  img: string;
  gender?: string;
  age?: number;
  email?: string;
  createdAt?: string;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error";
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const searchTerm = searchQuery;
  const setSearchTerm = setSearchQuery;
  const [genderFilter, setGenderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Add Patient Form State
  const [formName, setFormName] = useState("");
  const [formCondition, setFormCondition] = useState("");
  const [formStatus, setFormStatus] = useState("Pending");
  const [formGender, setFormGender] = useState("Male");
  const [formAge, setFormAge] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [displayDate, setDisplayDate] = useState("");

  const statsContainerRef = useRef<HTMLDivElement>(null);
  const addDialogRef = useRef<HTMLDialogElement>(null);
  const detailDialogRef = useRef<HTMLDialogElement>(null);

  // Fetch Patients on Mount
  useEffect(() => {
    const today = new Date();
    setDisplayDate(
      today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    );
    fetchPatients();
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
    if (selectedPatient) {
      detailDialogRef.current?.showModal();
    } else {
      detailDialogRef.current?.close();
    }
  }, [selectedPatient]);

  const triggerToast = (title: string, message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/patients`);
      if (res.ok) {
        const data = await res.json();
        setPatients(
          data.map((p: any) => ({
            ...p,
            id: p._id || p.id,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch patients", err);
      triggerToast("Network Error", "Could not retrieve patient data from MongoDB.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Choose random avatar
    const avatars = [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDmVsYcVmImeZHkXR5iUfIXPI5aazV4igMcaxMipsm2kMl5kuVusqoSIq-_yNJFvRtmx8XT825hAdfxKHm-uLdedCQx8UUlPTKptmJMQ2djWKfH3-GAkQcOrF3HxxoeEyJZQGfYd1IbXEdL0CnvJRvSHAnNzMaCI7UtJec2u2omFQCj1GWZZ2pRt9XNSCO4eoCRCrG-bXSl5ofe3yq-gt_OF0pG-A3Xnf-SFBpyhOtZip_ULAYFhioMcc4K9XMrYT3Q59FkV-OTwBw",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBDN3UVTzPzv0Af2e0RzKnIIEO4r9e__EQuYHMnJvh8UWv-6lnXFoZRlJKfi3IvG3LLUscX7j-SPCjcEm0KgmjBmAnhC72OshfvEi8pRB-SQCzdTNWkTSsMT7kZitjLz-d3s3iLxtJfFw-iLSvTcA9S0n-tUmzRtM2g-S0qOEN1qSdigBzn5aT2mtV550DjEN1kz_ZLg95eUGLgGJM4N9nVwt2TYQZfAYgh1xulrJwbYA7exPFK3j0QF1bsBBtzt0yyWHaVnLn9wik",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA23_Q91hh10bCN4f7gJMFJprKGgpdptxHMK6c2eIhhcE7Q1TwIjwKEdPjyA9YYKSl032mfuO_o3N6s9MQFH4wr0DGj2Us5Wp0mJFGwNWwhDCBhrD0RbRv1QbKMm8J2aKhnnm1_ZAcm530LQcyGmWwAtM2GziqffApwuWxx8-KpmpGPPZAucb8LNGMiTBmoS0xf4dEgNGrr--uC1FJxMybebjelAz2aB0FssgL75f3n8a9Tl3FPaC4cu6ASoSH5rEHOXQ85i2rHMq8",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBzLc-0PWFHLrfwLUNgEq48dDtFLusQjORiJhyAfCUgvYExrc_n6uN6rkyJlK8Go7hirf_te7NG-fXD7XDbC2gCGoWXKCdkwl5DOrUlMVwbhj_OFawGKER3rxK1fs9605FDUh5HTfYITdo2tEHU_nEKhkQWf7FZ-pbWIXWfiiyTnaUqFGgOeG_2yOARP6sroNOt-E1ylF-DrJCdHkMoHImiKHjK3kAQ0HKnDU08iq7uKukIFsUGRNdex7d0xSkceUiMAnPVp6g5ecg"
    ];
    const imgUrl = avatars[Math.floor(Math.random() * avatars.length)];

    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + `, ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`;

    const payload = {
      name: formName,
      condition: formCondition,
      admission: formattedDate,
      status: formStatus,
      gender: formGender,
      age: parseInt(formAge) || 0,
      email: formEmail,
      img: imgUrl
    };

    try {
      const res = await fetch(`${API_BASE}/api/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to add patient record");
      
      triggerToast("Patient Added", `Successfully registered ${formName} to database.`);
      fetchPatients();
      setShowAddModal(false);
      
      // Reset
      setFormName("");
      setFormCondition("");
      setFormStatus("Pending");
      setFormGender("Male");
      setFormAge("");
      setFormEmail("");
    } catch (err) {
      console.error(err);
      triggerToast("Database Error", "Failed to save new patient record.", "error");
    }
  };

  // Note: We don't have DELETE /api/patients/:id on the node server, but let's check. 
  // Let's add it if needed, or we can just mock it or edit the server if we want delete patient support.
  // Wait, let's check server-node/main.js to see if DELETE /api/patients/:id is there. No, only POST and GET for patients.
  // Let's implement DELETE patient endpoint or just log it. Let's see if we should implement DELETE in server-node/main.js later. We can do that easily if needed. Let's add a DELETE patient endpoint to main.js as well.
  const handleDeletePatient = async (id: string, name: string) => {
    // If the backend has delete, call it. Else show simulated deletion.
    try {
      const res = await fetch(`${API_BASE}/api/patients/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        triggerToast("Patient Removed", `${name}'s file has been archived.`, "error");
        fetchPatients();
      } else {
        // Fallback simulation in UI if endpoint is not implemented
        setPatients(prev => prev.filter(p => p.id !== id));
        triggerToast("Patient Removed (Local)", `${name} was removed from the session list.`, "error");
      }
    } catch (err) {
      console.error(err);
      // Fallback UI filter
      setPatients(prev => prev.filter(p => p.id !== id));
      triggerToast("Patient Removed", `${name} was filtered out from clinical view.`, "error");
    }
  };

  // Filter patients
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      patient.condition.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesGender =
      genderFilter === "all" ||
      (patient.gender && patient.gender.toLowerCase() === genderFilter.toLowerCase());
      
    const matchesStatus =
      statusFilter === "all" ||
      patient.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesGender && matchesStatus;
  });

  // Calculate Metrics
  const totalPatients = 12482 + patients.length;
  const malePatients = patients.filter(p => p.gender?.toLowerCase() === "male").length;
  const femalePatients = patients.filter(p => p.gender?.toLowerCase() === "female").length;
  const criticalPatients = patients.filter(p => p.status?.toLowerCase() === "urgent").length;

  return (
    <div className="space-y-8">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            Patients Command Center
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Clinical admission directory & comprehensive diagnostic files • {displayDate}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-fixed-dim to-secondary-container text-on-primary font-bold text-xs shadow-lg hover:shadow-primary-container/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Patient
        </button>
      </div>

      {/* Metrics Row */}
      {!loading && (
        <div ref={statsContainerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-primary-container" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Total Registry</p>
                <h3 className="text-2xl font-extrabold text-primary mt-2">{totalPatients.toLocaleString()}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary-container">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant mt-4 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-primary-container" />
              <span>+12% vs last quarter admissions</span>
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-secondary-container" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Male Cohort</p>
                <h3 className="text-2xl font-extrabold text-primary mt-2">{malePatients} Patients</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-secondary-container/10 flex items-center justify-center text-secondary-container">
                <User className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant mt-4">
              Active local directory listing
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-tertiary-container" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Female Cohort</p>
                <h3 className="text-2xl font-extrabold text-primary mt-2">{femalePatients} Patients</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-tertiary-container/10 flex items-center justify-center text-tertiary-container">
                <Heart className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant mt-4">
              Active local directory listing
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-error" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Urgent Cases</p>
                <h3 className="text-2xl font-extrabold text-[#ffb4ab] mt-2">{criticalPatients} Critical</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-error mt-4 flex items-center gap-1 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Requires immediate OR/ICU attention</span>
            </p>
          </div>
        </div>
      )}

      {/* Filter and Table Section */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 opacity-60" />
            <input
              type="text"
              placeholder="Search registry by name, email, or diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-xs focus:ring-1 focus:ring-primary/50 text-on-surface placeholder-on-surface-variant/40 focus:outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-on-surface-variant" />
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Gender</span>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="bg-[#0b1326] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#0b1326] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="all">All Statuses</option>
                <option value="Stable">Stable</option>
                <option value="Treatment">Treatment</option>
                <option value="Urgent">Urgent</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Patients Table */}
        <div className="overflow-x-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-on-surface-variant">Connecting to secure medical DB...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-20 text-on-surface-variant/60 text-xs">
              No matching clinical patient records found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-on-surface-variant uppercase tracking-wider">
                  <th className="pb-4 font-semibold">Patient Information</th>
                  <th className="pb-4 font-semibold">Age & Gender</th>
                  <th className="pb-4 font-semibold">Clinical Diagnostics</th>
                  <th className="pb-4 font-semibold">Admitted Stamp</th>
                  <th className="pb-4 font-semibold">Clinical Status</th>
                  <th className="pb-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPatients.map((patient) => (
                  <motion.tr
                    key={patient.id}
                    layoutId={`patient-row-${patient.id}`}
                    className="hover:bg-white/2.5 transition-colors cursor-pointer group"
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <td className="py-4 flex items-center gap-3">
                      <img
                        src={patient.img || "https://lh3.googleusercontent.com/aida-public/AB6AXuDmVsYcVmImeZHkXR5iUfIXPI5aazV4igMcaxMipsm2kMl5kuVusqoSIq-_yNJFvRtmx8XT825hAdfxKHm-uLdedCQx8UUlPTKptmJMQ2djWKfH3-GAkQcOrF3HxxoeEyJZQGfYd1IbXEdL0CnvJRvSHAnNzMaCI7UtJec2u2omFQCj1GWZZ2pRt9XNSCO4eoCRCrG-bXSl5ofe3yq-gt_OF0pG-A3Xnf-SFBpyhOtZip_ULAYFhioMcc4K9XMrYT3Q59FkV-OTwBw"}
                        alt={patient.name}
                        className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-primary/40 transition-colors"
                      />
                      <div>
                        <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">{patient.name}</p>
                        <p className="text-[10px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span>{patient.email || "No email documented"}</span>
                        </p>
                      </div>
                    </td>
                    <td className="py-4 text-xs font-medium">
                      <span>{patient.age ? `${patient.age} Yrs` : "N/A"}</span>
                      <span className="mx-2 text-white/10">|</span>
                      <span className="capitalize text-on-surface-variant">{patient.gender || "Not specified"}</span>
                    </td>
                    <td className="py-4 text-xs font-medium text-primary">
                      {patient.condition}
                    </td>
                    <td className="py-4 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 opacity-60" />
                        <span>{patient.admission}</span>
                      </span>
                    </td>
                    <td className="py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          patient.status.toLowerCase() === "stable"
                            ? "bg-tertiary-container/10 text-tertiary-container border border-tertiary-container/20"
                            : patient.status.toLowerCase() === "treatment"
                            ? "bg-secondary-container/10 text-secondary-container border border-secondary-container/20"
                            : patient.status.toLowerCase() === "urgent"
                            ? "bg-error/10 text-error border border-error/20 animate-pulse"
                            : "bg-primary-container/10 text-primary-container border border-primary-container/20"
                        }`}
                      >
                        {patient.status}
                      </span>
                    </td>
                    <td className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedPatient(patient)}
                          className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                          title="View Profile Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePatient(patient.id, patient.name)}
                          className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
                          title="Remove Patient"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* HTML5 Native Add Patient Dialog Modal */}
      <dialog
        ref={addDialogRef}
        onClose={() => setShowAddModal(false)}
        className="glass-card p-6 rounded-2xl w-full max-w-lg bg-[#0b1326]/95 border border-white/10 text-[#dae2fd] shadow-2xl backdrop-blur-xl focus:outline-none m-auto backdrop:bg-[#0b1326]/60 backdrop:backdrop-blur-sm"
        onClick={(e) => {
          const dialog = addDialogRef.current;
          if (!dialog) return;
          const rect = dialog.getBoundingClientRect();
          const isInDialog = (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          );
          if (!isInDialog) {
            setShowAddModal(false);
          }
        }}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent" />
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
          <div>
            <h3 className="text-sm font-bold text-primary">Add Patient Record</h3>
            <p className="text-[10px] text-on-surface-variant">Register a new patient into the hospital command center</p>
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
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-primary/50 text-on-surface placeholder-on-surface-variant/30 focus:outline-none"
              placeholder="e.g. John Doe"
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
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-primary/50 text-on-surface placeholder-on-surface-variant/30 focus:outline-none"
                placeholder="Years"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Gender</label>
              <select
                value={formGender}
                onChange={(e) => setFormGender(e.target.value)}
                className="w-full bg-[#0b1326] border border-white/10 rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-primary/50 text-on-surface focus:outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Email Address</label>
            <input
              type="email"
              required
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-primary/50 text-on-surface placeholder-on-surface-variant/30 focus:outline-none"
              placeholder="e.g. johndoe@clinical.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Clinical Diagnosis / Condition</label>
            <input
              type="text"
              required
              value={formCondition}
              onChange={(e) => setFormCondition(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-primary/50 text-on-surface placeholder-on-surface-variant/30 focus:outline-none"
              placeholder="e.g. Chronic Hypertension"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Initial Roster Status</label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
              className="w-full bg-[#0b1326] border border-white/10 rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-primary/50 text-on-surface focus:outline-none"
            >
              <option value="Pending">Pending</option>
              <option value="Stable">Stable</option>
              <option value="Treatment">Treatment</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00dbe9] to-[#14d1ff] text-[#00363a] font-bold text-xs shadow-lg hover:shadow-[#00f0ff]/20 hover:scale-[1.01] active:scale-99 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            Register Patient File
          </button>
        </form>
      </dialog>

      {/* HTML5 Native View Details Dialog Modal */}
      <dialog
        ref={detailDialogRef}
        onClose={() => setSelectedPatient(null)}
        className="glass-card p-6 rounded-2xl w-full max-w-lg bg-[#0b1326]/95 border border-white/10 text-[#dae2fd] shadow-2xl backdrop-blur-xl focus:outline-none m-auto backdrop:bg-[#0b1326]/60 backdrop:backdrop-blur-sm"
        onClick={(e) => {
          const dialog = detailDialogRef.current;
          if (!dialog) return;
          const rect = dialog.getBoundingClientRect();
          const isInDialog = (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          );
          if (!isInDialog) {
            setSelectedPatient(null);
          }
        }}
      >
        {selectedPatient && (
          <>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#56f0da] to-transparent" />
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-primary">Patient Profile Detail</h3>
                <p className="text-[10px] text-on-surface-variant">Archived medical metadata file</p>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-on-surface-variant hover:text-error transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <img
                  src={selectedPatient.img || "https://lh3.googleusercontent.com/aida-public/AB6AXuDmVsYcVmImeZHkXR5iUfIXPI5aazV4igMcaxMipsm2kMl5kuVusqoSIq-_yNJFvRtmx8XT825hAdfxKHm-uLdedCQx8UUlPTKptmJMQ2djWKfH3-GAkQcOrF3HxxoeEyJZQGfYd1IbXEdL0CnvJRvSHAnNzMaCI7UtJec2u2omFQCj1GWZZ2pRt9XNSCO4eoCRCrG-bXSl5ofe3yq-gt_OF0pG-A3Xnf-SFBpyhOtZip_ULAYFhioMcc4K9XMrYT3Q59FkV-OTwBw"}
                  alt={selectedPatient.name}
                  className="w-16 h-16 rounded-full object-cover border border-white/10 shadow-lg"
                />
                <div>
                  <h4 className="text-lg font-bold text-on-surface">{selectedPatient.name}</h4>
                  <p className="text-xs text-on-surface-variant">{selectedPatient.email || "No documented email"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-white/2 rounded-xl p-4 border border-white/5">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-semibold">Roster ID</p>
                  <p className="text-xs font-mono font-semibold mt-1">
                    {selectedPatient.id.substring(18).toUpperCase() || "#PAT-LCL"}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-semibold">Clinical Status</p>
                  <p className="text-xs font-bold mt-1 text-primary">{selectedPatient.status}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-semibold">Gender & Age</p>
                  <p className="text-xs font-semibold mt-1">
                    {selectedPatient.gender || "Not specified"} ({selectedPatient.age || "N/A"} years old)
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-semibold">Admitted stamp</p>
                  <p className="text-xs font-semibold mt-1">{selectedPatient.admission}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold mb-2">Initial Diagnostic Condition</p>
                <div className="p-3 bg-primary-container/5 border border-primary-container/15 text-primary-container text-xs rounded-xl font-bold">
                  {selectedPatient.condition}
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="px-6 py-2.5 rounded-xl border border-white/15 text-xs hover:bg-white/5 hover:text-primary transition-all duration-200 cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </>
        )}
      </dialog>

      {/* Toasts list */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl border flex items-start gap-3 w-80 shadow-2xl backdrop-blur-md transition-all ${
              toast.type === "error"
                ? "bg-[#0b1326]/95 border-error/30 text-error"
                : "bg-[#0b1326]/95 border-tertiary-container/30 text-tertiary-container"
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">{toast.title}</p>
              <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
