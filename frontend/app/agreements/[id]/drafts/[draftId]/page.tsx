"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as diff from "diff";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";

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

interface SignOff {
  id: string;
  timestamp: string;
  signatory: {
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

interface ComparisonData {
  baseDraft: Draft | null;
  currentDraft: Draft;
  comparisons: {
    baseClause: Clause | null;
    currentClause: Clause;
  }[];
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

const renderLeftDiff = (oldText: string, newText: string) => {
  const diffs = diff.diffWords(oldText || "", newText || "");
  return diffs.filter(part => !part.added).map((part, idx) => {
    if (part.removed) {
      return <span key={idx} className="bg-red-200 dark:bg-red-900/40 text-red-900 dark:text-red-200 rounded px-1">{part.value}</span>;
    }
    return <span key={idx}>{part.value}</span>;
  });
};

const renderRightDiff = (oldText: string, newText: string) => {
  const diffs = diff.diffWords(oldText || "", newText || "");
  return diffs.filter(part => !part.removed).map((part, idx) => {
    if (part.added) {
      return <span key={idx} className="bg-green-200 dark:bg-green-900/40 text-green-900 dark:text-green-200 rounded px-1">{part.value}</span>;
    }
    return <span key={idx}>{part.value}</span>;
  });
};

const agreementTypeLabels: Record<string, string> = {
  API_DIRECT: 'API / Direct',
  WHITE_LABEL: 'White Label',
  RESELLER: 'Reseller',
  ENTERPRISE: 'Enterprise'
};

const agreementStatusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  PENDING_SIGNATURE: 'Pending Signature',
  PARTIALLY_SIGNED: 'Partially Signed',
  EXECUTED: 'Executed',
  CANCELLED: 'Cancelled'
};

interface WorkspacePdfLayoutProps {
  fileUrl?: string;
  headerContent?: React.ReactNode;
  children: React.ReactNode;
}

const WorkspacePdfLayout = React.memo(({ fileUrl, headerContent, children }: WorkspacePdfLayoutProps) => {
  const [isDocVisible, setIsDocVisible] = useState(false);

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between mb-8 border-b pb-6">
        <div className="flex-1">
          {headerContent}
        </div>
        {fileUrl && (
          <div>
            <Button onClick={() => setIsDocVisible(!isDocVisible)}>
              {isDocVisible ? "Hide PDF" : "View PDF"}
            </Button>
          </div>
        )}
      </div>

      <div className={isDocVisible ? "h-[calc(100vh-140px)]" : ""}>
        <PanelGroup orientation="horizontal" style={isDocVisible ? {} : { overflow: "visible" }}>
          {/* Left Panel */}
          <Panel defaultSize={100} minSize={30} style={isDocVisible ? {} : { overflow: "visible" }}>
            <div className={`w-full space-y-6 pb-10 block ${isDocVisible ? "h-full overflow-y-auto pr-4" : ""}`}>
              {children}
            </div>
          </Panel>
          {/* Right Panel - PDF Viewer */}
          {isDocVisible && fileUrl && (
            <>
              <PanelResizeHandle className="w-2 bg-gray-200 cursor-col-resize hover:bg-gray-300 active:bg-blue-500 transition-colors mx-4 rounded-full" />
              <Panel defaultSize={60} minSize={30}>
                <div className="w-full h-full border rounded-lg overflow-hidden bg-white shadow-sm flex-shrink-0">
                  <iframe src={fileUrl} className="w-full h-full border-0" title="PDF Viewer" />
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
});
WorkspacePdfLayout.displayName = "WorkspacePdfLayout";

export default function DraftWorkspacePage() {
  const { id, draftId } = useParams() as { id: string; draftId: string };
  const { user, token } = useAuth();
  const router = useRouter();

  const [agreement, setAgreement] = useState<AgreementDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [signOffs, setSignOffs] = useState<SignOff[]>([]);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [newRemark, setNewRemark] = useState("");
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);
  const [editedClauses, setEditedClauses] = useState<Record<string, { outcome: string, comments: string }>>({});
  const [isSavingClauses, setIsSavingClauses] = useState(false);
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  const [isSubmittingSignOff, setIsSubmittingSignOff] = useState(false);
  const selectedDraftId = draftId;

  const fetchAgreementData = useCallback(async () => {
    const res = await fetch(`http://localhost:5000/api/agreements/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Failed to load agreement");
    setAgreement(await res.json());
  }, [id, token]);

  const fetchRemarks = useCallback(async () => {
    const res = await fetch(`http://localhost:5000/api/agreements/${id}/remarks?draftId=${draftId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setRemarks(await res.json());
  }, [id, draftId, token]);

  const fetchHistory = useCallback(async () => {
    const res = await fetch(`http://localhost:5000/api/agreements/${id}/history?draftId=${draftId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setHistory(await res.json());
  }, [id, draftId, token]);

  const fetchSignOffs = useCallback(async () => {
    const res = await fetch(`http://localhost:5000/api/agreements/${id}/signoff`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setSignOffs(await res.json());
  }, [id, token]);

  const fetchClauses = useCallback(async () => {
    if (!selectedDraftId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/drafts/${selectedDraftId}/clauses`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setClauses(await res.json());
    } catch {
      setClauses([]);
    }
  }, [token, selectedDraftId]);

  const fetchAllData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchAgreementData(),
        fetchClauses(),
        fetchSignOffs()
      ]);
      
      setLoading(false);

      await Promise.all([
        fetchRemarks(),
        fetchHistory()
      ]);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [token, fetchAgreementData, fetchClauses, fetchSignOffs, fetchRemarks, fetchHistory]);

  const handleRecordSignOff = useCallback(async () => {
    if (!token) return;
    setIsSubmittingSignOff(true);
    try {
      const res = await fetch(`http://localhost:5000/api/agreements/${id}/signoff`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Failed to record sign-off");
      }
      
      toast.success("Sign-off recorded successfully");
      setIsSignOffModalOpen(false);
      fetchSignOffs();
      fetchAgreementData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmittingSignOff(false);
    }
  }, [id, token, fetchSignOffs, fetchAgreementData]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [selectedBaseDraftId, setSelectedBaseDraftId] = useState<string | null>(null);

  const diffResults = useMemo(() => {
    if (!comparisonData?.comparisons) return [];
    
    return comparisonData.comparisons.map(pair => ({
      identifier: pair.currentClause.identifier,
      leftDiff: pair.baseClause 
        ? renderLeftDiff(pair.baseClause.text, pair.currentClause.text)
        : null,
      rightDiff: pair.baseClause
        ? renderRightDiff(pair.baseClause.text, pair.currentClause.text)
        : null,
      currentClause: pair.currentClause,
      baseClause: pair.baseClause
    }));
  }, [comparisonData]);

  useEffect(() => {
    setSelectedBaseDraftId(null);
  }, [selectedDraftId]);

  const fetchComparison = useCallback(async (baseDraftIdToFetch?: string) => {
    if (!token || !selectedDraftId || user?.role !== "LEGAL") {
      setComparisonData(null);
      return;
    }
    setLoadingComparison(true);
    try {
      const url = baseDraftIdToFetch 
        ? `http://localhost:5000/api/drafts/${selectedDraftId}/compare?baseDraftId=${baseDraftIdToFetch}`
        : `http://localhost:5000/api/drafts/${selectedDraftId}/compare`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
      } else {
        setComparisonData(null);
      }
    } catch {
      setComparisonData(null);
    } finally {
      setLoadingComparison(false);
    }
  }, [token, selectedDraftId, user?.role]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  useEffect(() => {
    if (selectedBaseDraftId) {
      fetchComparison(selectedBaseDraftId);
    }
  }, [selectedBaseDraftId, selectedDraftId, fetchComparison]);

  const handleStatusUpdate = useCallback(async (team: string, newStatus: string) => {
    if (!token) return;
    setIsUpdating(team);
    try {
      const res = await fetch(`http://localhost:5000/api/agreements/${id}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, draftId: draftId }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Failed to update review status");
      }
      
      toast.success(`${team} status updated to ${newStatus}`);
      fetchAgreementData();
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdating(null);
    }
  }, [id, draftId, token, fetchAgreementData, fetchHistory]);

  const handleAddRemark = useCallback(async () => {
    if (!newRemark.trim() || !token) return;
    setIsSubmittingRemark(true);
    try {
      const res = await fetch(`http://localhost:5000/api/agreements/${id}/remarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newRemark, draftId: draftId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Failed to add remark");
      }

      toast.success("Remark added successfully");
      setNewRemark("");
      fetchRemarks();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmittingRemark(false);
    }
  }, [id, draftId, token, newRemark, fetchRemarks]);

  const handleClauseChange = useCallback((clauseId: string, field: "outcome" | "comments", value: string) => {
    setEditedClauses((prev) => {
      const existing = prev[clauseId] || { 
        outcome: clauses.find(c => c.id === clauseId)?.outcome || "PENDING", 
        comments: clauses.find(c => c.id === clauseId)?.comments || "" 
      };
      return {
        ...prev,
        [clauseId]: {
          ...existing,
          [field]: value
        }
      };
    });
  }, [clauses]);

  const handleSaveClauseReview = useCallback(async () => {
    if (!token || Object.keys(editedClauses).length === 0) return;
    setIsSavingClauses(true);
    
    const payloadClauses = Object.entries(editedClauses).map(([id, data]) => ({
      id,
      outcome: data.outcome,
      comments: data.comments || null
    }));

    try {
      const res = await fetch(`http://localhost:5000/api/drafts/${draftId}/clauses`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clauses: payloadClauses }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Failed to save clause review");
      }

      toast.success("Clause review saved successfully");
      setEditedClauses({});
      fetchClauses();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSavingClauses(false);
    }
  }, [draftId, token, editedClauses, fetchClauses]);

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
        <Button variant="outline" onClick={fetchAllData}>Retry</Button>
      </div>
    );
  }

  const currentDraft = agreement.drafts?.find((d) => d.id === draftId);

  const getAgreementStatusBadge = (status: string) => {
    const label = agreementStatusLabels[status] || status;
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary">{label}</Badge>;
      case "IN_REVIEW":
        return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">{label}</Badge>;
      case "PENDING_SIGNATURE":
        return <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300">{label}</Badge>;
      case "PARTIALLY_SIGNED":
        return <Badge variant="outline" className="border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">{label}</Badge>;
      case "EXECUTED":
        return <Badge variant="outline" className="border-green-300 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">{label}</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">{label}</Badge>;
      default:
        return <Badge variant="outline">{label}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-10">
      
      <WorkspacePdfLayout
        fileUrl={currentDraft?.fileUrl}
        headerContent={
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0">
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
                  <Badge variant="outline">{agreement?.type ? agreementTypeLabels[agreement.type] || agreement.type : agreement.type}</Badge>
                  <span className="text-gray-400">•</span>
                  {getAgreementStatusBadge(agreement.status)}
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-muted-foreground">
                    Uploaded on {currentDraft ? new Date(currentDraft.createdAt).toLocaleString() : "Unknown"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Review Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {["LEGAL", "FINANCE", "BUSINESS", "COMPLIANCE"].map((team) => {
              const currentReviewStatuses = currentDraft?.reviewStatuses || [];
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

              <h3 className="text-xl font-bold tracking-tight mt-2">Workspace Modules</h3>
              
              {/* Remarks Section */}
              <Card>
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
          <Card>
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
          {user?.role === "LEGAL" ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Clause Comparison</CardTitle>
                {agreement.drafts && agreement.drafts.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Compare Against:</span>
                    <Select
                      value={selectedBaseDraftId || (comparisonData?.baseDraft?.id ?? "")}
                      onValueChange={(val) => setSelectedBaseDraftId(val)}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Select draft">
                          {(() => {
                            const activeId = selectedBaseDraftId || comparisonData?.baseDraft?.id;
                            if (!activeId) return null;
                            const activeDraft = agreement.drafts.find(d => d.id === activeId);
                            return activeDraft ? `Draft ${activeDraft.version}` : null;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {agreement.drafts
                          .filter(d => d.id !== selectedDraftId)
                          .map(d => (
                            <SelectItem key={d.id} value={d.id}>
                              Draft {d.version}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {loadingComparison ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : !comparisonData ? (
                  <p className="text-sm text-muted-foreground">Unable to load comparison data.</p>
                ) : !comparisonData.baseDraft ? (
                  <div className="space-y-6">
                    <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded-md border border-blue-200 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      This is the first draft. No previous version available for comparison.
                    </div>
                    {clauses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No clauses are available for this draft.</p>
                    ) : (
                      clauses.map((clause, idx) => {
                        const currentOutcome = editedClauses[clause.id]?.outcome || clause.outcome;
                        const currentComments = editedClauses[clause.id]?.comments ?? (clause.comments || "");
                        
                        return (
                          <div key={idx} className="border rounded-md overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-900 border-b px-4 py-2 flex items-center justify-between">
                              <h4 className="font-semibold text-sm">{clause.identifier}</h4>
                              <Select
                                value={currentOutcome}
                                onValueChange={(val) => handleClauseChange(clause.id, "outcome", val as string)}
                              >
                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PENDING">Pending</SelectItem>
                                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                                  <SelectItem value="PARTIAL">Partial</SelectItem>
                                  <SelectItem value="HELD">Held</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="p-4 flex flex-col h-full">
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mb-4">
                                {clause.text}
                              </p>
                              <div className="mt-auto">
                                <textarea
                                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  placeholder="Add comments for this clause..."
                                  value={currentComments}
                                  onChange={(e) => handleClauseChange(clause.id, "comments", e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div className="flex justify-end pt-4 border-t mt-4">
                      <Button 
                        onClick={handleSaveClauseReview}
                        disabled={Object.keys(editedClauses).length === 0 || isSavingClauses}
                      >
                        {isSavingClauses ? "Saving..." : "Save Clause Review"}
                      </Button>
                    </div>
                  </div>
                ) : comparisonData.comparisons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clauses are available for this draft.</p>
                ) : (
                  <div className="space-y-6">
                    {diffResults.map((comp, idx) => {
                      const currentOutcome = editedClauses[comp.currentClause.id]?.outcome || comp.currentClause.outcome;
                      const currentComments = editedClauses[comp.currentClause.id]?.comments ?? (comp.currentClause.comments || "");
                      
                      return (
                        <div key={idx} className="border rounded-md overflow-hidden">
                          <div className="bg-gray-50 dark:bg-gray-900 border-b px-4 py-2">
                            <h4 className="font-semibold text-sm">{comp.identifier}</h4>
                          </div>
                          <div className="grid grid-cols-2 divide-x">
                            <div className="p-4">
                              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                                Selected Draft (V{comparisonData.baseDraft?.version})
                              </p>
                              {comp.baseClause ? (
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                  {comp.leftDiff}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">Clause not present in selected draft.</p>
                              )}
                            </div>
                            <div className="p-4 flex flex-col h-full">
                              <div className="flex items-start justify-between mb-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">
                                  Current Draft (V{comparisonData.currentDraft.version})
                                </p>
                                <Select
                                  value={currentOutcome}
                                  onValueChange={(val) => handleClauseChange(comp.currentClause.id, "outcome", val as string)}
                                >
                                  <SelectTrigger className="w-[120px] h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="ACCEPTED">Accepted</SelectItem>
                                    <SelectItem value="PARTIAL">Partial</SelectItem>
                                    <SelectItem value="HELD">Held</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mb-4 flex-grow">
                                {comp.baseClause 
                                  ? comp.rightDiff
                                  : comp.currentClause.text}
                              </p>
                              <div className="mt-auto">
                                <textarea
                                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  placeholder="Add comments for this clause..."
                                  value={currentComments}
                                  onChange={(e) => handleClauseChange(comp.currentClause.id, "comments", e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-end pt-4 border-t mt-4">
                      <Button 
                        onClick={handleSaveClauseReview}
                        disabled={Object.keys(editedClauses).length === 0 || isSavingClauses}
                      >
                        {isSavingClauses ? "Saving..." : "Save Clause Review"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Clause Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {(!agreement.drafts || agreement.drafts.length === 0) ? (
                    <p className="text-sm text-muted-foreground">Upload a draft before reviewing clauses.</p>
                  ) : clauses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No clauses are available for this draft.</p>
                  ) : (
                    <>
                      {clauses.map((clause) => (
                        <div key={clause.id} className="p-4 border rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-sm">{clause.identifier}</h4>
                            <Badge 
                              variant={clause.outcome === "ACCEPTED" ? "default" : clause.outcome === "HELD" ? "destructive" : "outline"}
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
                      ))}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          <PlaceholderCard title="Reminders" />

          {/* Sign-Off Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sign-offs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {signOffs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sign-offs recorded yet.</p>
                ) : (
                  signOffs.map((signOff) => (
                    <div key={signOff.id} className="flex items-center justify-between p-3 border rounded-md bg-gray-50/50">
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-semibold">{signOff.signatory.name}</p>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{signOff.signatory.role}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(signOff.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-green-600 flex items-center space-x-1">
                        <span className="text-sm font-medium">Signed</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  ))
                )}
                {user && (user.role === "LEGAL" || user.role === "BUSINESS") && (
                  <div className="pt-4 border-t mt-4">
                    {agreement?.status === "EXECUTED" ? (
                      <p className="text-sm font-medium text-green-600 flex items-center justify-center space-x-2 py-2">
                        <span>Agreement fully executed</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </p>
                    ) : signOffs.some(s => s.signatory.name === user.name && s.signatory.role === user.role) ? (
                      <p className="text-sm font-medium text-green-600 flex items-center justify-center space-x-2 py-2">
                        <span>You have signed this agreement</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {agreement?.status === "PARTIALLY_SIGNED" && (
                          <div className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded text-center border border-yellow-200 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                            One party has signed. Awaiting the remaining signature.
                          </div>
                        )}
                        <Button className="w-full" onClick={() => setIsSignOffModalOpen(true)}>
                          Record Sign-Off
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Sign-Off Confirmation Modal */}
          <Dialog open={isSignOffModalOpen} onOpenChange={setIsSignOffModalOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Confirm Sign-Off</DialogTitle>
                <DialogDescription className="pt-4 text-gray-700">
                  By clicking confirm, you are recording a digital sign-off for this agreement as <strong>{user?.name} ({user?.role})</strong>. This action is permanent and will be logged.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setIsSignOffModalOpen(false)} disabled={isSubmittingSignOff}>
                  Cancel
                </Button>
                <Button onClick={handleRecordSignOff} disabled={isSubmittingSignOff}>
                  {isSubmittingSignOff ? "Recording..." : "Confirm Sign-Off"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

      </WorkspacePdfLayout>
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
