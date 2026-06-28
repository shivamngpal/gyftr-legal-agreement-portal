"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/utils";

const TEST_USERS = [
  { label: "Legal", email: "legal@gyftr.com" },
  { label: "Finance", email: "finance@gyftr.com" },
  { label: "Business", email: "business@gyftr.com" },
  { label: "Compliance", email: "compliance@gyftr.com" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const doLogin = async (e: string, p: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin(email, password);
  };

  const handleQuickLogin = async (testEmail: string) => {
    setEmail(testEmail);
    setPassword("password123");
    await doLogin(testEmail, "password123");
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="w-[380px]">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Gyftr Legal Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
        </div>
        <Card>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4 pt-6">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@gyftr.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              <div className="w-full space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs text-muted-foreground">Test accounts</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TEST_USERS.map(({ label, email: testEmail }) => (
                    <Button
                      key={testEmail}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={loading}
                      onClick={() => handleQuickLogin(testEmail)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  password: <span className="font-mono">password123</span>
                </p>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
