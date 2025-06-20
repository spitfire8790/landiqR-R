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
        className="bg-white-600 text-black border-black hover:bg-black hover:text-white hover:border-black transition-colors"
      >
        <HelpCircle className="mr-2 h-4 w-4" />
        How to Use
      </Button>

      <HowToUseModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
