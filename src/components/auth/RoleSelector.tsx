/**
 * RoleSelector component - Visually selectable role options
 * Provides accessible radio card selection for photographer or enthusiast roles
 */

import { Camera, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { UserRole } from "@/types";

interface RoleSelectorProps {
  value: UserRole | null;
  onChange: (role: UserRole) => void;
  error?: string;
}

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const roleOptions: RoleOption[] = [
  {
    value: "photographer",
    label: "Photographer",
    description: "Share your photography spots and build your portfolio",
    icon: Camera,
  },
  {
    value: "enthusiast",
    label: "Enthusiast",
    description: "Discover amazing photo locations from other photographers",
    icon: Heart,
  },
];

export function RoleSelector({ value, onChange, error }: RoleSelectorProps) {
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = currentIndex === 0 ? roleOptions.length - 1 : currentIndex - 1;
      onChange(roleOptions[prevIndex].value);
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = currentIndex === roleOptions.length - 1 ? 0 : currentIndex + 1;
      onChange(roleOptions[nextIndex].value);
    }
  };

  return (
    <div role="radiogroup" aria-labelledby="role-selector-label" aria-required="true">
      <label
        id="role-selector-label"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        I am a
      </label>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {roleOptions.map((option, index) => {
          const isSelected = value === option.value;
          const Icon = option.icon;

          return (
            <Card
              key={option.value}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                isSelected ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border"
              }`}
              onClick={() => onChange(option.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold leading-none">{option.label}</h3>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                {isSelected && (
                  <div className="shrink-0">
                    <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                      <div className="size-2 rounded-full bg-primary-foreground" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
