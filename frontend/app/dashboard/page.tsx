import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to the Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Dashboard coming in next task.</p>
        </CardContent>
      </Card>
    </div>
  );
}
