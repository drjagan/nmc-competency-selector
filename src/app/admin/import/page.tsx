"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ImportResult } from "@/types";

export default function ImportPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
    setImportResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    setImportResult(null);

    const formData = new FormData();
    Array.from(selectedFiles).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result: ImportResult = await response.json();
        setImportResult(result);
      } else {
        const errorData = await response.json();
        setImportResult({
          success: false,
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: [{ row: 0, error: errorData.error || "Import failed" }],
        });
      }
    } catch (error) {
      setImportResult({
        success: false,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, error: error instanceof Error ? error.message : "Import failed" }],
      });
    } finally {
      setIsUploading(false);
      setSelectedFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const totalProcessed = importResult
    ? importResult.inserted + importResult.updated + importResult.skipped
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Import</h1>
        <p className="text-muted-foreground">
          Import competencies from Excel files
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Excel Files
            </CardTitle>
            <CardDescription>
              Select one or more Excel files (.xlsx, .xls) to import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Click to select files or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                Supports .xlsx and .xls files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {selectedFiles && selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {selectedFiles.length} file(s) selected:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {Array.from(selectedFiles).map((file, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!selectedFiles || selectedFiles.length === 0 || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Start Import
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Expected Format</CardTitle>
            <CardDescription>
              Your Excel files should match the NMC competency format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Required columns:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Competency Code (e.g., AN1.1, PY2.3)</li>
                <li>• Competency Text/Description</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Optional columns:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Topic Name</li>
                <li>• Domain (K/S/A/KS/KSA)</li>
                <li>• Level (1-4)</li>
                <li>• Core (Yes/No)</li>
                <li>• Teaching Methods</li>
                <li>• Assessment Methods</li>
                <li>• Integrations</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">File naming:</p>
              <p className="text-sm text-muted-foreground">
                Name files with subject code prefix for automatic subject mapping:
                <br />
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  AN_Anatomy.xlsx, PY_Physiology.xlsx
                </code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Card */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Import Complete
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Import Failed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {importResult.success && (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {importResult.inserted}
                    </p>
                    <p className="text-sm text-muted-foreground">Inserted</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {importResult.updated}
                    </p>
                    <p className="text-sm text-muted-foreground">Updated</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {importResult.skipped}
                    </p>
                    <p className="text-sm text-muted-foreground">Skipped</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{totalProcessed}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>
                <Progress
                  value={
                    totalProcessed > 0
                      ? ((importResult.inserted + importResult.updated) / totalProcessed) * 100
                      : 0
                  }
                  className="h-2"
                />
              </>
            )}

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  Errors ({importResult.errors.length}):
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      {err.row > 0 ? `Row ${err.row}: ` : ""}{err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
