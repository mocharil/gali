"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";
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
  // - Ctrl/Cmd+B to toggle sidebar folding
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
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
  }, []);

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

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex">
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

        {/* Footer */}
        <Footer />
      </div>

      {/* ── Universal Fast Command Palette ── */}
      <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
