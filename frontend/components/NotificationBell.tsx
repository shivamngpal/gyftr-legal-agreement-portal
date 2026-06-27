"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { API_URL } from "@/lib/utils";

interface Reminder {
  id: string;
  message: string | null;
  timestamp: string;
  agreement: { clientName: string };
}

export function NotificationBell() {
  const { user, token } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toastShown, setToastShown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchReminders = useCallback(async () => {
    if (!token || !user || user.role === "LEGAL") return;
    try {
      const res = await fetch(`${API_URL}/api/reminders/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: Reminder[] = await res.json();
        setReminders(data);
        // Show a one-time toast on first load if there are unread reminders
        if (!toastShown && data.length > 0) {
          toast(`You have ${data.length} unread reminder${data.length > 1 ? "s" : ""} from Legal.`, {
            description: "Click the bell icon to view.",
            duration: 5000,
          });
          setToastShown(true);
        }
      }
    } catch {
      // silently fail
    }
  }, [token, user, toastShown]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  useEffect(() => {
    const interval = setInterval(fetchReminders, 60000);
    return () => clearInterval(interval);
  }, [fetchReminders]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const handleDismissAll = async () => {
    const prev = reminders;
    setReminders([]);
    setIsOpen(false);
    try {
      await Promise.all(
        prev.map((r) =>
          fetch(`${API_URL}/api/reminders/${r.id}/read`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      toast.success("All reminders dismissed.");
    } catch {
      setReminders(prev);
    }
  };

  if (!user || user.role === "LEGAL") return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Notifications"
        className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        {/* Bell SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {reminders.length > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none">
            {reminders.length > 9 ? "9+" : reminders.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-xl shadow-2xl z-50 overflow-hidden text-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Reminders</span>
              {reminders.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {reminders.length}
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="max-h-64 overflow-y-auto divide-y">
            {reminders.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No pending reminders.</p>
            ) : (
              reminders.map((r) => (
                <div key={r.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <p className="text-sm font-semibold text-gray-800">{r.agreement.clientName}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {r.message || "Please review and update your status"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {new Date(r.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {reminders.length > 0 && (
            <div className="px-4 py-2.5 border-t bg-gray-50">
              <button
                onClick={handleDismissAll}
                className="text-xs text-red-600 hover:text-red-700 font-medium w-full text-center transition-colors"
              >
                Dismiss all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
