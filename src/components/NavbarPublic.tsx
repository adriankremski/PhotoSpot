/**
 * Public navigation bar for unauthenticated users
 * Displays logo and links to Register and PRD
 */

import { Button } from "@/components/ui/button";

export function NavbarPublic() {
  return (
    <header className="border-b bg-background">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <a
          href="/"
          className="text-2xl font-bold text-foreground hover:text-foreground/80 transition-colors"
          aria-label="PhotoSpot Home"
        >
          PhotoSpot
        </a>

        <ul className="flex items-center gap-4">
          <li>
            <Button variant="ghost" asChild>
              <a href="/register">Register</a>
            </Button>
          </li>
          <li>
            <Button variant="outline" asChild>
              <a
                href="/.ai/prd.md"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View Product Requirements Document"
              >
                PRD
              </a>
            </Button>
          </li>
        </ul>
      </nav>
    </header>
  );
}
