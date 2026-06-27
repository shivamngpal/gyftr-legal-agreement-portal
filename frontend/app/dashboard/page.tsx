"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

interface TeamStat {
  team: string;
  waitingCount: number;
  avgResponseHours: number | null;
}

interface PriorityItem {
  agreementId: string;
  clientName: string;
  status: string;
  updatedAt: string;
  blockingTeams: string[];
}

interface DashboardStats {
  totalActive: number;
  stuckAgreements: number;
  openClauseCount: number;
  teamStats: TeamStat[];
  priorityList: PriorityItem[];
}

const agreementTypeLabels: Record<string, string> = {
  API_DIRECT: "API / Direct",
  WHITE_LABEL: "White Label",
  RESELLER: "Reseller",
  ENTERPRISE: "Enterprise",
};

const agreementStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In Review",
  PENDING_SIGNATURE: "Pending Signature",
  PARTIALLY_SIGNED: "Partially Signed",
  EXECUTED: "Executed",
  CANCELLED: "Cancelled",
};

interface RemindModalProps {
  isOpen: boolean;
  onClose: (isOpen: boolean) => void;
  agreementId: string | null;
  token: string | null;
  defaultTeam?: string;
}

const RemindModal = React.memo(
  ({ isOpen, onClose, agreementId, token, defaultTeam }: RemindModalProps) => {
    const [remindData, setRemindData] = useState({ targetTeam: "", message: "" });
    const [isReminding, setIsReminding] = useState(false);

    useEffect(() => {
      if (isOpen) {
        setRemindData({ targetTeam: defaultTeam ?? "", message: "" });
      }
    }, [isOpen, defaultTeam]);

    const handleSendReminder = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token || !agreementId || !remindData.targetTeam) return;
      setIsReminding(true);

      try {
        const res = await fetch("http://localhost:5000/api/reminders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            agreementId,
            targetTeam: remindData.targetTeam,
            message: remindData.message,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to send reminder");
        }

        onClose(false);
        toast.success("Reminder sent successfully");
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setIsReminding(false);
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
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
                onValueChange={(val) =>
                  setRemindData({ ...remindData, targetTeam: val || "" })
                }
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
                onChange={(e) =>
                  setRemindData({ ...remindData, message: e.target.value })
                }
                disabled={isReminding}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isReminding}>
              {isReminding ? "Sending..." : "Send Reminder"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
);
RemindModal.displayName = "RemindModal";

export default function DashboardPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [myStatusFilter, setMyStatusFilter] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    type: "",
    startDate: "",
    legalSpocId: "",
    financeSpocId: "",
    businessSpocId: "",
    complianceSpocId: "",
  });

  const [isRemindModalOpen, setIsRemindModalOpen] = useState(false);
  const [remindAgreementId, setRemindAgreementId] = useState<string | null>(null);
  const [remindDefaultTeam, setRemindDefaultTeam] = useState<string>("");

  // Dashboard stats (LEGAL only)
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  }, [token]);

  const fetchAgreements = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("type", typeFilter);
      if (myStatusFilter) params.append("myStatus", myStatusFilter);

      const agreementsRes = await fetch(
        `http://localhost:5000/api/agreements?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!agreementsRes.ok) throw new Error("Failed to fetch agreements");
      const data = await agreementsRes.json();
      setAgreements(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, debouncedSearch, statusFilter, typeFilter, myStatusFilter]);

  const fetchStats = useCallback(async () => {
    if (!token || user?.role !== "LEGAL") return;
    setStatsLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setStatsLoading(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
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
            legalSpocId: formData.legalSpocId || undefined,
            financeSpocId: formData.financeSpocId || undefined,
            businessSpocId: formData.businessSpocId || undefined,
            complianceSpocId: formData.complianceSpocId || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create agreement");
        }

        toast.success("Agreement created successfully");
        setIsModalOpen(false);
        setFormData({
          clientName: "",
          type: "",
          startDate: "",
          legalSpocId: "",
          financeSpocId: "",
          businessSpocId: "",
          complianceSpocId: "",
        });
        fetchAgreements();
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, formData, fetchAgreements]
  );

  const getTeamStatus = (statuses: ReviewStatus[], team: string) => {
    const status = statuses.find((s) => s.team === team)?.status || "N/A";
    let badgeVariant: "default" | "secondary" | "destructive" | "outline" =
      "outline";
    if (status === "APPROVED") badgeVariant = "default";
    if (status === "REJECTED") badgeVariant = "destructive";
    if (status === "PENDING") badgeVariant = "secondary";
    if (status === "UNDER_REVIEW") badgeVariant = "outline";
    return <Badge variant={badgeVariant}>{status}</Badge>;
  };

  const getAgreementStatusBadge = (status: string) => {
    const label = agreementStatusLabels[status] || status;
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary">{label}</Badge>;
      case "IN_REVIEW":
        return (
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          >
            {label}
          </Badge>
        );
      case "PENDING_SIGNATURE":
        return (
          <Badge
            variant="outline"
            className="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
          >
            {label}
          </Badge>
        );
      case "PARTIALLY_SIGNED":
        return (
          <Badge
            variant="outline"
            className="border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
          >
            {label}
          </Badge>
        );
      case "EXECUTED":
        return (
          <Badge
            variant="outline"
            className="border-green-300 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
          >
            {label}
          </Badge>
        );
      case "CANCELLED":
        return <Badge variant="destructive">{label}</Badge>;
      default:
        return <Badge variant="outline">{label}</Badge>;
    }
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

  const handleExport = async (format: "csv" | "pdf") => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (statusFilter && statusFilter !== "ALL")
        params.append("status", statusFilter);
      if (typeFilter && typeFilter !== "ALL") params.append("type", typeFilter);
      if (myStatusFilter && myStatusFilter !== "ALL")
        params.append("myStatus", myStatusFilter);
      params.append("format", format);

      const res = await fetch(
        `http://localhost:5000/api/agreements/export?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error(`Failed to export ${format}`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agreements-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toTitleCase = (s: string) =>
    s.charAt(0) + s.slice(1).toLowerCase();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Agreements</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => handleExport("csv")}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport("pdf")}>
            Export PDF
          </Button>

          {user?.role === "LEGAL" && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger render={<Button />}>New Agreement</DialogTrigger>
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
                      onValueChange={(val) =>
                        setFormData({ ...formData, type: val || "" })
                      }
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Legal SPOC</Label>
                      <Select
                        value={formData.legalSpocId}
                        onValueChange={(val) =>
                          setFormData({ ...formData, legalSpocId: val || "" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select SPOC">
                            {users.find((u) => u.id === formData.legalSpocId)
                              ?.name || ""}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter((u) => u.role === "LEGAL")
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Finance SPOC</Label>
                      <Select
                        value={formData.financeSpocId}
                        onValueChange={(val) =>
                          setFormData({ ...formData, financeSpocId: val || "" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select SPOC">
                            {users.find((u) => u.id === formData.financeSpocId)
                              ?.name || ""}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter((u) => u.role === "FINANCE")
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Business SPOC</Label>
                      <Select
                        value={formData.businessSpocId}
                        onValueChange={(val) =>
                          setFormData({
                            ...formData,
                            businessSpocId: val || "",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select SPOC">
                            {users.find(
                              (u) => u.id === formData.businessSpocId
                            )?.name || ""}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter((u) => u.role === "BUSINESS")
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Compliance SPOC</Label>
                      <Select
                        value={formData.complianceSpocId}
                        onValueChange={(val) =>
                          setFormData({
                            ...formData,
                            complianceSpocId: val || "",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select SPOC">
                            {users.find(
                              (u) => u.id === formData.complianceSpocId
                            )?.name || ""}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter((u) => u.role === "COMPLIANCE")
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
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

      {/* Bottleneck Dashboard — LEGAL only */}
      {user?.role === "LEGAL" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">
            Bottleneck Dashboard
          </h3>

          {/* Summary stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                {statsLoading ? (
                  <Skeleton className="h-9 w-16 mb-1" />
                ) : (
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {stats?.totalActive ?? 0}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Active Agreements
                </p>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="pt-6">
                {statsLoading ? (
                  <Skeleton className="h-9 w-16 mb-1" />
                ) : (
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {stats?.stuckAgreements ?? 0}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Stuck Agreements (&gt;3 days)
                </p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 dark:border-orange-800">
              <CardContent className="pt-6">
                {statsLoading ? (
                  <Skeleton className="h-9 w-16 mb-1" />
                ) : (
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {stats?.openClauseCount ?? 0}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Open Clauses (Pending / Held)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Team response breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Team Response Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead>Waiting Agreements</TableHead>
                      <TableHead>Avg Response Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(stats?.teamStats ?? []).map((row) => {
                      const isOverdue =
                        row.avgResponseHours !== null &&
                        row.avgResponseHours > 72;
                      return (
                        <TableRow
                          key={row.team}
                          className={
                            isOverdue ? "bg-red-50 dark:bg-red-900/10" : ""
                          }
                        >
                          <TableCell
                            className={`font-medium ${isOverdue ? "text-red-700 dark:text-red-400" : ""}`}
                          >
                            {toTitleCase(row.team)}
                          </TableCell>
                          <TableCell
                            className={
                              isOverdue ? "text-red-700 dark:text-red-400" : ""
                            }
                          >
                            {row.waitingCount}
                          </TableCell>
                          <TableCell
                            className={
                              isOverdue ? "text-red-700 dark:text-red-400" : ""
                            }
                          >
                            {row.avgResponseHours === null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              `${row.avgResponseHours.toFixed(1)} h`
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Priority follow-up */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Priority Follow-up</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : !stats?.priorityList.length ? (
                <p className="text-sm text-muted-foreground">
                  No agreements need immediate follow-up.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Blocking Teams</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.priorityList.map((item) => (
                      <TableRow key={item.agreementId}>
                        <TableCell className="font-medium">
                          {item.clientName}
                        </TableCell>
                        <TableCell>
                          {getAgreementStatusBadge(item.status)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.blockingTeams.map((team) => (
                              <Badge
                                key={team}
                                variant="outline"
                                className="text-xs"
                              >
                                {toTitleCase(team)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setRemindAgreementId(item.agreementId);
                              setRemindDefaultTeam(
                                item.blockingTeams[0] ?? ""
                              );
                              setIsRemindModalOpen(true);
                            }}
                          >
                            Remind
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col space-y-4 rounded-md border p-4 bg-white">
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Search by client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:w-1/3"
          />
          <Select
            value={statusFilter || "ALL"}
            onValueChange={(val) =>
              setStatusFilter(val === "ALL" ? "" : val || "")
            }
          >
            <SelectTrigger className="md:w-1/4">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="PENDING_SIGNATURE">
                Pending Signature
              </SelectItem>
              <SelectItem value="PARTIALLY_SIGNED">Partially Signed</SelectItem>
              <SelectItem value="EXECUTED">Executed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={typeFilter || "ALL"}
            onValueChange={(val) =>
              setTypeFilter(val === "ALL" ? "" : val || "")
            }
          >
            <SelectTrigger className="md:w-1/4">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="API_DIRECT">API Direct</SelectItem>
              <SelectItem value="WHITE_LABEL">White Label</SelectItem>
              <SelectItem value="RESELLER">Reseller</SelectItem>
              <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={myStatusFilter || "ALL"}
            onValueChange={(val) =>
              setMyStatusFilter(val === "ALL" ? "" : val || "")
            }
          >
            <SelectTrigger className="md:w-1/4">
              <SelectValue placeholder="My Status: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">My Status: All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          {(search || statusFilter || typeFilter || myStatusFilter) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setTypeFilter("");
                setMyStatusFilter("");
              }}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="text-sm text-gray-500">
          Showing {agreements.length} agreements
        </div>
      </div>

      {/* Agreements table */}
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
                  <TableCell className="font-medium">
                    {agreement.clientName}
                  </TableCell>
                  <TableCell>
                    {agreementTypeLabels[agreement.type] || agreement.type}
                  </TableCell>
                  <TableCell>
                    {getAgreementStatusBadge(agreement.status)}
                  </TableCell>
                  <TableCell>
                    {getTeamStatus(
                      agreement.drafts?.[0]?.reviewStatuses || [],
                      "LEGAL"
                    )}
                  </TableCell>
                  <TableCell>
                    {getTeamStatus(
                      agreement.drafts?.[0]?.reviewStatuses || [],
                      "FINANCE"
                    )}
                  </TableCell>
                  <TableCell>
                    {getTeamStatus(
                      agreement.drafts?.[0]?.reviewStatuses || [],
                      "BUSINESS"
                    )}
                  </TableCell>
                  <TableCell>
                    {getTeamStatus(
                      agreement.drafts?.[0]?.reviewStatuses || [],
                      "COMPLIANCE"
                    )}
                  </TableCell>
                  {user?.role === "LEGAL" && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRemindAgreementId(agreement.id);
                          setRemindDefaultTeam("");
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

      <RemindModal
        isOpen={isRemindModalOpen}
        onClose={setIsRemindModalOpen}
        agreementId={remindAgreementId}
        token={token}
        defaultTeam={remindDefaultTeam}
      />
    </div>
  );
}
