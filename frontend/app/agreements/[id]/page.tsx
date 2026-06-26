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

export default function AgreementDetailsPage() {
  const { id } = useParams() as { id: string };
  const { user, token } = useAuth();
  const router = useRouter();

  const [agreement, setAgreement] = useState<AgreementDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchAgreement();
  }, [fetchAgreement]);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      fetchAgreement();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getSpocDisplay = (spoc: Spoc | null) => {
    return spoc ? (
      <div>
        <p className="text-sm font-medium">{spoc.name}</p>
        <p className="text-xs text-muted-foreground">{spoc.email}</p>
      </div>
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
        <Button variant="outline" onClick={fetchAgreement}>Retry</Button>
      </div>
    );
  }

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
              <Badge variant="outline">{agreement.type}</Badge>
              <span className="text-gray-400">•</span>
              <Badge variant="secondary">{agreement.status}</Badge>
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
              <p className="font-medium">{agreement.type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Overall Status</p>
              <p className="font-medium">{agreement.status}</p>
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
