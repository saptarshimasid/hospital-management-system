"use client";
import { API_BASE } from "@/utils/api";

import { useEffect, useState, useRef, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  User,
  Search,
  SlidersHorizontal,
  Plus,
  X,
  Briefcase,
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
  Users,
  Upload
} from "lucide-react";
import { SearchContext } from "../layout";

interface Doctor {
  id: string;
  name: string;
  dept: string;
  status: "available" | "busy" | "consulting" | "off-duty";
  img: string;
  gender: string;
  age: number;
  email: string;
  schedule: string;
  createdAt?: string;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error";
}

export default function DoctorPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and Filters
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const searchTerm = searchQuery;
  const setSearchTerm = setSearchQuery;
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  
  // Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Add Doctor Form State
  const [formName, setFormName] = useState("");
  const [formDept, setFormDept] = useState("Cardiology");
  const [formStatus, setFormStatus] = useState<"available" | "busy" | "consulting" | "off-duty">("available");
  const [formGender, setFormGender] = useState("Male");
  const [formAge, setFormAge] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSchedule, setFormSchedule] = useState("08:00 - 16:00");
  const [formImg, setFormImg] = useState("");
  const [displayDate, setDisplayDate] = useState("");

  const statsContainerRef = useRef<HTMLDivElement>(null);
  const addDialogRef = useRef<HTMLDialogElement>(null);
  const detailDialogRef = useRef<HTMLDialogElement>(null);

  // Fetch Doctors on Mount
  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    fetchDoctors();
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
    if (selectedDoctor) {
      detailDialogRef.current?.showModal();
    } else {
      detailDialogRef.current?.close();
    }
  }, [selectedDoctor]);

  const triggerToast = (title: string, message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/doctors`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((d: any) => ({
          ...d,
          id: d._id || d.id,
        }));
        setDoctors(mapped);
        localStorage.setItem("local_doctors", JSON.stringify(mapped));
      } else {
        throw new Error("Failed to fetch doctors");
      }
    } catch (err) {
      console.error("Failed to fetch doctors, loading from local storage...", err);
      const saved = localStorage.getItem("local_doctors");
      if (saved) {
        setDoctors(JSON.parse(saved));
      } else {
        const defaultDoctors: Doctor[] = [
          {
            id: "doc-1",
            name: "Dr. Sarah Jenkins",
            dept: "Cardiology",
            status: "available",
            gender: "Female",
            age: 42,
            email: "sarah.jenkins@hospital.com",
            schedule: "08:00 - 16:00",
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o"
          },
          {
            id: "doc-2",
            name: "Dr. Robert Chen",
            dept: "Neurology",
            status: "busy",
            gender: "Male",
            age: 47,
            email: "robert.chen@hospital.com",
            schedule: "09:00 - 17:00",
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBUR93vsX8-PeJEf1vGo8anymPqpciIEu9_x9IjqrdZVQwRFInWdZrZh6EzF98zhcTAmu_qo75Zgq62h2u1qhebSvRpv8x9AdnDALYA2yPyr7nokvD2GDDZcOQynWOdukWkeiebcJhfXbKTWxTKwBvrfayAZQVJWFzwXqW01XzNzkzLnGnX6VWvfWZzXmROwFxKzACpOmHaTRUfrTcmj9buFrYebCfW0MG8AUWnuLh0dNVA-DRbYj5WYsqfFohmMdu7i7c3SPhaaDI"
          },
          {
            id: "doc-3",
            name: "Dr. Emily Taylor",
            dept: "Pediatrics",
            status: "available",
            gender: "Female",
            age: 36,
            email: "emily.taylor@hospital.com",
            schedule: "08:00 - 16:00",
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3E3D4czQ2WyFUklLEShTpvakILDd2oKeW2gRacONc5PsddD7Zp-0koHPaE1dcs84hb9548ofn-d11m9p8S7breKKUZQ-Z9aYENF7P8cn8QomCfUEtZRIIHU4mw2Q-AN8jEg6SFyL4Jb1jBTBnJU8rbxe1UOxk1Wna-0E70nPywG7REgfFIjVmMQob1Q5Rxy5LcaaV1qTG6BdyvSijX-5K1EZI0BazLkMiXZ3kGOqDRrAbNRhmY0SOmrTCbWLYXutH0l8G7u5blZc"
          }
        ];
        setDoctors(defaultDoctors);
        localStorage.setItem("local_doctors", JSON.stringify(defaultDoctors));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Choose random avatar
    const avatars = [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCxE0Kc-a84miM3cx60p-is_bmHfiuDni2VYTT13G7qH4EHo7VInDBPQf4KvsZEdoY4BjpC5ilIM2izkMM9QWnv942pBrRN6W5DJSpzZWc1zarDgsffmVC1fjLswQ3Bc-exrEkeyXHSvEfAXOGgX1IUEjt_u_EqScu7e0V96-bf-KRzX4MBcMGdyC-zZ8A7lhCflEHR03TY2y6IIxnexbbIGi_iBRgeYSOjnTIqtkcnQ8u3c9X_FAEKptPJrNL3bAtuyqgIJWLEi-g",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBUR93vsX8-PeJEf1vGo8anymPqpciIEu9_x9IjqrdZVQwRFInWdZrZh6EzF98zhcTAmu_qo75Zgq62h2u1qhebSvRpv8x9AdnDALYA2yPyr7nokvD2GDDZcOQynWOdukWkeiebcJhfXbKTWxTKwBvrfayAZQVJWFzwXqW01XzNzkzLnGnX6VWvfWZzXmROwFxKzACpOmHaTRUfrTcmj9buFrYebCfW0MG8AUWnuLh0dNVA-DRbYj5WYsqfFohmMdu7i7c3SPhaaDI",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB3E3D4czQ2WyFUklLEShTpvakILDd2oKeW2gRacONc5PsddD7Zp-0koHPaE1dcs84hb9548ofn-d11m9p8S7breKKUZQ-Z9aYENF7P8cn8QomCfUEtZRIIHU4mw2Q-AN8jEg6SFyL4Jb1jBTBnJU8rbxe1UOxk1Wna-0E70nPywG7REgfFIjVmMQob1Q5Rxy5LcaaV1qTG6BdyvSijX-5K1EZI0BazLkMiXZ3kGOqDRrAbNRhmY0SOmrTCbWLYXutH0l8G7u5blZc"
    ];
    const imgUrl = avatars[Math.floor(Math.random() * avatars.length)];

    const payload: Omit<Doctor, "id"> = {
      name: formName,
      dept: formDept,
      status: formStatus as any,
      gender: formGender,
      age: parseInt(formAge) || 0,
      email: formEmail,
      schedule: formSchedule,
      img: formImg || imgUrl
    };

    try {
      const res = await fetch(`${API_BASE}/api/doctors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to add doctor record");
      
      triggerToast("Doctor Added", `Successfully registered ${formName} to database.`);
      fetchDoctors();
    } catch (err) {
      console.error("Database save failed, using local storage fallback", err);
      const localId = "temp-" + Math.random().toString(36).substring(2, 9);
      const newDoctor = { ...payload, id: localId };
      const currentDoctors = [...doctors, newDoctor];
      setDoctors(currentDoctors);
      localStorage.setItem("local_doctors", JSON.stringify(currentDoctors));
      triggerToast("Doctor Added (Local)", `Successfully registered ${formName} locally.`);
    } finally {
      setShowAddModal(false);
      // Reset
      setFormName("");
      setFormDept("Cardiology");
      setFormStatus("available");
      setFormGender("Male");
      setFormAge("");
      setFormEmail("");
      setFormSchedule("08:00 - 16:00");
      setFormImg("");
    }
  };

  const handleDeleteDoctor = async (id: string, name: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/doctors/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        triggerToast("Doctor Removed", `${name}'s profile has been archived.`, "error");
        fetchDoctors();
      } else {
        setDoctors(prev => {
          const updated = prev.filter(d => d.id !== id);
          localStorage.setItem("local_doctors", JSON.stringify(updated));
          return updated;
        });
        triggerToast("Doctor Removed (Local)", `${name} was removed from the session list.`, "error");
      }
    } catch (err) {
      console.error(err);
      setDoctors(prev => {
        const updated = prev.filter(d => d.id !== id);
        localStorage.setItem("local_doctors", JSON.stringify(updated));
        return updated;
      });
      triggerToast("Doctor Removed", `${name} was filtered out from clinical view.`, "error");
    }
  };

  // Filter Doctors
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.dept.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesDept =
      deptFilter === "all" ||
      doc.dept.toLowerCase() === deptFilter.toLowerCase();
      
    const matchesStatus =
      statusFilter === "all" ||
      doc.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesDept && matchesStatus;
  });

  // Calculate Metrics
  const totalDoctors = doctors.length;
  const availableDoctors = doctors.filter(d => d.status === "available").length;
  const busyDoctors = doctors.filter(d => d.status === "busy").length;
  const consultingDoctors = doctors.filter(d => d.status === "consulting").length;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "available":
        return "bg-tertiary-container/10 text-tertiary-container border border-tertiary-container/20";
      case "busy":
        return "bg-error/10 text-error border border-error/20";
      case "consulting":
        return "bg-secondary-container/10 text-secondary-container border border-secondary-container/20";
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
            <Users className="w-5 h-5 text-primary" />
            Physician Registry
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Manage physician credentials, active duty statuses, and clinical rosters.
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
            <Plus className="w-4 h-4" /> Add Physician
          </button>
        </div>
      </div>

      {/* Bento Telemetry Row */}
      <div ref={statsContainerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Total Registered</p>
            <h3 className="text-xl font-bold mt-1">{totalDoctors}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-tertiary-container/15 flex items-center justify-center text-tertiary-container">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Available</p>
            <h3 className="text-xl font-bold mt-1 text-tertiary-container">{availableDoctors}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-error/15 flex items-center justify-center text-error">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Busy / In Surgery</p>
            <h3 className="text-xl font-bold mt-1 text-error">{busyDoctors}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-secondary-container/15 flex items-center justify-center text-secondary-container">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Consulting</p>
            <h3 className="text-xl font-bold mt-1 text-secondary-container">{consultingDoctors}</h3>
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
              placeholder="Search registry by name, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-xs focus:ring-1 focus:ring-primary/50 text-on-surface placeholder-on-surface-variant/40 focus:outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-on-surface-variant" />
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Department</span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-[#0b1326] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
              >
                <option value="all">All Departments</option>
                <option value="cardiology">Cardiology</option>
                <option value="neurology">Neurology</option>
                <option value="pediatrics">Pediatrics</option>
                <option value="gen medicine">Gen Medicine</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Duty Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#0b1326] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="consulting">Consulting</option>
                <option value="off-duty">Off Duty</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table view */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-on-surface-variant/80 border-b border-white/5 font-medium uppercase tracking-wider text-[9px]">
                <th className="pb-3.5">Physician Name</th>
                <th className="pb-3.5">Department</th>
                <th className="pb-3.5">Email Address</th>
                <th className="pb-3.5">Shift / Schedule</th>
                <th className="pb-3.5">Status</th>
                <th className="pb-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 font-mono text-primary/70">
                    SYNCHRONIZING TELEMETRY REGISTRY...
                  </td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-on-surface-variant opacity-60">
                    No physicians found matching search filters.
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={doc.img}
                          alt={doc.name}
                          className="w-8 h-8 rounded-full border border-white/10 object-cover"
                        />
                        <div>
                          <span className="font-semibold text-on-surface block">{doc.name}</span>
                          <span className="text-[10px] text-on-surface-variant">{doc.gender}, {doc.age} yrs</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-on-surface">{doc.dept}</td>
                    <td className="py-3.5 text-on-surface-variant font-mono text-[10px]">{doc.email}</td>
                    <td className="py-3.5 text-on-surface-variant">{doc.schedule}</td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusStyle(doc.status)}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedDoctor(doc)}
                          className="p-1.5 rounded-lg bg-surface-container border border-white/5 hover:bg-primary-container/10 hover:border-primary-container/20 text-on-surface-variant hover:text-primary-container transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoctor(doc.id, doc.name)}
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

      {/* Add Physician Modal */}
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
            <h3 className="text-sm font-bold text-primary">Register New Physician</h3>
            <p className="text-[10px] text-on-surface-variant">Add a credentials profile to the clinical directory</p>
          </div>
          <button
            onClick={() => setShowAddModal(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-on-surface-variant hover:text-error transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-4">
          {/* Image Upload Option */}
          <div className="space-y-2">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Physician Photo</label>
            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/10">
              {formImg ? (
                <img
                  src={formImg}
                  alt="Photo Preview"
                  className="w-12 h-12 rounded-full border border-primary/20 object-cover bg-black/20"
                />
              ) : (
                <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-on-surface-variant">
                  <User className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-[#00f0ff] truncate font-mono">
                  {formImg ? "Local Image Selected" : "No image selected (Defaulting to Random Avatar)"}
                </p>
              </div>
              {formImg && (
                <button
                  type="button"
                  onClick={() => setFormImg("")}
                  className="text-[10px] text-error hover:underline cursor-pointer font-medium"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="relative flex items-center justify-center border border-dashed border-white/20 hover:border-[#00f0ff]/50 rounded-xl p-3 bg-white/2 hover:bg-[#00f0ff]/5 transition-all cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setFormImg(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="text-center space-y-1 pointer-events-none flex flex-col items-center">
                <Upload className="w-4 h-4 text-[#00f0ff]/80 group-hover:scale-110 transition-transform" />
                <p className="text-[10px] text-on-surface-variant font-semibold">Click or drag image file here</p>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Doctor Name</label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
              placeholder="e.g. Dr. Arthur Morgan"
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
                min="20"
                max="100"
                value={formAge}
                onChange={(e) => setFormAge(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
                placeholder="e.g. 45"
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
              placeholder="e.g. arthur.morgan@healthcopilot.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Department</label>
              <select
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff] cursor-pointer"
              >
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Gen Medicine">Gen Medicine</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Shift Schedule</label>
              <input
                type="text"
                required
                value={formSchedule}
                onChange={(e) => setFormSchedule(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
                placeholder="e.g. 08:00 - 16:00"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Duty Status</label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as any)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff] cursor-pointer"
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="consulting">Consulting</option>
              <option value="off-duty">Off Duty</option>
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
              Admit Physician <ShieldCheck className="w-4 h-4" />
            </button>
          </div>
        </form>
      </dialog>

      {/* Details View Modal */}
      <dialog
        ref={detailDialogRef}
        onClose={() => setSelectedDoctor(null)}
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
            if (!isInDialog) setSelectedDoctor(null);
          }
        }}
      >
        {selectedDoctor && (
          <>
            <div className="absolute top-0 left-0 w-full h-1 bg-[#00f0ff]" />
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <img
                  src={selectedDoctor.img}
                  alt={selectedDoctor.name}
                  className="w-12 h-12 rounded-full border border-white/10 object-cover"
                />
                <div>
                  <h3 className="text-sm font-bold text-primary">{selectedDoctor.name}</h3>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{selectedDoctor.dept} Department</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-on-surface-variant hover:text-error transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 border-t border-b border-white/5 py-4">
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Gender</p>
                  <p className="font-semibold mt-0.5 text-on-surface">{selectedDoctor.gender}</p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Age</p>
                  <p className="font-semibold mt-0.5 text-on-surface">{selectedDoctor.age} years old</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Email Address</p>
                <p className="font-semibold mt-0.5 text-on-surface font-mono flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-primary" /> {selectedDoctor.email}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Roster Schedule</p>
                  <p className="font-semibold mt-0.5 text-on-surface">{selectedDoctor.schedule}</p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Duty Status</p>
                  <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusStyle(selectedDoctor.status)}`}>
                    {selectedDoctor.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5 mt-6">
              <button
                onClick={() => setSelectedDoctor(null)}
                className="bg-surface-container border border-white/5 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-surface-variant/40 transition-colors cursor-pointer"
              >
                Close Profile
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
