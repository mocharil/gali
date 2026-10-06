"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { LandingNavbar } from "./LandingNavbar";
import { Footer } from "./Footer";
import { TerminalStatusBar } from "./TerminalStatusBar";
import { CommandPalette } from "./CommandPalette";
import { DataAssistantModal } from "./DataAssistantModal";
import { api } from "@/lib/api";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [assistantQuery, setAssistantQuery] = useState("");
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  const isLandingPage = pathname === "/";

  // Restore sidebar collapsed preference from localStorage safely after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gali_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // ignore localStorage errors in private mode
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("gali_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Check API health status
  useEffect(() => {
    let active = true;
    const check = () => api.checkReadiness().then((res) => { if (active) setApiOnline(res.status === "ready"); }).catch(() => { if (active) setApiOnline(false); });
    void check();
    const interval = setInterval(check, 60_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    function openAssistant(event: Event) {
      setAssistantQuery((event as CustomEvent<{ query?: string }>).detail?.query ?? "");
      setSearchOpen(false);
      setAiModalOpen(true);
    }
    window.addEventListener("gali:open-assistant", openAssistant);
    return () => window.removeEventListener("gali:open-assistant", openAssistant);
  }, []);

  // Global hotkeys:
  // - Ctrl/Cmd+K or "/" to open Command Palette
  // - Ctrl/Cmd+B to toggle sidebar folding (on app routes)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        setAiModalOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAiModalOpen((v) => !v);
        setSearchOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b" && !isLandingPage) {
        e.preventDefault();
        toggleCollapse();
      }
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        !(document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable)
      ) {
        e.preventDefault();
        setSearchOpen(true);
        setAiModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLandingPage]);

  // Auto-close mobile sidebar and search on route changes
  useEffect(() => {
    setSidebarOpen(false);
    setSearchOpen(false);
    setAiModalOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // ── 1. Landing Page Layout (Full-Width, No Sidebar) ──
  if (isLandingPage) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex flex-col selection:bg-brand-soft selection:text-brand">
        {/* Landing Top Navigation Bar */}
        <LandingNavbar apiOnline={apiOnline} onOpenAi={() => setAiModalOpen(true)} />

        {/* Full-Width Landing Content */}
        {children}

        {/* Landing Footer */}
        <Footer />

        {/* Fast Command Palette */}
        <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

        <DataAssistantModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} initialQuery={assistantQuery} />
      </div>
    );
  }

  // ── 2. App & Dashboard Layout (Sidebar + Contextual Header) ──
  return (
    <div className="min-h-screen bg-canvas text-ink flex selection:bg-brand-soft selection:text-brand">
      {/* ── Left Sidebar Navigation (Collapsible / Foldable) ── */}
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={isCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={toggleCollapse}
        onOpenSearch={() => setSearchOpen(true)}
        apiOnline={apiOnline}
      />

      {/* ── Right Content Area ── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ease-in-out ${
          isCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
        }`}
      >
        {/* Top Contextual Header with Sidebar Toggle Button */}
        <Header
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onToggleCollapse={toggleCollapse}
          isCollapsed={isCollapsed}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenAi={() => setAiModalOpen(true)}
          apiOnline={apiOnline}
        />

        {/* Page Content */}
        {children}

        {/* Minimal Terminal Status Bar (No landing footer) */}
        <TerminalStatusBar apiOnline={apiOnline} />
      </div>

      {/* ── Universal Fast Command Palette ── */}
      <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <DataAssistantModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} initialQuery={assistantQuery} />
    </div>
  );
}
