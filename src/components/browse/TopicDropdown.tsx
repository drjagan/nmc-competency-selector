"use client";

import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Topic } from "@/types";

interface TopicDropdownProps {
  topics: Topic[];
  selectedTopic: number | null;
  onSelect: (topicId: number | null) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function TopicDropdown({
  topics,
  selectedTopic,
  onSelect,
  disabled,
  isLoading,
}: TopicDropdownProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground">Topic</label>
      <Select
        value={selectedTopic?.toString() || ""}
        onValueChange={(value) => onSelect(value ? parseInt(value) : null)}
        disabled={disabled}
      >
        <SelectTrigger>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading topics...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select a topic..." />
          )}
        </SelectTrigger>
        <SelectContent>
          {topics.map((topic) => (
            <SelectItem key={topic.id} value={topic.id.toString()}>
              {topic.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
