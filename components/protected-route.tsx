"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Set a maximum loading time to prevent infinite hanging (disabled)
  // useEffect(() => {
  //   if (isLoading) {
  //     const timer = setTimeout(() => {
  //       setMaxLoadingTime(true);
  //     }, 30000); // 30 seconds max loading time

  //     return () => clearTimeout(timer);
  //   } else {
  //     setMaxLoadingTime(false);
  //   }
  // }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg animate-pulse mb-4 mx-auto"></div>
          <div className="w-48 h-6 bg-gray-200 rounded animate-pulse mb-2 mx-auto"></div>
          <div className="w-32 h-4 bg-gray-200 rounded animate-pulse mx-auto"></div>
        </div>
      </div>
    );
  }

  // Timeout warning removed per user request

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
