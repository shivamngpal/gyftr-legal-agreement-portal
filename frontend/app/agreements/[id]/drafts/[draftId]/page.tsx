"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Spoc {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ReviewStatus {
  id: string;
  team: string;
  status: string;
  updatedAt: string;
}

interface Draft {
  id: string;
  version: number;
  fileUrl: string;
  createdAt: string;
  reviewStatuses?: ReviewStatus[];
}

interface Remark {
  id: string;
  message: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: string;
  };
}

interface HistoryLog {
  id: string;
  action: string;
  details: string | null;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    role: string;
  };
}

interface Clause {
  id: string;
  identifier: string;
  text: string;
  outcome: string;
  comments: string | null;
}

interface AgreementDetails {
  id: string;
  clientName: string;
  type: string;
  status: string;
  startDate: string;
  updatedAt: string;
  legalSpoc: Spoc | null;
  financeSpoc: Spoc | null;
  businessSpoc: Spoc | null;
  complianceSpoc: Spoc | null;
  drafts: Draft[];
}

export default function DraftWorkspacePage() {
  const { id, draftId } = useParams() as { id: string, draftId: string };
  const { user, token } = useAuth();
  const router = useRouter();

  const [agreement, setAgreement] = useState<AgreementDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [newRemark, setNewRemark] = useState("");
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);
  const selectedDraftId = draftId;

  const fetchAgreement = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/agreements/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 404) {
        throw new Error("NOT_FOUND");
      }
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Failed to load agreement");
      }
      
      const data = await res.json();
      setAgreement(data);

      // Fetch remarks
      const remarksRes = await fetch(`http://localhost:5000/api/agreements/${id}/remarks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (remarksRes.ok) {
        const remarksData = await remarksRes.json();
        setRemarks(remarksData);
      }

      // Fetch history
      const historyRes = await fetch(`http://localhost:5000/api/agreements/${id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchAgreement();
  }, [fetchAgreement]);

  useEffect(() => {
    if (!token || !selectedDraftId) {
      setClauses([]);
      return;
    }
    const fetchClauses = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/drafts/${selectedDraftId}/clauses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setClauses(data);
        } else {
          setClauses([]);
        }
      } catch {
        setClauses([]);
      }
    };
    fetchClauses();
  }, [token, selectedDraftId]);

  const handleStatusUpdate = async (team: string, newStatus: string) => {
    if (!token) return;
    setIsUpdating(team);
    try {
      const res = await fetch(`http://localhost:5000/api/agreements/${id}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Failed to update review status");
      }
      
      toast.success(`${team} status updated to ${newStatus}`);
      fetchAgreement();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleAddRemark = async () => {
    if (!newRemark.trim() || !token) return;
    setIsSubmittingRemark(true);
    try {
      const res = await fetch(`http://localhost:5000/api/agreements/${id}/remarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newRemark }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Failed to add remark");
      }

      toast.success("Remark added successfully");
      setNewRemark("");
      fetchAgreement();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmittingRemark(false);
    }
  };

  const getTeamStatusBadge = (statuses: ReviewStatus[], team: string) => {
    const status = statuses.find((s) => s.team === team)?.status || "N/A";
    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
    if (status === "APPROVED") badgeVariant = "default";
    if (status === "REJECTED") badgeVariant = "destructive";
    if (status === "PENDING") badgeVariant = "secondary";
    if (status === "UNDER_REVIEW") badgeVariant = "outline";
    return <Badge variant={badgeVariant}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-8">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error === "NOT_FOUND") {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 pt-20">
        <h2 className="text-2xl font-bold text-gray-800">Agreement Not Found</h2>
        <p className="text-gray-500">The agreement you are looking for does not exist.</p>
        <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 pt-20 text-red-500">
        <h2 className="text-xl font-semibold">Error Loading Agreement</h2>
        <p>{error}</p>
        <Button variant="outline" onClick={fetchAgreement}>Retry</Button>
      </div>
    );
  }

  const currentDraft = agreement.drafts?.find((d) => d.id === draftId);

  return (
    <div className="space-y-8 pb-10">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Link href={`/agreements/${id}`}>
            <Button variant="outline" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {agreement.clientName} - Draft Version {currentDraft?.version || "Unknown"}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-muted-foreground">
                Uploaded on {currentDraft ? new Date(currentDraft.createdAt).toLocaleString() : "Unknown"}
              </span>
            </div>
          </div>
        </div>
        {currentDraft && (
          <div>
            <a href={currentDraft.fileUrl} target="_blank" rel="noopener noreferrer">
              <Button>View PDF</Button>
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Review Statuses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Review Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {["LEGAL", "FINANCE", "BUSINESS", "COMPLIANCE"].map((team) => {
              const currentReviewStatuses = agreement.drafts?.[0]?.reviewStatuses || [];
              const statusObj = currentReviewStatuses.find((s) => s.team === team);
              const status = statusObj?.status || "N/A";
              
              const isOwnTeam = user?.role === team;
              const canUpdate = isOwnTeam && status !== "APPROVED" && status !== "REJECTED" && currentReviewStatuses.length > 0;

              return (
                <div key={team} className="flex items-center justify-between">
                  <p className="text-sm font-medium capitalize">{team.toLowerCase()} Review</p>
                  {canUpdate ? (
                    <Select
                      disabled={isUpdating === team}
                      value={status}
                      onValueChange={(val) => handleStatusUpdate(team, val || "")}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {status === "PENDING" && (
                          <SelectItem value="UNDER_REVIEW">Start Review</SelectItem>
                        )}
                        {status === "UNDER_REVIEW" && (
                          <>
                            <SelectItem value="APPROVED">Approve</SelectItem>
                            <SelectItem value="REJECTED">Reject</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    getTeamStatusBadge(currentReviewStatuses, team)
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-bold tracking-tight mb-4">Workspace Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Remarks Section */}
          <Card className="col-span-1 md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg">Remarks & Discussion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[300px] overflow-y-auto mb-4 p-1">
                {remarks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No remarks yet.</p>
                ) : (
                  remarks.map((remark) => (
                    <div key={remark.id} className="p-3 border rounded-md bg-gray-50/50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-semibold">{remark.author.name}</p>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{remark.author.role}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(remark.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{remark.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-2 border-t mt-4 flex flex-col space-y-2">
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Add a remark..."
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  disabled={isSubmittingRemark}
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleAddRemark} 
                    disabled={isSubmittingRemark || !newRemark.trim()}
                    size="sm"
                  >
                    {isSubmittingRemark ? "Submitting..." : "Submit Remark"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* History Section */}
          <Card className="col-span-1 md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg">History Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity has been recorded yet.</p>
                ) : (
                  <div className="relative border-l-2 border-gray-200 dark:border-gray-800 pl-6 ml-3">
                    {history.map((log, index) => (
                      <div key={log.id} className="mb-6 relative">
                        {/* Timeline dot */}
                        <div className="absolute w-3 h-3 bg-primary rounded-full -left-[31px] top-1.5" />
                        
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold">{log.actor.name}</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1">{log.actor.role}</Badge>
                          </div>
                          
                          <p className="text-sm font-medium">{
                            log.action === "STATUS_CHANGE" ? "Changed Review Status" :
                            log.action === "DRAFT_UPLOADED" ? "Uploaded Draft" :
                            log.action === "REMARK_ADDED" ? "Added Remark" :
                            log.action === "AGREEMENT_CREATED" ? "Created Agreement" :
                            log.action
                          }</p>
                          
                          {log.details && (
                            <p className="text-sm text-muted-foreground">{log.details}</p>
                          )}
                          
                          <p className="text-xs text-muted-foreground pt-1">
                            {new Date(log.timestamp).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })} • {new Date(log.timestamp).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Clause Analysis Section */}
          <Card className="col-span-1 md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg">Clause Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(!agreement.drafts || agreement.drafts.length === 0) ? (
                  <p className="text-sm text-muted-foreground">Upload a draft before reviewing clauses.</p>
                ) : clauses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clauses are available for this draft.</p>
                ) : (
                  clauses.map((clause) => (
                    <div key={clause.id} className="p-4 border rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">{clause.identifier}</h4>
                        <Badge 
                          variant={clause.outcome === "ACCEPTED" ? "default" : clause.outcome === "REJECTED" ? "destructive" : "outline"}
                        >
                          {clause.outcome}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                        {clause.text}
                      </p>
                      {clause.comments && (
                        <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs text-muted-foreground border">
                          <span className="font-semibold">Comments: </span>
                          {clause.comments}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          <PlaceholderCard title="Reminders" />
          <PlaceholderCard title="Sign-off" />
        </div>
      </div>
    </div>
  );
}

function PlaceholderCard({ title }: { title: string }) {
  return (
    <Card className="bg-gray-50 border-dashed">
      <CardHeader>
        <CardTitle className="text-md text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This feature will be implemented in a later task.
        </p>
      </CardContent>
    </Card>
  );
}
