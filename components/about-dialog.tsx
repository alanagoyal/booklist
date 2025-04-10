"use client";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import About from "./about";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6" aria-describedby="about-description">
        <DialogTitle asChild>
          <VisuallyHidden>About</VisuallyHidden>
        </DialogTitle>
        <DialogDescription id="about-description" asChild>
          <About />
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
