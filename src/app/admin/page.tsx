"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, ChevronLeft, ChevronRight, Trash2, Edit, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompetencyForm } from "@/components/admin/CompetencyForm";
import { useDebounce } from "@/hooks/useDebounce";
import type { CompetencyWithDetails, Subject } from "@/types";

interface PaginatedResponse {
  competencies: CompetencyWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminPage() {
  const [competencies, setCompetencies] = useState<CompetencyWithDetails[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<CompetencyWithDetails | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingCompetency, setDeletingCompetency] = useState<CompetencyWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch subjects
  useEffect(() => {
    async function fetchSubjects() {
      try {
        const response = await fetch("/api/subjects");
        if (response.ok) {
          const data = await response.json();
          setSubjects(data);
        }
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      }
    }
    fetchSubjects();
  }, []);

  // Fetch competencies
  const fetchCompetencies = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }
      if (selectedSubject && selectedSubject !== "all") {
        params.append("subjectId", selectedSubject);
      }

      const response = await fetch(`/api/admin/competencies?${params}`);
      if (response.ok) {
        const data: PaginatedResponse = await response.json();
        setCompetencies(data.competencies);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch competencies:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, selectedSubject]);

  useEffect(() => {
    fetchCompetencies();
  }, [fetchCompetencies]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedSubject]);

  const handleEdit = (competency: CompetencyWithDetails) => {
    setEditingCompetency(competency);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCompetency) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/competencies/${deletingCompetency.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchCompetencies();
        setIsDeleteDialogOpen(false);
        setDeletingCompetency(null);
      }
    } catch (error) {
      console.error("Failed to delete competency:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingCompetency(null);
  };

  const handleFormSuccess = () => {
    fetchCompetencies();
    handleFormClose();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Competencies</h1>
          <p className="text-muted-foreground">
            Manage NMC competencies ({total.toLocaleString()} total)
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Competency
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search competencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id.toString()}>
                {subject.code} - {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Competency</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Subject</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Topic</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Domain</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Core</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : competencies.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No competencies found
                </td>
              </tr>
            ) : (
              competencies.map((competency) => (
                <tr key={competency.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-medium text-primary">
                      {competency.competency_code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm line-clamp-2 max-w-md">
                      {competency.competency_text}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {competency.subject_code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground line-clamp-1 max-w-32">
                      {competency.topic_name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {competency.domain && (
                      <Badge variant="outline" className="text-xs">
                        {competency.domain}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {competency.is_core && (
                      <Badge variant="default" className="text-xs">
                        Core
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(competency)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingCompetency(competency);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCompetency ? "Edit Competency" : "Add Competency"}
            </DialogTitle>
            <DialogDescription>
              {editingCompetency
                ? `Editing ${editingCompetency.competency_code}`
                : "Create a new competency entry"}
            </DialogDescription>
          </DialogHeader>
          <CompetencyForm
            competency={editingCompetency}
            subjects={subjects}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Competency</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-mono font-semibold">
                {deletingCompetency?.competency_code}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
