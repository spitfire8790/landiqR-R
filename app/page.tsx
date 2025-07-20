import type { Metadata } from "next";
import Dashboard from "@/components/dashboard";
import ProtectedRoute from "@/components/protected-route";

import { BRAND_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${BRAND_NAME} - Roles and Responsibilities`,
  description: `Allocate program based responsibilities for ${BRAND_NAME} digital project`,
};

// This disables static generation for this page
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <ProtectedRoute>
      <div className="h-screen w-full overflow-hidden">
        <Dashboard />
      </div>
    </ProtectedRoute>
  );
}
