"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import HowToUseModal from "@/components/how-to-use-modal";

export default function HowToUseButton() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setModalOpen(true)}
        variant="outline"
        size="sm"
        className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 transition-colors"
      >
        <HelpCircle className="mr-2 h-4 w-4" />
        How to Use
      </Button>
      
      <HowToUseModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
      />
    </>
  );
}
