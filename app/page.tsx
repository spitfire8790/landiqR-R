import type { Metadata } from "next"
import Dashboard from "@/components/dashboard"

export const metadata: Metadata = {
  title: "Land iQ - Responsibility Allocation",
  description: "Allocate program based responsibilities for Land iQ digital project",
}

// This disables static generation for this page
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <Dashboard />
    </div>
  )
}
