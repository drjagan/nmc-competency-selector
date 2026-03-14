"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Domain color mapping
const DOMAIN_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  K: { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", label: "Knowledge" },
  S: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300", label: "Skill" },
  A: { bg: "bg-amber-100 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", label: "Attitude" },
};

interface CompetencyBadgesProps {
  domain?: string;
  level?: string;
  isCore?: boolean;
  compact?: boolean;
  className?: string;
}

export function CompetencyBadges({
  domain,
  level,
  isCore,
  compact = false,
  className,
}: CompetencyBadgesProps) {
  const badgeSize = compact ? "text-[9px] px-1 py-0" : "text-[10px] px-1.5 py-0";

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {/* Domain badges — split K/S/A into individual badges */}
      {domain &&
        domain.split("/").map((d) => {
          const trimmed = d.trim();
          const colors = DOMAIN_COLORS[trimmed];
          if (!colors) return null;
          return (
            <Badge
              key={trimmed}
              className={cn(badgeSize, colors.bg, colors.text, "border-0 font-medium")}
              title={colors.label}
            >
              {trimmed}
            </Badge>
          );
        })}

      {/* Level badge */}
      {level && (
        <Badge variant="outline" className={cn(badgeSize, "font-normal")}>
          {level}
        </Badge>
      )}

      {/* Core badge */}
      {isCore && (
        <Badge
          variant="secondary"
          className={cn(
            badgeSize,
            "border-primary/50 bg-primary/10 text-primary font-medium"
          )}
        >
          Core
        </Badge>
      )}
    </div>
  );
}

/**
 * Render teaching or assessment methods as pill tags
 */
interface MethodPillsProps {
  methods?: string;
  type: "teaching" | "assessment";
  className?: string;
}

export function MethodPills({ methods, type, className }: MethodPillsProps) {
  if (!methods) return null;

  const items = methods.split(",").map((m) => m.trim()).filter(Boolean);
  if (items.length === 0) return null;

  const pillColor =
    type === "teaching"
      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      : "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300";

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
            pillColor
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
