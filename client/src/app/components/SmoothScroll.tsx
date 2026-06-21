"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenisRef.current = lenis;

    // Animation frame loop for Lenis
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // --- Dialog awareness: stop Lenis when any <dialog> is open ---
    // Apply data-lenis-prevent to all existing dialogs
    function tagDialogs() {
      document.querySelectorAll("dialog").forEach((dialog) => {
        dialog.setAttribute("data-lenis-prevent", "");
      });
    }
    tagDialogs();

    // Check if any dialog or custom modal is currently open and stop/start Lenis accordingly
    function syncLenisWithDialogs() {
      const anyOpenDialog = document.querySelector("dialog[open]");
      const anyOpenCustomModal = document.querySelector("[data-is-modal]");
      if (anyOpenDialog || anyOpenCustomModal) {
        lenis.stop();
      } else {
        lenis.start();
      }
    }

    // Observe the DOM for dialog open/close and custom modal mount/unmount
    const observer = new MutationObserver((mutations) => {
      let shouldSync = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          // New node added/removed (e.g. custom modal mounted/unmounted)
          shouldSync = true;
          break;
        }
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "open" &&
          mutation.target instanceof HTMLDialogElement
        ) {
          shouldSync = true;
          break;
        }
      }
      if (shouldSync) {
        tagDialogs();
        syncLenisWithDialogs();
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["open"],
      subtree: true,
      childList: true,
    });

    // Initial sync
    syncLenisWithDialogs();

    return () => {
      observer.disconnect();
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
