"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReviewStatus {
  team: string;
  status: string;
}

interface Agreement {
  id: string;
  clientName: string;
  type: string;
  status: string;
  startDate: string;
  updatedAt: string;
  drafts?: { reviewStatuses: ReviewStatus[] }[];
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    type: "",
    startDate: "",
  });

  const [isRemindModalOpen, setIsRemindModalOpen] = useState(false);
  const [remindAgreementId, setRemindAgreementId] = useState<string | null>(null);
  const [isReminding, setIsReminding] = useState(false);
  const [remindData, setRemindData] = useState({
    targetTeam: "",
    message: "",
  });

  const fetchAgreements = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/agreements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch agreements");
      const data = await res.json();
      setAgreements(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    
    try {
      const res = await fetch("http://localhost:5000/api/agreements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientName: formData.clientName,
          type: formData.type,
          startDate: new Date(formData.startDate).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create agreement");
      }

      toast.success("Agreement created successfully");
      setIsModalOpen(false);
      setFormData({ clientName: "", type: "", startDate: "" });
      fetchAgreements(); // Refresh the list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !remindAgreementId || !remindData.targetTeam) return;
    setIsReminding(true);

    try {
      const res = await fetch("http://localhost:5000/api/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agreementId: remindAgreementId,
          targetTeam: remindData.targetTeam,
          message: remindData.message,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to send reminder");
      }

      setIsRemindModalOpen(false);
      setRemindData({ targetTeam: "", message: "" });
      toast.success("Reminder sent successfully");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsReminding(false);
    }
  };

  const getTeamStatus = (statuses: ReviewStatus[], team: string) => {
    const status = statuses.find((s) => s.team === team)?.status || "N/A";
    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
    if (status === "APPROVED") badgeVariant = "default";
    if (status === "REJECTED") badgeVariant = "destructive";
    if (status === "PENDING") badgeVariant = "secondary";
    if (status === "UNDER_REVIEW") badgeVariant = "outline";
    return <Badge variant={badgeVariant}>{status}</Badge>;
  };

  if (loading && agreements.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Loading agreements...</p>
      </div>
    );
  }

  if (error && agreements.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-red-500">
        <p>Error: {error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchAgreements}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Agreements</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchAgreements} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>

          {user?.role === "LEGAL" && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger render={<Button />}>
                New Agreement
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Agreement</DialogTitle>
                  <DialogDescription>
                    Fill out the basic details to initialize a new agreement.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name</Label>
                    <Input
                      id="clientName"
                      required
                      value={formData.clientName}
                      onChange={(e) =>
                        setFormData({ ...formData, clientName: e.target.value })
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Agreement Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(val) => setFormData({ ...formData, type: val || "" })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="API_DIRECT">API Direct</SelectItem>
                        <SelectItem value="WHITE_LABEL">White Label</SelectItem>
                        <SelectItem value="RESELLER">Reseller</SelectItem>
                        <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Agreement"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {agreements.length === 0 && !loading ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50">
          <p className="text-gray-500">No agreements found.</p>
        </div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Legal</TableHead>
                <TableHead>Finance</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Compliance</TableHead>
                {user?.role === "LEGAL" && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreements.map((agreement) => (
                <TableRow
                  key={agreement.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/agreements/${agreement.id}`)}
                >
                  <TableCell className="font-medium">{agreement.clientName}</TableCell>
                  <TableCell>{agreement.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{agreement.status}</Badge>
                  </TableCell>
                  <TableCell>{getTeamStatus(agreement.drafts?.[0]?.reviewStatuses || [], "LEGAL")}</TableCell>
                  <TableCell>{getTeamStatus(agreement.drafts?.[0]?.reviewStatuses || [], "FINANCE")}</TableCell>
                  <TableCell>{getTeamStatus(agreement.drafts?.[0]?.reviewStatuses || [], "BUSINESS")}</TableCell>
                  <TableCell>{getTeamStatus(agreement.drafts?.[0]?.reviewStatuses || [], "COMPLIANCE")}</TableCell>
                  {user?.role === "LEGAL" && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRemindAgreementId(agreement.id);
                          setIsRemindModalOpen(true);
                        }}
                      >
                        Remind
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Remind Modal */}
      <Dialog open={isRemindModalOpen} onOpenChange={setIsRemindModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send Reminder</DialogTitle>
            <DialogDescription>
              Nudge a team to review this agreement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendReminder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="targetTeam">Target Team</Label>
              <Select
                value={remindData.targetTeam}
                onValueChange={(val) => setRemindData({ ...remindData, targetTeam: val || "" })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FINANCE">Finance</SelectItem>
                  <SelectItem value="BUSINESS">Business</SelectItem>
                  <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Input
                id="message"
                placeholder="Add a note for the team..."
                value={remindData.message}
                onChange={(e) => setRemindData({ ...remindData, message: e.target.value })}
                disabled={isReminding}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isReminding}>
              {isReminding ? "Sending..." : "Send Reminder"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
