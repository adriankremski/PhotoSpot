/**
 * PasswordRulesTooltip component
 * Displays password requirements in a tooltip
 */

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export function PasswordRulesTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className="inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Password requirements"
        >
          <Info className="size-4" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Password requirements:</p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>At least 8 characters long</li>
              <li>Contains at least one letter (A-Z or a-z)</li>
              <li>Contains at least one number (0-9)</li>
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
