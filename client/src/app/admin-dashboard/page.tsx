"use client";
import { API_BASE } from "@/utils/api";

import { useEffect, useState, useRef, useContext } from "react";
import { useRouter } from "next/navigation";
import { SearchContext } from "./layout";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Activity,
  Bed,
  Calendar,
  Plus,
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  ChevronRight,
  User,
  CheckCircle,
  AlertCircle,
  X,
  ShieldCheck,
} from "lucide-react";

interface MetricStats {
  totalPatients: { value: string; change: string; type: string };
  totalDoctors: { value: string; change: string | null; type: string | null };
  totalStaff: { value: string; change: string | null; type: string | null };
  weeklyRevenue: { value: string; change: string; type: string };
  bedAvailability: { value: string; status: string; occupancyRate: string };
}

interface DeptMetric {
  name: string;
  value: number;
}

interface PatientRecord {
  id: string;
  name: string;
  condition: string;
  admission: string;
  status: string;
  img: string;
  gender?: string;
  age?: number;
  email?: string;
}

interface StaffShift {
  name: string;
  role: string;
  time: string;
  active: boolean;
  img: string;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function Dashboard() {
  const router = useRouter();
  const { searchQuery } = useContext(SearchContext);
  const [metrics, setMetrics] = useState<{
    stats: MetricStats;
    departments: DeptMetric[];
    recentPatients: PatientRecord[];
    shifts: StaffShift[];
    monthlyRevenue?: number[];
  } | null>(null);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [formPatientName, setFormPatientName] = useState("");
  const [formCondition, setFormCondition] = useState("");
  const [formGender, setFormGender] = useState("Male");
  const [formAge, setFormAge] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [displayDate, setDisplayDate] = useState("");

  const statsContainerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Set local machine date on mount
  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
  }, []);

  // Control HTML5 Dialog
  useEffect(() => {
    if (showModal) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [showModal]);

  async function fetchMetrics() {
    try {
      const res = await fetch(`${API_BASE}/api/metrics`);
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      console.error("Failed to load metrics, using fallback client data", err);
      // Fallback mock dataset matching backend design
      setMetrics({
        stats: {
          totalPatients: { value: "12,482", change: "+12%", type: "up" },
          totalDoctors: { value: "156", change: null, type: null },
          totalStaff: { value: "482", change: null, type: null },
          weeklyRevenue: { value: "$1.2M", change: "+8%", type: "up" },
          bedAvailability: { value: "14 / 250", status: "Critical", occupancyRate: "94.4%" }
        },
        departments: [
          { name: "Cardiology", value: 84 },
          { name: "Neurology", value: 62 },
          { name: "Pediatrics", value: 91 },
          { name: "Oncology", value: 45 },
          { name: "ER", value: 98 }
        ],
        recentPatients: [
          { id: "#PAT-8821", name: "Arthur Morgan", condition: "Hypertension", admission: "Feb 20, 14:30", status: "Stable", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDmVsYcVmImeZHkXR5iUfIXPI5aazV4igMcaxMipsm2kMl5kuVusqoSIq-_yNJFvRtmx8XT825hAdfxKHm-uLdedCQx8UUlPTKptmJMQ2djWKfH3-GAkQcOrF3HxxoeEyJZQGfYd1IbXEdL0CnvJRvSHAnNzMaCI7UtJec2u2omFQCj1GWZZ2pRt9XNSCO4eoCRCrG-bXSl5ofe3yq-gt_OF0pG-A3Xnf-SFBpyhOtZip_ULAYFhioMcc4K9XMrYT3Q59FkV-OTwBw", gender: "Male", age: 36, email: "arthur@morgan.com" },
          { id: "#PAT-9012", name: "Elena Fisher", condition: "Acute Viral", admission: "Feb 21, 09:15", status: "Treatment", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDN3UVTzPzv0Af2e0RzKnIIEO4r9e__EQuYHMnJvh8UWv-6lnXFoZRlJKfi3IvG3LLUscX7j-SPCjcEm0KgmjBmAnhC72OshfvEi8pRB-SQCzdTNWkTSsMT7kZitjLz-d3s3iLxtJfFw-iLSvTcA9S0n-tUmzRtM2g-S0qOEN1qSdigBzn5aT2mtV550DjEN1kz_ZLg95eUGLgGJM4N9nVwt2TYQZfAYgh1xulrJwbYA7exPFK3j0QF1bsBBtzt0yyWHaVnLn9wik", gender: "Female", age: 29, email: "elena@fisher.com" },
          { id: "#PAT-4432", name: "Joel Miller", condition: "Fracture (L2)", admission: "Feb 21, 11:45", status: "Urgent", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA23_Q91hh10bCN4f7gJMFJprKGgpdptxHMK6c2eIhhcE7Q1TwIjwKEdPjyA9YYKSl032mfuO_o3N6s9MQFH4wr0DGj2Us5Wp0mJFGwNWwhDCBhrD0RbRv1QbKMm8J2aKhnnm1_ZAcm530LQcyGmWwAtM2GziqffApwuWxx8-KpmpGPPZAucb8LNGMiTBmoS0xf4dEgNGrr--uC1FJxMybebjelAz2aB0FssgL75f3n8a9Tl3FPaC4cu6ASoSH5rEHOXQ85i2rHMq8", gender: "Male", age: 48, email: "joel@miller.com" },
          { id: "#PAT-1109", name: "Leo Vance", condition: "Observation", admission: "Feb 22, 16:20", status: "Pending", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzLc-0PWFHLrfwLUNgEq48dDtFLusQjORiJhyAfCUgvYExrc_n6uN6rkyJlK8Go7hirf_te7NG-fXD7XDbC2gCGoWXKCdkwl5DOrUlMVwbhj_OFawGKER3rxK1fs9605FDUh5HTfYITdo2tEHU_nEKhkQWf7FZ-pbWIXWfiiyTnaUqFGgOeG_2yOARP6sroNOt-E1ylF-DrJCdHkMoHImiKHjK3kAQ0HKnDU08iq7uKukIFsUGRNdex7d0xSkceUiMAnPVp6g5ecg", gender: "Male", age: 62, email: "leo@vance.com" }
        ],
        shifts: [
          { name: "Dr. Aisha Khan", role: "Surgeon", time: "08:00 - 16:00", active: true, img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCxE0Kc-a84miM3cx60p-is_bmHfiuDni2VYTT13G7qH4EHo7VInDBPQf4KvsZEdoY4BjpC5ilIM2izkMM9QWnv942pBrRN6W5DJSpzZWc1zarDgsffmVC1fjLswQ3Bc-exrEkeyXHSvEfAXOGgX1IUEjt_u_EqScu7e0V96-bf-KRzX4MBcMGdyC-zZ8A7lhCflEHR03TY2y6IIxnexbbIGi_iBRgeYSOjnTIqtkcnQ8u3c9X_FAEKptPJrNL3bAtuyqgIJWLEi-g" },
          { name: "Nurse Jack Reed", role: "ER Duty", time: "10:00 - 22:00", active: true, img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCbqlNGf-UBP_bmKLEIHXW5ME0N4fUpm-v4zHLxw-AmDgCJcabHGydiLTCy6hNGWmJdjUG2Td1Pt9q2Aw-lKECxeJVxN_0eZcz_f7hGkM2DAjMRLYSKQzSgUiwCRmZHxfOuYFzGIIoB-OB9nRffi34kZ3fB50Sy-HQhFlaJBt2FVqEC-pPcYRk0twUKXpVD8hd9OLV_k5TDjnwMC_t4Dsq-OQIKd5qGhX16CSZekIV6YjEIkL1vZCC-fh5BFS_EcDuhWnna0oGZHbU" },
          { name: "Dr. Helena Troy", role: "On Call", time: "24H", active: true, img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBUR93vsX8-PeJEf1vGo8anymPqpciIEu9_x9IjqrdZVQwRFInWdZrZh6EzF98zhcTAmu_qo75Zgq62h2u1qhebSvRpv8x9AdnDALYA2yPyr7nokvD2GDDZcOQynWOdukWkeiebcJhfXbKTWxTKwBvrfayAZQVJWFzwXqW01XzNzkzLnGnX6VWvfWZzXmROwFxKzACpOmHaTRUfrTcmj9buFrYebCfW0MG8AUWnuLh0dNVA-DRbYj5WYsqfFohmMdu7i7c3SPhaaDI" },
          { name: "Mark Stevens", role: "Tech", time: "Tomorrow 06:00", active: false, img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3E3D4czQ2WyFUklLEShTpvakILDd2oKeW2gRacONc5PsddD7Zp-0koHPaE1dcs84hb9548ofn-d11m9p8S7breKKUZQ-Z9aYENF7P8cn8QomCfUEtZRIIHU4mw2Q-AN8jEg6SFyL4Jb1jBTBnJU8rbxe1UOxk1Wna-0E70nPywG7REgfFIjVmMQob1Q5Rxy5LcaaV1qTG6BdyvSijX-5K1EZI0BazLkMiXZ3kGOqDRrAbNRhmY0SOmrTCbWLYXutH0l8G7u5blZc" }
        ],
        monthlyRevenue: [0, 0, 0, 0, 0, 0]
      });
    }
  }

  // Fetch metrics from node gateway API
  useEffect(() => {
    fetchMetrics();
  }, []);

  // Parallax and reveal animations on stats cards using GSAP
  useEffect(() => {
    if (metrics && statsContainerRef.current) {
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
  }, [metrics]);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-[300px] font-mono text-primary text-xs">
        RETRIEVING SECURE TELEMETRY...
      </div>
    );
  }

  // Generate SVG path coordinate points from metrics.monthlyRevenue
  const revData = metrics.monthlyRevenue && metrics.monthlyRevenue.length === 6 
    ? metrics.monthlyRevenue 
    : [0, 0, 0, 0, 0, 0];
  const maxVal = Math.max(...revData, 1000);
  const points = revData.map((val, idx) => {
    const x = (idx / 5) * 1000;
    const y = 180 - (val / maxVal) * 150;
    return { x, y };
  });

  const linePath = `M ${points[0].x},${points[0].y}` + points.slice(1).map((p, i) => ` C ${points[i].x + 100},${points[i].y} ${p.x - 100},${p.y} ${p.x},${p.y}`).join("");
  const areaPath = `${linePath} L 1000,200 L 0,200 Z`;

  const getMonthLabels = () => {
    const labels = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(d.getFullYear(), d.getMonth() - i, 1);
      labels.push(monthNames[targetDate.getMonth()]);
    }
    return labels;
  };

  const filteredRecentPatients = metrics.recentPatients.filter((pat) => {
    return (
      pat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pat.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pat.condition.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const triggerToast = (title: string, message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const avatars = [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDmVsYcVmImeZHkXR5iUfIXPI5aazV4igMcaxMipsm2kMl5kuVusqoSIq-_yNJFvRtmx8XT825hAdfxKHm-uLdedCQx8UUlPTKptmJMQ2djWKfH3-GAkQcOrF3HxxoeEyJZQGfYd1IbXEdL0CnvJRvSHAnNzMaCI7UtJec2u2omFQCj1GWZZ2pRt9XNSCO4eoCRCrG-bXSl5ofe3yq-gt_OF0pG-A3Xnf-SFBpyhOtZip_ULAYFhioMcc4K9XMrYT3Q59FkV-OTwBw",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBDN3UVTzPzv0Af2e0RzKnIIEO4r9e__EQuYHMnJvh8UWv-6lnXFoZRlJKfi3IvG3LLUscX7j-SPCjcEm0KgmjBmAnhC72OshfvEi8pRB-SQCzdTNWkTSsMT7kZitjLz-d3s3iLxtJfFw-iLSvTcA9S0n-tUmzRtM2g-S0qOEN1qSdigBzn5aT2mtV550DjEN1kz_ZLg95eUGLgGJM4N9nVwt2TYQZfAYgh1xulrJwbYA7exPFK3j0QF1bsBBtzt0yyWHaVnLn9wik"
    ];
    const img = avatars[Math.floor(Math.random() * avatars.length)];
    
    const payload = {
      name: formPatientName,
      condition: formCondition,
      admission: "Just now",
      status: "Pending",
      img,
      gender: formGender,
      age: parseInt(formAge) || 0,
      email: formEmail
    };

    try {
      const res = await fetch(`${API_BASE}/api/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save patient");
      await fetchMetrics();
      triggerToast("Patient Admitted", `Successfully created record for ${formPatientName}.`);
    } catch (err) {
      console.error(err);
      triggerToast("Submission Error", "Failed to save patient to Database.", "error");
    }

    setShowModal(false);
    
    setFormPatientName("");
    setFormCondition("");
    setFormGender("Male");
    setFormAge("");
    setFormEmail("");
  };

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "stable":
        return "bg-tertiary-container/10 text-tertiary-container border border-tertiary-container/20";
      case "treatment":
        return "bg-primary-container/10 text-primary-container border border-primary-container/20";
      case "urgent":
        return "bg-error/10 text-error border border-error/20";
      default:
        return "bg-white/5 text-on-surface-variant border border-white/10";
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-primary">Command Dashboard</h2>
          <p className="text-xs text-on-surface-variant mt-1">Real-time clinical operations and facility overview.</p>
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
            New Patient
          </button>
        </div>
      </div>

      {/* Stats Telemetry cards (Bento Grid row 1) */}
      <div ref={statsContainerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Card 1: Patients */}
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-tertiary-container font-bold flex items-center gap-0.5">
              +12% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Total Patients</p>
            <h3 className="text-xl font-bold mt-1">{metrics.stats.totalPatients.value}</h3>
          </div>
        </div>

        {/* Card 2: Doctors */}
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-secondary-container/15 flex items-center justify-center text-secondary-container">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Total Doctors</p>
            <h3 className="text-xl font-bold mt-1">{metrics.stats.totalDoctors.value}</h3>
          </div>
        </div>

        {/* Card 3: Staff */}
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="w-9 h-9 rounded-xl bg-tertiary-container/15 flex items-center justify-center text-tertiary-container">
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Total Staff</p>
            <h3 className="text-xl font-bold mt-1">{metrics.stats.totalStaff.value}</h3>
          </div>
        </div>

        {/* Card 4: Revenue */}
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-tertiary-container font-bold flex items-center gap-0.5">
              +8% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Weekly Revenue</p>
            <h3 className="text-xl font-bold mt-1">{metrics.stats.weeklyRevenue.value}</h3>
          </div>
        </div>

        {/* Card 5: Bed Availability */}
        <div className="glass-card p-5 rounded-2xl inner-glow flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-error/15 flex items-center justify-center text-error">
              <Bed className="w-4 h-4" />
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-error/15 text-error border border-error/25 font-bold uppercase tracking-wider">Critical</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Bed Availability</p>
            <h3 className="text-xl font-bold mt-1">{metrics.stats.bedAvailability.value}</h3>
          </div>
        </div>
      </div>

      {/* Bento charts row (Bento Grid row 2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Revenue Line Chart Panel */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="md:col-span-2 glass-card rounded-2xl p-6 inner-glow relative overflow-hidden flex flex-col h-[400px]"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-sm font-bold text-primary">Revenue Overview</h4>
              <p className="text-[10px] text-on-surface-variant mt-0.5">Monthly growth & billing distribution</p>
            </div>
            <div className="flex bg-surface-container/60 border border-white/5 rounded-lg p-0.5 text-[10px]">
              <button className="px-3 py-1.5 rounded-md bg-primary-container/10 text-primary-container font-bold">Yearly</button>
              <button className="px-3 py-1.5 rounded-md text-on-surface-variant">Monthly</button>
            </div>
          </div>

          {/* SVG Area Line Chart with cubic Bezier curves */}
          <div className="flex-1 w-full flex flex-col justify-between mt-2 min-h-0">
            <svg className="w-full flex-1" preserveAspectRatio="none" viewBox="0 0 1000 200">
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(0, 240, 255, 0.3)"></stop>
                  <stop offset="100%" stopColor="rgba(0, 240, 255, 0)"></stop>
                </linearGradient>
              </defs>
              {/* Background shaded area */}
              <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.3 }}
                d={areaPath}
                fill="url(#chartGradient)"
              />
              {/* Line path */}
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.0, ease: "easeInOut", delay: 0.3 }}
                d={linePath}
                fill="none"
                stroke="#00f0ff"
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
            <div className="flex justify-between text-[9px] text-on-surface-variant font-mono uppercase tracking-wider px-2 mt-2">
              {getMonthLabels().map((m, idx) => (
                <span key={idx}>{m}</span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Department Performance Panel */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
          className="glass-card rounded-2xl p-6 inner-glow flex flex-col h-96"
        >
          <div>
            <h4 className="text-sm font-bold text-primary">Dept Performance</h4>
            <p className="text-[10px] text-on-surface-variant mt-0.5">Case volume by department</p>
          </div>
          <div className="mt-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 pr-1">
            {metrics.departments.map((dept, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-on-surface-variant">{dept.name}</span>
                  <span className="text-primary-container font-mono">{dept.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${dept.value}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: i * 0.1 + 0.3, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary-container to-[#14d1ff] rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Patients Table & Shifts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Patient Records Panel */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="md:col-span-2 glass-card rounded-2xl p-6 inner-glow"
        >
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-bold text-primary">Recent Patient Records</h4>
            <button 
              onClick={() => triggerToast("Navigating", "Redirecting to full patient records list...", "info")}
              className="text-[10px] text-primary-container font-semibold hover:underline flex items-center gap-1"
            >
              View All Records
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-on-surface-variant/80 border-b border-white/5 font-medium uppercase tracking-wider text-[9px]">
                  <th className="pb-3.5">Patient Name</th>
                  <th className="pb-3.5">ID</th>
                  <th className="pb-3.5">Condition</th>
                  <th className="pb-3.5">Admission</th>
                  <th className="pb-3.5">Status</th>
                  <th className="pb-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRecentPatients.map((pat, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={pat.img}
                          alt={pat.name}
                          className="w-7 h-7 rounded-full border border-white/10 object-cover"
                        />
                        <span className="font-semibold text-on-surface">{pat.name}</span>
                      </div>
                    </td>
                    <td className="py-3 font-mono text-[10px] text-on-surface-variant">{pat.id}</td>
                    <td className="py-3 text-on-surface">{pat.condition}</td>
                    <td className="py-3 text-on-surface-variant">{pat.admission}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusStyle(pat.status)}`}>
                        {pat.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button 
                        onClick={() => triggerToast("View Patient", `Viewing details for ${pat.name}`, "info")}
                        className="p-1.5 rounded-lg bg-surface-container border border-white/5 hover:bg-primary-container/10 hover:border-primary-container/20 text-on-surface-variant hover:text-primary-container transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined !text-sm">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Staff shifts Roster Panel */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
          className="glass-card rounded-2xl p-6 inner-glow flex flex-col"
        >
          <h4 className="text-sm font-bold text-primary">Staff Shifts</h4>
          <p className="text-[10px] text-on-surface-variant mt-0.5 mb-6">Active & upcoming attendance</p>
          <div className="space-y-4 flex-1">
            {metrics.shifts.map((shift, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                shift.active ? "bg-surface-container-high/20 border-white/5" : "bg-white/5 opacity-40 border-transparent"
              }`}>
                <div className="relative">
                  <img src={shift.img} alt={shift.name} className="w-8 h-8 rounded-full object-cover border border-white/5" />
                  {shift.active && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-tertiary-container rounded-full border-2 border-surface" />
                  )}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-[11px] font-semibold truncate">{shift.name}</p>
                  <p className="text-[9px] text-on-surface-variant font-mono uppercase truncate">{shift.role} • {shift.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => router.push("/admin-dashboard/staff")}
            className="w-full mt-6 py-2.5 rounded-xl border border-dashed border-white/20 text-on-surface-variant text-[11px] font-medium hover:bg-white/5 hover:border-white/40 hover:text-on-surface transition-all cursor-pointer"
          >
            Manage Roster
          </button>
        </motion.div>
      </div>

      {/* HTML5 New Patient Dialog Modal */}
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
            <h3 className="text-sm font-bold text-primary">New Patient Admission</h3>
            <p className="text-[10px] text-on-surface-variant">Register a new patient into the command center</p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-on-surface-variant hover:text-error transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handlePatientSubmit} className="space-y-4">
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

          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Condition / Diagnosis</label>
            <input
              type="text"
              required
              value={formCondition}
              onChange={(e) => setFormCondition(e.target.value)}
              className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
              placeholder="e.g. Acute Viral Infection"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5 mt-6">
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
              Admit Patient <ShieldCheck className="w-4 h-4" />
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
                borderColor: toast.type === "success" ? "rgba(0, 240, 255, 0.3)" : toast.type === "error" ? "rgba(255, 180, 171, 0.3)" : "rgba(255, 255, 255, 0.2)",
              }}
            >
              {toast.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-primary-container mt-0.5 shrink-0" />
              ) : toast.type === "error" ? (
                <AlertCircle className="w-5 h-5 text-error mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-on-surface-variant mt-0.5 shrink-0" />
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
