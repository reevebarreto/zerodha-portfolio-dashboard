"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // The backend handles the OAuth callback and redirects here
    // Just redirect to dashboard
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
        <p className="text-text-secondary">Authenticating...</p>
      </div>
    </div>
  );
}

// Made with Bob
