import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AgreementDetailsPage() {
  return (
    <div className="flex h-screen bg-gray-50 flex-col">
      <header className="h-16 bg-white border-b flex items-center px-8 shadow-sm justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Agreement Details</h1>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </header>
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Work in Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Agreement Details will be implemented in the next phase.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
