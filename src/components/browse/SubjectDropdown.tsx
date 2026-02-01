"use client";

import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Subject } from "@/types";

interface SubjectDropdownProps {
  subjects: Subject[];
  selectedSubject: number | null;
  onSelect: (subjectId: number | null) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function SubjectDropdown({
  subjects,
  selectedSubject,
  onSelect,
  disabled,
  isLoading,
}: SubjectDropdownProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground">Subject</label>
      <Select
        value={selectedSubject?.toString() || ""}
        onValueChange={(value) => onSelect(value ? parseInt(value) : null)}
        disabled={disabled}
      >
        <SelectTrigger>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading subjects...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select a subject..." />
          )}
        </SelectTrigger>
        <SelectContent>
          {subjects.map((subject) => (
            <SelectItem key={subject.id} value={subject.id.toString()}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">
                  {subject.code}
                </span>
                <span>{subject.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
