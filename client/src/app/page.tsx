"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Preloader from "./components/Preloader";
import { Shield, Lock, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [displayDate, setDisplayDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [temperature, setTemperature] = useState("21°C / 70°F");
  const [weatherDesc, setWeatherDesc] = useState("Clear Sky");
  const router = useRouter();

  const handleComplete = useCallback(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;

    const updateClock = () => {
      const today = new Date();
      setDisplayDate(
        today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
      );
      setCurrentTime(
        today.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
      );
    };

    const fetchWeather = async () => {
      try {
        const geoRes = await fetch("https://ipapi.co/json/");
        if (!geoRes.ok) throw new Error("Geo IP lookup failed");
        const geoData = await geoRes.json();
        const lat = geoData.latitude || 22.5726;
        const lon = geoData.longitude || 88.3639;

        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
        );
        if (!weatherRes.ok) throw new Error("Weather fetch failed");
        const weatherData = await weatherRes.json();
        const current = weatherData.current;
        if (current) {
          const tempC = Math.round(current.temperature_2m);
          const tempF = Math.round((tempC * 9) / 5 + 32);
          setTemperature(`${tempC}°C / ${tempF}°F`);

          const code = current.weather_code;
          let desc = "Clear Sky";
          if (code === 0) desc = "Clear Sky";
          else if (code >= 1 && code <= 3) desc = "Partly Cloudy";
          else if (code === 45 || code === 48) desc = "Foggy";
          else if (code >= 51 && code <= 55) desc = "Drizzle";
          else if (code >= 61 && code <= 65) desc = "Rainy";
          else if (code >= 71 && code <= 75) desc = "Snowy";
          else if (code >= 80 && code <= 82) desc = "Rain Showers";
          else if (code >= 95) desc = "Thunderstorm";
          setWeatherDesc(desc);
        }
      } catch (err) {
        console.error("Failed to load dynamic weather:", err);
      }
    };

    updateClock();
    fetchWeather();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setError(null);
  };

  const handleBack = () => {
    setSelectedRole(null);
    setError(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedRole === "Admin") {
      if (email !== "saptarshimasid@gmail.com" || password !== "asdasdasd") {
        setError("Invalid Clinical Admin credentials. Access Denied.");
        return;
      }
    }
    // Simulate login and redirect to dashboard
    router.push("/admin-dashboard");
  };

  return (
    <>
      <AnimatePresence>
        {loading && <Preloader onComplete={handleComplete} />}
      </AnimatePresence>

      {!loading && (
        <main className="relative z-10 flex flex-col items-center justify-center h-screen max-h-screen w-screen px-4 md:px-10 py-6 bg-[#0b1326] overflow-hidden select-none">
          {/* Animated Background Atmosphere */}
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-primary-container/10 filter blur-[120px] pointer-events-none animate-pulse duration-5000" />
          <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-secondary-container/5 filter blur-[150px] pointer-events-none animate-pulse duration-7000" />

          {/* Header Branding */}
          <motion.header
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center mb-8 select-none"
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary-container to-secondary bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,240,255,0.2)]">
              Health Copilot
            </h1>
            <p className="text-xs md:text-sm text-on-surface-variant/80 uppercase tracking-widest mt-2 font-medium">
              Medical Command Center
            </p>
            {displayDate && (
              <div className="mt-3.5 flex items-center justify-center gap-3 text-[10px] text-on-surface-variant/60 font-mono">
                <span>{displayDate}</span>
                {currentTime && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-secondary font-semibold">{currentTime}</span>
                  </>
                )}
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-1 text-primary-container font-semibold">
                  <span className="material-symbols-outlined !text-xs">thermostat</span>
                  <span>{temperature} • {weatherDesc}</span>
                </span>
              </div>
            )}
          </motion.header>

          {/* Interactive Transitions container */}
          <div className="w-full max-w-7xl flex items-center justify-center relative min-h-[400px]">
            <AnimatePresence mode="wait">
              {!selectedRole ? (
                // 1. Role Selection Grid
                <motion.div
                  key="roles"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ duration: 0.5 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full"
                >
                  {/* Admin Card */}
                  <div
                    onClick={() => handleRoleSelect("Admin")}
                    className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center cursor-pointer group hover:scale-[1.02] active:scale-98"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary-container/20 transition-all duration-300">
                      <span className="material-symbols-outlined text-primary-container !text-4xl">admin_panel_settings</span>
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-3">Admin</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      System configuration, security protocols, and hospital infrastructure management.
                    </p>
                  </div>

                  {/* Doctor Card */}
                  <div
                    onClick={() => handleRoleSelect("Doctor")}
                    className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center cursor-pointer group hover:scale-[1.02] active:scale-98"
                  >
                    <div className="w-16 h-16 rounded-full bg-secondary-container/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-secondary-container/20 transition-all duration-300">
                      <span className="material-symbols-outlined text-secondary-container !text-4xl">stethoscope</span>
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-3">Doctor</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Clinical diagnostics, patient monitoring, and AI-assisted treatment planning.
                    </p>
                  </div>

                  {/* Staff Card */}
                  <div
                    onClick={() => handleRoleSelect("Staff")}
                    className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center cursor-pointer group hover:scale-[1.02] active:scale-98"
                  >
                    <div className="w-16 h-16 rounded-full bg-tertiary-container/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-tertiary-container/20 transition-all duration-300">
                      <span className="material-symbols-outlined text-tertiary-container !text-4xl">badge</span>
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-3">Staff</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Administrative coordination, patient intake, and departmental logistics.
                    </p>
                  </div>

                  {/* Patient Card */}
                  <div
                    onClick={() => handleRoleSelect("Patient")}
                    className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center cursor-pointer group hover:scale-[1.02] active:scale-98"
                  >
                    <div className="w-16 h-16 rounded-full bg-on-surface-variant/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-on-surface-variant/20 transition-all duration-300">
                      <span className="material-symbols-outlined text-on-surface-variant !text-4xl">person</span>
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-3">Patient</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Access your personal health records, schedules, and digital care plan.
                    </p>
                  </div>
                </motion.div>
              ) : (
                // 2. Interactive Login Form
                <motion.div
                  key="login"
                  initial={{ opacity: 0, scale: 0.95, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full max-w-md"
                >
                  <div className="glass-panel p-8 rounded-2xl relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent" />
                    
                    <div className="flex items-center gap-4 mb-8">
                      <button
                        onClick={handleBack}
                        className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer border border-white/5"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h2 className="text-xl font-bold text-primary">{selectedRole} Login</h2>
                        <p className="text-xs text-on-surface-variant mt-0.5">Secure Authentication Required</p>
                      </div>
                    </div>

                    <form onSubmit={handleLoginSubmit} className="space-y-6">
                      {error && (
                        <div className="p-3.5 bg-error-container/20 border border-error/30 text-error rounded-xl flex items-start gap-2.5 text-xs">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-xs text-on-surface-variant ml-1">Work ID / Email</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60">alternate_email</span>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-on-surface placeholder:text-outline/40 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]/50 focus:border-[#00f0ff] transition-all"
                            placeholder="name@hospital.com"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-on-surface-variant ml-1">Password</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60">lock</span>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-on-surface placeholder:text-outline/40 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]/50 focus:border-[#00f0ff] transition-all"
                            placeholder="••••••••"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pb-2 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-white/10 bg-surface-container text-[#00f0ff] focus:ring-offset-background"
                          />
                          <span className="text-on-surface-variant group-hover:text-on-surface transition-colors">Remember session</span>
                        </label>
                        <a href="#" className="text-primary hover:underline">Forgot access?</a>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00dbe9] to-[#14d1ff] text-[#00363a] font-bold shadow-lg hover:shadow-[#00f0ff]/20 hover:scale-[1.01] active:scale-99 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active-glow"
                      >
                        Verify Identity
                        <span className="material-symbols-outlined !text-xl">verified_user</span>
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Info */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="mt-6 text-center select-none"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-4">
              <div className="flex items-center gap-2 text-on-surface-variant text-xs">
                <Shield className="w-4 h-4 text-tertiary-container" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant text-xs">
                <Lock className="w-4 h-4 text-tertiary-container" />
                <span>End-to-End Encryption</span>
              </div>
            </div>
            <p className="text-[10px] text-outline">
              © 2026 Health Copilot Systems • v2.4.0-Stable
            </p>
          </motion.footer>
        </main>
      )}
    </>
  );
}
