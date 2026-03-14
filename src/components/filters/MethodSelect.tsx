"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MethodSelectProps {
  type: "teaching" | "assessment";
  selected: string[];
  onChange: (selected: string[]) => void;
  version?: string;
  className?: string;
}

export function MethodSelect({
  type,
  selected,
  onChange,
  version,
  className,
}: MethodSelectProps) {
  const [methods, setMethods] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch methods from API
  useEffect(() => {
    const url = `/api/competencies/methods?type=${type}${version ? `&version=${version}` : ""}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setMethods(data.methods || []))
      .catch(console.error);
  }, [type, version]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleMethod = (method: string) => {
    if (selected.includes(method)) {
      onChange(selected.filter((m) => m !== method));
    } else {
      onChange([...selected, method]);
    }
  };

  const label = type === "teaching" ? "Teaching Method" : "Assessment Method";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-xs h-8"
      >
        <span className="truncate">
          {selected.length > 0
            ? `${label} (${selected.length})`
            : label}
        </span>
        <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.map((method) => (
            <Badge
              key={method}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 gap-1 cursor-pointer"
              onClick={() => toggleMethod(method)}
            >
              {method}
              <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
          {methods.map((method) => {
            const isChecked = selected.includes(method);
            return (
              <button
                key={method}
                onClick={() => toggleMethod(method)}
                className={cn(
                  "w-full px-2 py-1.5 text-left text-xs flex items-center gap-2",
                  "hover:bg-accent hover:text-accent-foreground",
                  isChecked && "bg-accent/50"
                )}
              >
                <div
                  className={cn(
                    "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0",
                    isChecked
                      ? "bg-primary border-primary"
                      : "border-input"
                  )}
                >
                  {isChecked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
                {method}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
