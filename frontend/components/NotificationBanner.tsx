"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/utils";

interface Reminder {
  id: string;
  message: string | null;
  timestamp: string;
  agreement: {
    clientName: string;
  };
}

export function NotificationBanner() {
  const { user, token } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReminders = useCallback(async () => {
    if (!token || !user) return;
    if (user.role === "LEGAL") {
      setReminders([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/reminders/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReminders(data);
      }
    } catch (err) {
      console.error("Failed to fetch reminders:", err);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) return;
    if (user.role === "LEGAL") return;
    
    fetchReminders();
  }, [token, user, fetchReminders]);

  useEffect(() => {
    if (!token || !user) return;
    if (user.role === "LEGAL") return;

    const interval = setInterval(() => {
      fetchReminders();
    }, 60000);

    return () => clearInterval(interval);
  }, [token, user, fetchReminders]);

  const handleDismissAll = async () => {
    if (!token) return;
    
    const previousReminders = reminders;
    setReminders([]);

    try {
      await Promise.all(
        previousReminders.map((reminder) =>
          fetch(`${API_URL}/api/reminders/${reminder.id}/read`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
    } catch (err) {
      setReminders(previousReminders);
      console.error("Failed to dismiss reminders:", err);
    }
  };

  if (loading || reminders.length === 0 || user?.role === "LEGAL") {
    return null;
  }

  return (
    <div className="bg-red-600 text-white w-full px-4 py-3 flex flex-col sm:flex-row sm:items-start justify-between shadow-md z-50">
      <div className="flex-1">
        <h3 className="font-bold text-sm mb-2">
          ⚠ You have {reminders.length} pending reminder(s) from Legal:
        </h3>
        <ul className="text-sm space-y-1 pl-4 list-disc">
          {reminders.map((reminder) => (
            <li key={reminder.id}>
              <strong>{reminder.agreement.clientName}</strong>:{" "}
              {reminder.message || "Please review and update your status"} —{" "}
              <span className="opacity-80 text-xs">
                {new Date(reminder.timestamp).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 bg-white hover:bg-red-50 border-white hover:text-red-700"
          onClick={handleDismissAll}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
