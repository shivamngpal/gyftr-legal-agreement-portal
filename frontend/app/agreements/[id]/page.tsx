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
  reviewStatuses: ReviewStatus[];
}

export default function AgreementDetailsPage() {
  const { id } = useParams() as { id: string };
  const { token } = useAuth();
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

  const getTeamStatusBadge = (statuses: ReviewStatus[], team: string) => {
    const status = statuses.find((s) => s.team === team)?.status || "N/A";
    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
    if (status === "APPROVED") badgeVariant = "default";
    if (status === "REJECTED") badgeVariant = "destructive";
    if (status === "PENDING") badgeVariant = "secondary";
    if (status === "UNDER_REVIEW") badgeVariant = "outline";
    return <Badge variant={badgeVariant}>{status}</Badge>;
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

        {/* Review Statuses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Review Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Legal Review</p>
              {getTeamStatusBadge(agreement.reviewStatuses, "LEGAL")}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Finance Review</p>
              {getTeamStatusBadge(agreement.reviewStatuses, "FINANCE")}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Business Review</p>
              {getTeamStatusBadge(agreement.reviewStatuses, "BUSINESS")}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Compliance Review</p>
              {getTeamStatusBadge(agreement.reviewStatuses, "COMPLIANCE")}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-bold tracking-tight mb-4">Workspace Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <PlaceholderCard title="Remarks" />
          <PlaceholderCard title="History" />
          <PlaceholderCard title="Drafts" />
          <PlaceholderCard title="Clause Analysis" />
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
