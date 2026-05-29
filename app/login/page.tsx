"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStatus } from "@/hooks/usePortfolio";

export default function LoginPage() {
  const router = useRouter();
  const { data: authStatus } = useAuthStatus();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authStatus?.authenticated) {
      router.push("/dashboard");
    }
  }, [authStatus, router]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const { login_url } = await api.auth.login();
      window.location.href = login_url;
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
      <div className="bg-bg-primary border border-border-default rounded-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium text-text-primary mb-2">
            Portfolio
          </h1>
          <p className="text-text-secondary text-sm">
            Connect your Zerodha account to view your portfolio
          </p>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-accent-blue text-white py-3 px-4 rounded-lg font-medium transition-colors hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Connecting..." : "Connect with Zerodha Kite"}
        </button>

        <p className="text-xs text-text-muted text-center mt-6">
          You will be redirected to Zerodha Kite to authorize access
        </p>
      </div>
    </div>
  );
}

// Made with Bob
