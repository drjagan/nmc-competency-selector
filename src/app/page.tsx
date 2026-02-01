"use client";

import { useState } from "react";
import { CompetencySelector } from "@/components/CompetencySelector";
import type { CompetencyTag } from "@/types";

export default function Home() {
  const [selectedCompetencies, setSelectedCompetencies] = useState<CompetencyTag[]>([]);

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">NMC Competency Selector</h1>
          <p className="mt-2 text-muted-foreground">
            Search and select competencies from India&apos;s National Medical Commission curriculum
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <CompetencySelector
            value={selectedCompetencies}
            onChange={setSelectedCompetencies}
            multiple={true}
            placeholder="Search for competencies..."
          />
        </div>

        {selectedCompetencies.length > 0 && (
          <div className="mt-8 rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Selected Competencies ({selectedCompetencies.length})
            </h2>
            <div className="space-y-2">
              {selectedCompetencies.map((comp) => (
                <div
                  key={comp.code}
                  className="rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-primary">
                      {comp.code}
                    </span>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      {comp.subjectName}
                    </span>
                    {comp.isCore && (
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Core
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-muted-foreground">{comp.text}</p>
                  <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                    <span>Topic: {comp.topicName}</span>
                    {comp.domain && (
                      <>
                        <span>|</span>
                        <span>Domain: {comp.domain}</span>
                      </>
                    )}
                    {comp.level && !['true', 'false', ''].includes(comp.level) && (
                      <>
                        <span>|</span>
                        <span>Level: {comp.level}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Built for Medical Education by Academe CBME
          </p>
        </div>
      </div>
    </main>
  );
}
