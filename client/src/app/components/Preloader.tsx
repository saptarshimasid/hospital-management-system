"use client";

import { useEffect, useState, useRef } from "react";
import gsap from "gsap";

export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Percentage counter animation
    const obj = { val: 0 };
    const timeline = gsap.timeline({
      onComplete: () => {
        // Fade out animation
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
          onComplete: onComplete,
        });
      }
    });

    timeline.to(obj, {
      val: 100,
      duration: 2.2,
      ease: "power1.inOut",
      onUpdate: () => {
        setProgress(Math.floor(obj.val));
      }
    });

    // 2. Pulse / Heartbeat Line Dashoffset animation
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      gsap.set(pathRef.current, {
        strokeDasharray: length,
        strokeDashoffset: length,
      });

      timeline.to(pathRef.current, {
        strokeDashoffset: 0,
        duration: 2.0,
        ease: "power2.inOut",
      }, 0);
    }

    // 3. Text glow pulse
    if (textRef.current) {
      gsap.to(textRef.current, {
        textShadow: "0 0 20px rgba(0, 240, 255, 0.8)",
        repeat: -1,
        yoyo: true,
        duration: 0.8,
        ease: "power1.inOut",
      });
    }

    return () => {
      timeline.kill();
    };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-[#0b1326] z-[9999] flex flex-col items-center justify-center select-none"
    >
      <div className="max-w-md w-full px-8 text-center flex flex-col items-center">
        {/* Heartbeat Logo Icon */}
        <div className="w-40 h-24 mb-6 relative">
          <svg
            viewBox="0 0 300 100"
            fill="none"
            stroke="currentColor"
            className="w-full h-full text-primary-container drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]"
          >
            {/* Background guide line */}
            <path
              d="M10,50 L90,50 L105,30 L120,70 L135,10 L150,90 L165,45 L180,55 L195,50 L290,50"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="3"
            />
            {/* Animated path */}
            <path
              ref={pathRef}
              d="M10,50 L90,50 L105,30 L120,70 L135,10 L150,90 L165,45 L180,55 L195,50 L290,50"
              stroke="#00f0ff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Brand name */}
        <h1
          ref={textRef}
          className="text-primary text-3xl font-bold tracking-wider mb-2 font-sans"
        >
          HEALTH COPILOT
        </h1>
        <p className="text-on-surface-variant text-sm uppercase tracking-widest opacity-60 mb-8">
          Secure Command Center
        </p>

        {/* Loading Progress */}
        <div className="w-64 h-[2px] bg-white/10 rounded-full overflow-hidden mb-4 relative">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00f0ff] to-[#14d1ff] transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="font-mono text-xs text-primary-container">
          INITIALIZING CORE PROTOCOLS ... {progress}%
        </div>
      </div>
    </div>
  );
}
