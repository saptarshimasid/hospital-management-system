"use client";
import { API_BASE } from "@/utils/api";
 
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, AlertCircle, HelpCircle, Activity, X } from "lucide-react";
 
interface Message {
  role: "user" | "assistant";
  content: string;
  category?: string;
}
 
export default function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello Dr. Jenkins. I am your AI Clinical Copilot. How can I assist you with patient triage or diagnostic workflows today?",
      category: "general"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
 
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isOpen && chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);
 
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
 
    const userPrompt = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userPrompt }]);
    setLoading(true);
 
    try {
      // Send chat history and current prompt to Node API Gateway
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
 
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt, history: historyPayload }),
      });
 
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            category: data.category,
          },
        ]);
      } else {
        throw new Error(data.message || "Unknown server error");
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **System Error**: Could not connect to AI Engine. Ensure your Python and Node server are running.\n\nError: ${err.message}`,
          category: "error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };
 
  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "clinical":
        return <Activity className="w-3.5 h-3.5 text-tertiary-container" />;
      case "diagnostic":
        return <Sparkles className="w-3.5 h-3.5 text-secondary-container" />;
      case "error":
        return <AlertCircle className="w-3.5 h-3.5 text-error" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-on-surface-variant" />;
    }
  };
 
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-primary-container to-secondary-container text-on-primary flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 active-glow cursor-pointer group"
        title="Open AI Clinical Copilot"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[8px] font-bold text-white uppercase animate-bounce">
          AI
        </span>
      </button>
    );
  }
 
  return (
    <div ref={chatRef} className="fixed bottom-6 right-6 z-50 w-96 h-[550px] flex flex-col bg-[#131b2e]/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 bg-surface/20 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00f0ff] animate-pulse" />
            AI Clinical Copilot
          </h3>
          <p className="text-[10px] text-on-surface-variant/70">LangGraph Orchestrated Reasoning</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-tertiary-container animate-ping" />
            <span className="text-[10px] uppercase text-tertiary-container font-mono">online</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors cursor-pointer"
            title="Minimize"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col max-w-[85%] ${
              msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
            }`}
          >
            {/* Category tag */}
            {msg.role === "assistant" && msg.category && (
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/60 mb-1 flex items-center gap-1">
                {getCategoryIcon(msg.category)}
                {msg.category} node
              </span>
            )}
            
            <div
              className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-primary-container/20 to-secondary-container/20 border border-primary/20 text-primary-container rounded-tr-none"
                  : "bg-surface-container-high/40 border border-white/5 text-on-surface rounded-tl-none"
              }`}
            >
              {/* Parse markdown manually for standard structures */}
              <div className="space-y-2 whitespace-pre-wrap">
                {msg.content.split("\n").map((line, idx) => {
                  if (line.startsWith("### ")) {
                    return <h4 key={idx} className="font-bold text-sm text-primary mt-2 mb-1">{line.replace("### ", "")}</h4>;
                  }
                  if (line.startsWith("- ") || line.startsWith("* ")) {
                    return <li key={idx} className="list-disc list-inside ml-2 text-on-surface-variant">{line.substring(2)}</li>;
                  }
                  if (line.startsWith("> ")) {
                    return <blockquote key={idx} className="border-l-2 border-primary-container pl-3 italic text-on-surface-variant my-1">{line.replace("> ", "")}</blockquote>;
                  }
                  // Highlight bold text
                  if (line.includes("**")) {
                    const parts = line.split("**");
                    return (
                      <p key={idx}>
                        {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-[#00f0ff] font-medium">{part}</strong> : part)}
                      </p>
                    );
                  }
                  return <p key={idx}>{line}</p>;
                })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col max-w-[85%] mr-auto items-start">
            <span className="text-[9px] uppercase tracking-wider text-[#00f0ff]/60 mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-ping" />
              Thinking...
            </span>
            <div className="p-3.5 rounded-2xl rounded-tl-none bg-surface-container-high/40 border border-white/5 text-on-surface flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-surface/10 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Copilot (e.g. 'Analyze ECG alerts' or 'Build care plan')..."
          className="flex-1 bg-surface-container-lowest border border-white/10 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-[#00f0ff] focus:outline-none text-on-surface placeholder:text-outline/60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-on-primary hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:brightness-100 transition-all flex items-center justify-center cursor-pointer shadow-lg active-glow"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
