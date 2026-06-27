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
  draft?: {
    version: number;
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
  draft?: {
    version: number;
  };
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

interface RemarksSectionProps {
  remarks: Remark[];
  onAddRemark: (message: string) => Promise<void>;
}

const RemarksSection = React.memo(({ remarks, onAddRemark }: RemarksSectionProps) => {
  const [newRemark, setNewRemark] = useState("");
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);

  const handleSubmit = async () => {
    if (!newRemark.trim()) return;
    setIsSubmittingRemark(true);
    try {
      await onAddRemark(newRemark);
      setNewRemark("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmittingRemark(false);
    }
  };

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3 mt-6">
      <CardHeader>
        <CardTitle className="text-lg">Remarks & Discussion</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {remarks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No remarks yet.</p>
          ) : (
            remarks.map((remark) => (
              <div key={remark.id} className="p-4 border rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-sm">{remark.author.name}</h4>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">{remark.author.role}</Badge>
                    {remark.draft && (
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-2">
                        Draft V{remark.draft.version}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(remark.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {remark.message}
                </p>
              </div>
            ))
          )}
        </div>
        
        <div className="mt-6 border-t pt-4">
          <textarea
            value={newRemark}
            onChange={(e) => setNewRemark(e.target.value)}
            placeholder="Type a global remark here..."
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="flex justify-end mt-3">
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmittingRemark || !newRemark.trim()}
            >
              {isSubmittingRemark ? "Submitting..." : "Post Remark"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
RemarksSection.displayName = "RemarksSection";

interface HistorySectionProps {
  history: HistoryLog[];
}

const HistorySection = React.memo(({ history }: HistorySectionProps) => {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3 mt-6">
      <CardHeader>
        <CardTitle className="text-lg">History Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history available yet.</p>
        ) : (
          <div className="relative border-l ml-3 pl-6 space-y-6">
            {history.map((log) => (
              <div key={log.id} className="relative">
                <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-primary bg-background" />
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold">{log.actor.name}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">{log.actor.role}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.action.replace(/_/g, ' ')}</p>
                  {log.details && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{log.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
HistorySection.displayName = "HistorySection";

export default function AgreementDetailsPage() {
  const { id } = useParams() as { id: string };
  const { user, token } = useAuth();
  const router = useRouter();

  const [agreement, setAgreement] = useState<AgreementDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);

  const fetchAgreementData = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`http://localhost:5000/api/agreements/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) throw new Error("NOT_FOUND");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || data.error || "Failed to load agreement");
    }
    return res.json();
  }, [id, token]);

  const fetchRemarks = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`http://localhost:5000/api/agreements/${id}/remarks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setRemarks(await res.json());
    }
  }, [id, token]);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`http://localhost:5000/api/agreements/${id}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setHistory(await res.json());
    }
  }, [id, token]);

  const fetchAllData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [agreementData] = await Promise.all([
        fetchAgreementData(),
        fetchRemarks(),
        fetchHistory()
      ]);
      setAgreement(agreementData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, fetchAgreementData, fetchRemarks, fetchHistory]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleAddRemark = useCallback(async (message: string) => {
    if (!token) return;
    const res = await fetch(`http://localhost:5000/api/agreements/${id}/remarks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || data.error || "Failed to add remark");
    }

    fetchRemarks(); // Refetch to get new remarks only
    toast.success("Global remark added");
  }, [id, token, fetchRemarks]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    if (!token) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`http://localhost:5000/api/agreements/${id}/drafts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Failed to upload draft");
      }

      toast.success("Draft uploaded successfully");
      fetchAllData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [id, token, fetchAllData]);

  const getSpocDisplay = (spoc: Spoc | null) => {
    return spoc ? (
      <p className="text-sm font-medium">{spoc.name}</p>
    ) : (
      <p className="text-sm text-muted-foreground italic">Not Assigned</p>
    );
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
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{agreement.clientName}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline">{agreementTypeLabels[agreement.type] || agreement.type}</Badge>
              <span className="text-gray-400">•</span>
              {getAgreementStatusBadge(agreement.status)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Core Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agreement Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Client Name</p>
              <p className="font-medium">{agreement.clientName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Agreement Type</p>
              <p className="font-medium">{agreementTypeLabels[agreement.type] || agreement.type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Overall Status</p>
              <p className="font-medium">{agreementStatusLabels[agreement.status] || agreement.status}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Start Date</p>
              <p className="font-medium">{new Date(agreement.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Last Updated</p>
              <p className="font-medium">{new Date(agreement.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* SPOCs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assigned SPOCs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold w-24">Legal</p>
              <div className="flex-1 text-right">{getSpocDisplay(agreement.legalSpoc)}</div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold w-24">Finance</p>
              <div className="flex-1 text-right">{getSpocDisplay(agreement.financeSpoc)}</div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold w-24">Business</p>
              <div className="flex-1 text-right">{getSpocDisplay(agreement.businessSpoc)}</div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold w-24">Compliance</p>
              <div className="flex-1 text-right">{getSpocDisplay(agreement.complianceSpoc)}</div>
            </div>
          </CardContent>
        </Card>

        {/* Drafts Section */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Drafts</CardTitle>
            {user?.role === "LEGAL" && (
              <div>
                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? "Uploading..." : "Upload Draft"}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {(!agreement.drafts || agreement.drafts.length === 0) ? (
              <p className="text-sm text-muted-foreground">No drafts uploaded yet.</p>
            ) : (
              <div className="space-y-4 mt-4">
                {agreement.drafts.map((draft) => {
                  return (
                    <div 
                      key={draft.id} 
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-semibold">Version {draft.version}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Uploaded on {new Date(draft.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Link href={`/agreements/${id}/drafts/${draft.id}`}>
                          <Button size="sm">
                            View Workspace
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Global Remarks & Discussion */}
        <RemarksSection remarks={remarks} onAddRemark={handleAddRemark} />

        {/* History Timeline */}
        <HistorySection history={history} />

      </div>
    </div>
  );
}
