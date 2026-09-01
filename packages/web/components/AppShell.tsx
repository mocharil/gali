"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { LandingNavbar } from "./LandingNavbar";
import { Footer } from "./Footer";
import { TerminalStatusBar } from "./TerminalStatusBar";
import { CommandPalette } from "./CommandPalette";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
    fetch("/api/health")
      .then((res) => {
        if (res.ok) setApiOnline(true);
        else setApiOnline(false);
      })
      .catch(() => setApiOnline(false));
  }, []);

  // Global hotkeys:
  // - Ctrl/Cmd+K or "/" to open Command Palette
  // - Ctrl/Cmd+B to toggle sidebar folding (on app routes)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b" && !isLandingPage) {
        e.preventDefault();
        toggleCollapse();
      }
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLandingPage]);

  // Auto-close mobile sidebar and search on route changes
  useEffect(() => {
    setSidebarOpen(false);
    setSearchOpen(false);
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
      <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
        {/* Landing Top Navigation Bar */}
        <LandingNavbar apiOnline={apiOnline} />

        {/* Full-Width Landing Content */}
        <main className="flex-1 bg-ambient-radial">{children}</main>

        {/* Landing Footer */}
        <Footer />

        {/* Fast Command Palette */}
        <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    );
  }

  // ── 2. App & Dashboard Layout (Sidebar + Contextual Header) ──
  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex selection:bg-amber-500/30 selection:text-amber-200">
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
          isCollapsed ? "lg:pl-[72px]" : "lg:pl-72"
        }`}
      >
        {/* Top Contextual Header with Sidebar Toggle Button */}
        <Header
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onToggleCollapse={toggleCollapse}
          isCollapsed={isCollapsed}
          onOpenSearch={() => setSearchOpen(true)}
          apiOnline={apiOnline}
        />

        {/* Page Content */}
        <main className="flex-1 bg-ambient-radial">{children}</main>

        {/* Minimal Terminal Status Bar (No landing footer) */}
        <TerminalStatusBar apiOnline={apiOnline} />
      </div>

      {/* ── Universal Fast Command Palette ── */}
      <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
