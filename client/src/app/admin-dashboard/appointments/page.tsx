"use client";
import { API_BASE } from "@/utils/api";

import { useEffect, useState, useRef, useContext } from "react";
import { SearchContext } from "../layout";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  TrendingUp,
  User,
  Users,
  Search,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Check
} from "lucide-react";

interface Appointment {
  id: string;
  name: string;
  doctor: string;
  dept: string;
  time: string;
  date: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  img: string;
  gender?: string;
  age?: number;
  email?: string;
}

interface Physician {
  name: string;
  dept: string;
  status: "available" | "busy" | "consulting" | "off-duty";
  img: string;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error";
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [physicians, setPhysicians] = useState<Physician[]>([]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const searchTerm = searchQuery;
  const setSearchTerm = setSearchQuery;
  const [showModal, setShowModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Form States
  const [formPatientName, setFormPatientName] = useState("");
  const [formDept, setFormDept] = useState("Cardiology");
  const [formDoctor, setFormDoctor] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formGender, setFormGender] = useState("Male");
  const [formAge, setFormAge] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [displayDate, setDisplayDate] = useState("");

  const statsContainerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Set local machine date on mount and load appointments
  useEffect(() => {
    const today = new Date();
    setDisplayDate(today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    setFormDate(today.toISOString().split("T")[0]);
    fetchAppointments();
    fetchPhysicians();
  }, []);

  async function fetchPhysicians() {
    try {
      const res = await fetch(`${API_BASE}/api/doctors`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((item: any) => ({
          name: item.name,
          dept: item.dept,
          status: item.status,
          img: item.img || "https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o"
        }));
        setPhysicians(mapped);
      } else {
        throw new Error("Failed to fetch physicians");
      }
    } catch (err) {
      console.error("Failed to load physicians from Database, using local storage fallback", err);
      const savedDoctors = localStorage.getItem("local_doctors");
      if (savedDoctors) {
        const doctorsData = JSON.parse(savedDoctors);
        setPhysicians(doctorsData.map((d: any) => ({
          name: d.name,
          dept: d.dept,
          status: d.status,
          img: d.img || "https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o"
        })));
      } else {
        setPhysicians([
          { name: "Dr. Sarah Jenkins", dept: "Cardiology", status: "available", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o" },
          { name: "Dr. Robert Chen", dept: "Neurology", status: "busy", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBUR93vsX8-PeJEf1vGo8anymPqpciIEu9_x9IjqrdZVQwRFInWdZrZh6EzF98zhcTAmu_qo75Zgq62h2u1qhebSvRpv8x9AdnDALYA2yPyr7nokvD2GDDZcOQynWOdukWkeiebcJhfXbKTWxTKwBvrfayAZQVJWFzwXqW01XzNzkzLnGnX6VWvfWZzXmROwFxKzACpOmHaTRUfrTcmj9buFrYebCfW0MG8AUWnuLh0dNVA-DRbYj5WYsqfFohmMdu7i7c3SPhaaDI" },
          { name: "Dr. Emily Taylor", dept: "Pediatrics", status: "available", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3E3D4czQ2WyFUklLEShTpvakILDd2oKeW2gRacONc5PsddD7Zp-0koHPaE1dcs84hb9548ofn-d11m9p8S7breKKUZQ-Z9aYENF7P8cn8QomCfUEtZRIIHU4mw2Q-AN8jEg6SFyL4Jb1jBTBnJU8rbxe1UOxk1Wna-0E70nPywG7REgfFIjVmMQob1Q5Rxy5LcaaV1qTG6BdyvSijX-5K1EZI0BazLkMiXZ3kGOqDRrAbNRhmY0SOmrTCbWLYXutH0l8G7u5blZc" }
        ]);
      }
    }
  }

  async function fetchAppointments() {
    try {
      const res = await fetch(`${API_BASE}/api/appointments`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((item: any) => ({
          ...item,
          id: item._id || item.id
        }));
        setAppointments(mapped);
        localStorage.setItem("local_appointments", JSON.stringify(mapped));
      } else {
        throw new Error("Failed to fetch appointments");
      }
    } catch (err) {
      console.error("Failed to load appointments from Database, loading from local storage...", err);
      const saved = localStorage.getItem("local_appointments");
      if (saved) {
        setAppointments(JSON.parse(saved));
      } else {
        const defaultAppointments: Appointment[] = [
          {
            id: "apt-1",
            name: "David Miller",
            doctor: "Dr. Sarah Jenkins",
            dept: "Cardiology",
            time: "10:30 AM",
            date: "2026-06-22",
            status: "confirmed",
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDmVsYcVmImeZHkXR5iUfIXPI5aazV4igMcaxMipsm2kMl5kuVusqoSIq-_yNJFvRtmx8XT825hAdfxKHm-uLdedCQx8UUlPTKptmJMQ2djWKfH3-GAkQcOrF3HxxoeEyJZQGfYd1IbXEdL0CnvJRvSHAnNzMaCI7UtJec2u2omFQCj1GWZZ2pRt9XNSCO4eoCRCrG-bXSl5ofe3yq-gt_OF0pG-A3Xnf-SFBpyhOtZip_ULAYFhioMcc4K9XMrYT3Q59FkV-OTwBw",
            gender: "Male",
            age: 42,
            email: "david.miller@example.com"
          },
          {
            id: "apt-2",
            name: "Elena Rostova",
            doctor: "Dr. Robert Chen",
            dept: "Neurology",
            time: "02:15 PM",
            date: "2026-06-22",
            status: "completed",
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDN3UVTzPzv0Af2e0RzKnIIEO4r9e__EQuYHMnJvh8UWv-6lnXFoZRlJKfi3IvG3LLUscX7j-SPCjcEm0KgmjBmAnhC72OshfvEi8pRB-SQCzdTNWkTSsMT7kZitjLz-d3s3iLxtJfFw-iLSvTcA9S0n-tUmzRtM2g-S0qOEN1qSdigBzn5aT2mtV550DjEN1kz_ZLg95eUGLgGJM4N9nVwt2TYQZfAYgh1xulrJwbYA7exPFK3j0QF1bsBBtzt0yyWHaVnLn9wik",
            gender: "Female",
            age: 29,
            email: "elena.r@example.com"
          }
        ];
        setAppointments(defaultAppointments);
        localStorage.setItem("local_appointments", JSON.stringify(defaultAppointments));
      }
    }
  }

  // Build dynamic department-to-doctors mapping from fetched physicians
  const deptDoctors: Record<string, string[]> = {};
  physicians.forEach((p) => {
    if (!deptDoctors[p.dept]) deptDoctors[p.dept] = [];
    if (!deptDoctors[p.dept].includes(p.name)) deptDoctors[p.dept].push(p.name);
  });

  useEffect(() => {
    // Dynamically update form doctor based on selected department
    if (deptDoctors[formDept] && deptDoctors[formDept].length > 0) {
      setFormDoctor(deptDoctors[formDept][0]);
    } else {
      setFormDoctor("");
    }
  }, [formDept, physicians]);

  // GSAP animation for entry
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

  // HTML5 Native Dialog trigger
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

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formattedTime = formatTime12h(formTime);
    const avatars = [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDmVsYcVmImeZHkXR5iUfIXPI5aazV4igMcaxMipsm2kMl5kuVusqoSIq-_yNJFvRtmx8XT825hAdfxKHm-uLdedCQx8UUlPTKptmJMQ2djWKfH3-GAkQcOrF3HxxoeEyJZQGfYd1IbXEdL0CnvJRvSHAnNzMaCI7UtJec2u2omFQCj1GWZZ2pRt9XNSCO4eoCRCrG-bXSl5ofe3yq-gt_OF0pG-A3Xnf-SFBpyhOtZip_ULAYFhioMcc4K9XMrYT3Q59FkV-OTwBw",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBDN3UVTzPzv0Af2e0RzKnIIEO4r9e__EQuYHMnJvh8UWv-6lnXFoZRlJKfi3IvG3LLUscX7j-SPCjcEm0KgmjBmAnhC72OshfvEi8pRB-SQCzdTNWkTSsMT7kZitjLz-d3s3iLxtJfFw-iLSvTcA9S0n-tUmzRtM2g-S0qOEN1qSdigBzn5aT2mtV550DjEN1kz_ZLg95eUGLgGJM4N9nVwt2TYQZfAYgh1xulrJwbYA7exPFK3j0QF1bsBBtzt0yyWHaVnLn9wik",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA23_Q91hh10bCN4f7gJMFJprKGgpdptxHMK6c2eIhhcE7Q1TwIjwKEdPjyA9YYKSl032mfuO_o3N6s9MQFH4wr0DGj2Us5Wp0mJFGwNWwhDCBhrD0RbRv1QbKMm8J2aKhnnm1_ZAcm530LQcyGmWwAtM2GziqffApwuWxx8-KpmpGPPZAucb8LNGMiTBmoS0xf4dEgNGrr--uC1FJxMybebjelAz2aB0FssgL75f3n8a9Tl3FPaC4cu6ASoSH5rEHOXQ85i2rHMq8",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBzLc-0PWFHLrfwLUNgEq48dDtFLusQjORiJhyAfCUgvYExrc_n6uN6rkyJlK8Go7hirf_te7NG-fXD7XDbC2gCGoWXKCdkwl5DOrUlMVwbhj_OFawGKER3rxK1fs9605FDUh5HTfYITdo2tEHU_nEKhkQWf7FZ-pbWIXWfiiyTnaUqFGgOeG_2yOARP6sroNOt-E1ylF-DrJCdHkMoHImiKHjK3kAQ0HKnDU08iq7uKukIFsUGRNdex7d0xSkceUiMAnPVp6g5ecg"
    ];
    const avatarUrl = avatars[Math.floor(Math.random() * avatars.length)];

    const payload: Omit<Appointment, "id"> = {
      name: formPatientName,
      doctor: formDoctor,
      dept: formDept,
      time: formattedTime,
      date: formDate,
      status: "confirmed",
      img: avatarUrl,
      gender: formGender,
      age: parseInt(formAge) || 0,
      email: formEmail
    };

    try {
      const res = await fetch(`${API_BASE}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to book appointment");
      await fetchAppointments();
      triggerToast("Appointment Scheduled", `Successfully booked consultation for ${formPatientName} with ${formDoctor}.`);
    } catch (err) {
      console.error("Database save failed, using local storage fallback", err);
      const localId = "temp-" + Math.random().toString(36).substring(2, 9);
      const newApt = { ...payload, id: localId };
      const currentApts = [...appointments, newApt];
      setAppointments(currentApts);
      localStorage.setItem("local_appointments", JSON.stringify(currentApts));
      triggerToast("Appointment Scheduled (Local)", `Successfully booked consultation for ${formPatientName} with ${formDoctor} locally.`);
    } finally {
      setShowModal(false);

      // Reset Form
      setFormPatientName("");
      setFormDept("Cardiology");
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormTime("09:00");
      setFormGender("Male");
      setFormAge("");
      setFormEmail("");
    }
  };

  const handleStatusChange = async (id: string, newStatus: "confirmed" | "completed" | "cancelled") => {
    try {
      const res = await fetch(`${API_BASE}/api/appointments/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update appointment status");
      await fetchAppointments();
      if (newStatus === "confirmed") {
        triggerToast("Appointment Confirmed", "Schedule has been approved.");
      } else if (newStatus === "completed") {
        triggerToast("Consultation Completed", "Patient was checked out.");
      }
    } catch (err) {
      console.error(err);
      setAppointments(prev => {
        const updated = prev.map(a => a.id === id ? { ...a, status: newStatus } : a);
        localStorage.setItem("local_appointments", JSON.stringify(updated));
        return updated;
      });
      triggerToast("Appointment Updated (Local)", `Status changed to ${newStatus} locally.`);
    }
  };

  const handleCancelAppointment = async (id: string, name: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/appointments/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete appointment");
      await fetchAppointments();
      triggerToast("Appointment Cancelled", `Consultation for ${name} was removed from the roster.`, "error");
    } catch (err) {
      console.error(err);
      setAppointments(prev => {
        const updated = prev.filter(a => a.id !== id);
        localStorage.setItem("local_appointments", JSON.stringify(updated));
        return updated;
      });
      triggerToast("Appointment Cancelled (Local)", `Consultation for ${name} was removed locally.`, "error");
    }
  };

  const formatTime12h = (timeString: string) => {
    const [hour, minute] = timeString.split(":");
    let hh = parseInt(hour);
    const ampm = hh >= 12 ? "PM" : "AM";
    hh = hh % 12;
    hh = hh ? hh : 12;
    return `${hh}:${minute} ${ampm}`;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-primary-container/10 text-primary-container border border-primary-container/20";
      case "completed":
        return "bg-tertiary-container/10 text-tertiary-container border border-tertiary-container/20";
      case "pending":
        return "bg-secondary-container/10 text-secondary-container border border-secondary-container/20";
      default:
        return "bg-error/10 text-error border border-error/20";
    }
  };

  const getPhysicianStatusDot = (status: string) => {
    switch (status) {
      case "available":
        return "bg-tertiary-container";
      case "busy":
        return "bg-error";
      case "consulting":
        return "bg-[#e8a317]";
      default:
        return "bg-on-surface-variant/40";
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    const matchesStatus = statusFilter === "all" || appt.status === statusFilter;
    const matchesSearch =
      appt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.doctor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && (searchQuery === "" ? true : matchesSearch);
  });

  // Calculate statistics
  const totalBooked = appointments.length;
  const pendingCount = appointments.filter((a) => a.status === "pending").length;
  const completedToday = appointments.filter((a) => a.status === "completed").length;
  const cancelledCount = appointments.filter((a) => a.status === "cancelled").length;
  const onDutyCount = physicians.filter((p) => p.status !== "off-duty").length;

  return (
    <div className="space-y-8">
      
      {/* Top Welcome Title */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-primary">Appointments Command</h2>
          <p className="text-xs text-on-surface-variant mt-1">Real-time patient visits schedule and clinical slots.</p>
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
            Book Appointment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div ref={statsContainerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
              <Calendar className="w-4 h-4" />
            </div>
            {totalBooked > 0 && (
              <span className="text-[10px] text-tertiary-container font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
              </span>
            )}
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Total Booked</p>
            <h3 className="text-xl font-bold mt-1">{totalBooked}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-secondary-container/15 flex items-center justify-center text-secondary-container">
              <Clock className="w-4 h-4" />
            </div>
            {pendingCount > 0 && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-secondary-container/15 text-secondary-container border border-secondary-container/25 font-bold uppercase tracking-wider">
                {pendingCount} New
              </span>
            )}
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Pending Requests</p>
            <h3 className="text-xl font-bold mt-1">{pendingCount}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-tertiary-container/15 flex items-center justify-center text-tertiary-container">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Completed Today</p>
            <h3 className="text-xl font-bold mt-1">{completedToday}</h3>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-error/15 flex items-center justify-center text-error">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-error text-[10px] font-bold">Inactive</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Cancelled</p>
            <h3 className="text-xl font-bold mt-1">{cancelledCount}</h3>
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-error/15 flex items-center justify-center text-error">
              <User className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-tertiary-container font-bold flex items-center gap-0.5">Online</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">On-Duty Doctors</p>
            <h3 className="text-xl font-bold mt-1">{onDutyCount} / {physicians.length}</h3>
          </div>
        </div>
      </div>

      {/* Workspace Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Table Column */}
        <div className="col-span-12 lg:col-span-9 glass-card rounded-2xl p-6 inner-glow">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-bold text-primary">Active Appointments</h4>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-on-surface-variant" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-container/60 border border-white/5 text-[11px] rounded-lg py-1 px-2.5 focus:ring-1 focus:ring-primary text-on-surface focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-on-surface-variant/80 border-b border-white/5 font-medium uppercase tracking-wider text-[9px]">
                  <th className="pb-3.5">Patient Name</th>
                  <th className="pb-3.5">ID</th>
                  <th className="pb-3.5">Doctor Assigned</th>
                  <th className="pb-3.5">Department</th>
                  <th className="pb-3.5">Scheduled Time</th>
                  <th className="pb-3.5">Status</th>
                  <th className="pb-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence initial={false}>
                  {filteredAppointments.map((appt) => (
                    <motion.tr
                      key={appt.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={appt.img}
                            alt={appt.name}
                            className="w-7 h-7 rounded-full border border-white/10 object-cover"
                          />
                          <span className="font-semibold text-on-surface">{appt.name}</span>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-[10px] text-on-surface-variant">{appt.id}</td>
                      <td className="py-3 text-on-surface">{appt.doctor}</td>
                      <td className="py-3 text-on-surface-variant">{appt.dept}</td>
                      <td className="py-3 text-on-surface font-semibold">{appt.time}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeClass(appt.status)}`}>
                          {appt.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          {appt.status === "pending" && (
                            <button
                              onClick={() => handleStatusChange(appt.id, "confirmed")}
                              title="Confirm Visit"
                              className="p-1.5 rounded-lg bg-surface-container border border-white/5 hover:bg-primary-container/10 hover:border-primary-container/20 text-on-surface-variant hover:text-primary-container transition-all cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {appt.status === "confirmed" && (
                            <button
                              onClick={() => handleStatusChange(appt.id, "completed")}
                              title="Mark Completed"
                              className="p-1.5 rounded-lg bg-surface-container border border-white/5 hover:bg-tertiary-container/10 hover:border-tertiary-container/20 text-on-surface-variant hover:text-tertiary-container transition-all cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {appt.status !== "completed" && (
                            <button
                              onClick={() => handleCancelAppointment(appt.id, appt.name)}
                              title="Cancel Appointment"
                              className="p-1.5 rounded-lg bg-surface-container border border-white/5 hover:bg-error/10 hover:border-error/20 text-on-surface-variant hover:text-error transition-all cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {appt.status === "completed" && (
                            <span className="text-[10px] text-on-surface-variant italic px-2">Checked Out</span>
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

        {/* Doctor Availability column */}
        <div className="col-span-12 lg:col-span-3 glass-card rounded-2xl p-6 inner-glow flex flex-col h-full">
          <h4 className="text-sm font-bold text-primary">Physician Roster</h4>
          <p className="text-[10px] text-on-surface-variant mt-0.5 mb-6">Status & slot occupancy</p>
          <div className="space-y-4 flex-1">
            {physicians.map((phys, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high/20 border border-white/5 transition-all">
                <div className="relative">
                  <img src={phys.img} alt={phys.name} className="w-8 h-8 rounded-full object-cover border border-white/5" />
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface ${getPhysicianStatusDot(phys.status)}`} />
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-[11px] font-semibold truncate">{phys.name}</p>
                  <p className="text-[9px] text-on-surface-variant font-mono uppercase truncate">{phys.dept} • {phys.status}</p>
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
            <h3 className="text-sm font-bold text-primary">Book Appointment</h3>
            <p className="text-[10px] text-on-surface-variant">Register a new clinical consultation slot</p>
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
            <input
              type="text"
              required
              value={formPatientName}
              onChange={(e) => setFormPatientName(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
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
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Department</label>
              <select
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff] cursor-pointer"
              >
                <option value="Cardiology">Cardiology</option>
                <option value="Gen Medicine">Gen Medicine</option>
                <option value="Neurology">Neurology</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Physician</label>
              <select
                value={formDoctor}
                onChange={(e) => setFormDoctor(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff] cursor-pointer"
              >
                {deptDoctors[formDept]?.map((doc) => (
                  <option key={doc} value={doc}>
                    {doc}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Date</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Preferred Time</label>
              <input
                type="time"
                required
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
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
