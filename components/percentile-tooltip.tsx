import * as Tooltip from "@radix-ui/react-tooltip";
import { useState } from "react";

interface PercentileTooltipProps {
  percentile: number;
  onTooltipOpenChange?: (isOpen: boolean) => void;
}

export function PercentileTooltip({ percentile, onTooltipOpenChange }: PercentileTooltipProps) {
  const [open, setOpen] = useState(false);
  
  if (percentile <= 25) return null;

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    onTooltipOpenChange?.(isOpen);
  };

  return (
    <Tooltip.Provider>
      <Tooltip.Root open={open} onOpenChange={handleOpenChange}>
        <Tooltip.Trigger asChild>
          <span 
            className="inline-flex items-center justify-center rounded-full text-text/70 hover:text-text transition-colors duration-200 cursor-help"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenChange(!open);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="relative p-2 text-xs bg-background text-text text-center z-50 w-48 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            sideOffset={5}
          >
            <div className="absolute -inset-[1px] border border-border -z-10">
              <div className="absolute left-1/2 bottom-0 w-3 h-3 -translate-x-1/2 translate-y-[7px] rotate-45 border-b border-r border-border bg-background" />
            </div>
            <span className="font-bold">{percentile}th percentile</span> of all recommendations
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
