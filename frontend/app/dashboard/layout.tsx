"use client";

import React from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-gray-500">Loading application...</p>
      </div>
    );
  }

  if (!user) {
    return null; // The AuthProvider will automatically redirect to /login
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 font-bold text-xl tracking-tight">
          Gyftr Legal
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a href="/dashboard" className="block px-4 py-2 bg-slate-800 rounded-md text-sm font-medium">
            Dashboard
          </a>
          <a href="#" className="block px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-md text-sm font-medium transition-colors">
            Agreements
          </a>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.role}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full text-slate-900" onClick={logout}>
            Log out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center px-8 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-800">Legal Agreement Portal</h1>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
