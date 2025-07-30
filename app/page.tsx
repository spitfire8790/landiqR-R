import type { Metadata } from "next";
import dynamic from "next/dynamic";
import ProtectedRoute from "@/components/auth/protected-route";

import { BRAND_NAME } from "@/lib/constants";

// Lazy load the Dashboard component
const Dashboard = dynamic(() => import("@/components/dashboard"), {
  loading: () => (
    <div className="h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ),
});

export const metadata: Metadata = {
  title: `${BRAND_NAME} - Roles and Responsibilities`,
  description: `Allocate program based responsibilities for ${BRAND_NAME} digital project`,
};

export default function Home() {
  return (
    <ProtectedRoute>
      <div className="h-screen w-full overflow-hidden">
        <Dashboard />
      </div>
    </ProtectedRoute>
  );
}
