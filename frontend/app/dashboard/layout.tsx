"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";

const HamburgerIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-gray-500">Loading application...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar drawer */}
      <aside
        className="overflow-hidden flex-shrink-0 bg-slate-900 text-white flex flex-col transition-[width] duration-300 ease-in-out"
        style={{ width: sidebarOpen ? "240px" : "0px" }}
      >
        <div className="w-60 flex flex-col h-full">
          {/* Logo + toggle */}
          <div className="h-14 flex items-center justify-between px-5 border-b border-slate-800 flex-shrink-0">
            <span className="font-bold text-lg tracking-tight">Gyftr Legal</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Close sidebar"
            >
              <HamburgerIcon />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            <Link
              href="/dashboard"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/dashboard"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Dashboard
            </Link>
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate capitalize">{user.role.toLowerCase()}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-slate-900 text-xs"
              onClick={logout}
            >
              Log out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top header */}
        <header className="h-14 bg-white border-b flex items-center justify-between px-4 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Open sidebar"
              >
                <HamburgerIcon />
              </button>
            )}
            <h1 className="text-base font-semibold text-gray-700">Legal Agreement Portal</h1>
          </div>
          <NotificationBell />
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
