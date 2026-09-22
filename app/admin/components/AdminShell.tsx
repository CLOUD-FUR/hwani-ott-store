"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("hwani-ott-theme");
    if (stored !== null) return stored === "dark";
    return true;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    localStorage.setItem("hwani-ott-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/auth/me");
        if (!res.ok) {
          router.replace("/admin/login");
          return;
        }
        setLoading(false);
      } catch (error) {
        console.error("Auth check error:", error);
        router.replace("/admin/login");
      }
    };

    checkAuth();
  }, [router]);

  const toggleDark = useCallback(() => setDark((d) => !d), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((s) => !s), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-slate-400">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#0F172A] text-white">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <TopBar
          dark={dark}
          onToggleDark={toggleDark}
          onToggleSidebar={toggleSidebar}
        />
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
