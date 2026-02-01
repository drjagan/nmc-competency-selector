"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CompetencyWithDetails, Subject, Topic } from "@/types";

interface CompetencyFormProps {
  competency?: CompetencyWithDetails | null;
  subjects: Subject[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function CompetencyForm({
  competency,
  subjects,
  onSuccess,
  onCancel,
}: CompetencyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  const [formData, setFormData] = useState({
    competency_code: competency?.competency_code || "",
    topic_id: competency?.topic_id?.toString() || "",
    subject_id: "",
    competency_text: competency?.competency_text || "",
    domain: competency?.domain || "",
    competency_level: competency?.competency_level || "",
    is_core: competency?.is_core || false,
    teaching_methods: competency?.teaching_methods || "",
    assessment_methods: competency?.assessment_methods || "",
    integrations: competency?.integrations || "",
  });

  // Find the subject for an existing competency
  useEffect(() => {
    if (competency) {
      const subject = subjects.find(s => s.code === competency.subject_code);
      if (subject) {
        setFormData(prev => ({ ...prev, subject_id: subject.id.toString() }));
      }
    }
  }, [competency, subjects]);

  // Load topics when subject changes
  useEffect(() => {
    async function loadTopics() {
      if (!formData.subject_id) {
        setTopics([]);
        return;
      }

      setIsLoadingTopics(true);
      try {
        const response = await fetch(`/api/subjects/${formData.subject_id}/topics`);
        if (response.ok) {
          const data = await response.json();
          setTopics(data);
        }
      } catch (error) {
        console.error("Failed to load topics:", error);
      } finally {
        setIsLoadingTopics(false);
      }
    }
    loadTopics();
  }, [formData.subject_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = competency
        ? `/api/admin/competencies/${competency.id}`
        : "/api/admin/competencies";
      const method = competency ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competency_code: formData.competency_code,
          topic_id: parseInt(formData.topic_id),
          competency_text: formData.competency_text,
          domain: formData.domain || null,
          competency_level: formData.competency_level || null,
          is_core: formData.is_core,
          teaching_methods: formData.teaching_methods || null,
          assessment_methods: formData.assessment_methods || null,
          integrations: formData.integrations || null,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save competency");
      }
    } catch (error) {
      console.error("Failed to save competency:", error);
      alert("Failed to save competency");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Competency Code */}
        <div className="space-y-2">
          <Label htmlFor="competency_code">Competency Code *</Label>
          <Input
            id="competency_code"
            value={formData.competency_code}
            onChange={(e) =>
              setFormData({ ...formData, competency_code: e.target.value })
            }
            placeholder="e.g., AN1.1"
            required
          />
        </div>

        {/* Domain */}
        <div className="space-y-2">
          <Label htmlFor="domain">Domain</Label>
          <Select
            value={formData.domain}
            onValueChange={(value) => setFormData({ ...formData, domain: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="K">Knowledge (K)</SelectItem>
              <SelectItem value="S">Skill (S)</SelectItem>
              <SelectItem value="A">Attitude (A)</SelectItem>
              <SelectItem value="KS">Knowledge & Skill (KS)</SelectItem>
              <SelectItem value="KA">Knowledge & Attitude (KA)</SelectItem>
              <SelectItem value="SA">Skill & Attitude (SA)</SelectItem>
              <SelectItem value="KSA">All Domains (KSA)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="subject">Subject *</Label>
          <Select
            value={formData.subject_id}
            onValueChange={(value) => {
              setFormData({ ...formData, subject_id: value, topic_id: "" });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id.toString()}>
                  {subject.code} - {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Topic */}
        <div className="space-y-2">
          <Label htmlFor="topic">Topic *</Label>
          <Select
            value={formData.topic_id}
            onValueChange={(value) => setFormData({ ...formData, topic_id: value })}
            disabled={!formData.subject_id || isLoadingTopics}
          >
            <SelectTrigger>
              {isLoadingTopics ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder="Select topic" />
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
      </div>

      {/* Competency Text */}
      <div className="space-y-2">
        <Label htmlFor="competency_text">Competency Text *</Label>
        <Textarea
          id="competency_text"
          value={formData.competency_text}
          onChange={(e) =>
            setFormData({ ...formData, competency_text: e.target.value })
          }
          placeholder="Describe the competency..."
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Level */}
        <div className="space-y-2">
          <Label htmlFor="competency_level">Competency Level</Label>
          <Select
            value={formData.competency_level}
            onValueChange={(value) =>
              setFormData({ ...formData, competency_level: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Level 1 - Know</SelectItem>
              <SelectItem value="2">Level 2 - Know How</SelectItem>
              <SelectItem value="3">Level 3 - Show How</SelectItem>
              <SelectItem value="4">Level 4 - Do</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Core Competency */}
        <div className="space-y-2">
          <Label>Core Competency</Label>
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="is_core"
              checked={formData.is_core}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_core: checked === true })
              }
            />
            <label
              htmlFor="is_core"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Mark as core competency
            </label>
          </div>
        </div>
      </div>

      {/* Teaching Methods */}
      <div className="space-y-2">
        <Label htmlFor="teaching_methods">Teaching Methods</Label>
        <Textarea
          id="teaching_methods"
          value={formData.teaching_methods}
          onChange={(e) =>
            setFormData({ ...formData, teaching_methods: e.target.value })
          }
          placeholder="Lecture, Small group discussion, etc."
          rows={2}
        />
      </div>

      {/* Assessment Methods */}
      <div className="space-y-2">
        <Label htmlFor="assessment_methods">Assessment Methods</Label>
        <Textarea
          id="assessment_methods"
          value={formData.assessment_methods}
          onChange={(e) =>
            setFormData({ ...formData, assessment_methods: e.target.value })
          }
          placeholder="Written exam, OSCE, etc."
          rows={2}
        />
      </div>

      {/* Integrations */}
      <div className="space-y-2">
        <Label htmlFor="integrations">Integrations</Label>
        <Textarea
          id="integrations"
          value={formData.integrations}
          onChange={(e) =>
            setFormData({ ...formData, integrations: e.target.value })
          }
          placeholder="Horizontal/vertical integrations with other subjects..."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : competency ? (
            "Update Competency"
          ) : (
            "Create Competency"
          )}
        </Button>
      </div>
    </form>
  );
}
