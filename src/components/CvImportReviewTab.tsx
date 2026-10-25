"use client";

import React, { useState } from "react";
import { FullProfile } from "@/lib/validation/profile";
import { ShieldCheck, CheckCircle2, AlertCircle, FileText, Check } from "lucide-react";

interface CvImportReviewTabProps {
  profile: FullProfile;
  onVerifyFact: (factId: string, isVerified: boolean) => Promise<void>;
  onVerifyAll: () => Promise<void>;
}

export function CvImportReviewTab({
  profile,
  onVerifyFact,
  onVerifyAll,
}: CvImportReviewTabProps) {
  const [filterMode, setFilterMode] = useState<"all" | "unverified" | "verified">("all");
  const [loadingFactId, setLoadingFactId] = useState<string | null>(null);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);

  // Group facts by parent section (Experience vs Projects)
  const experienceFacts = profile.experiences.flatMap((e) =>
    e.facts.map((f) => ({ ...f, parentTitle: `${e.company} — ${e.role}` }))
  );
  const projectFacts = profile.projects.flatMap((p) =>
    p.facts.map((f) => ({ ...f, parentTitle: `Project: ${p.name}` }))
  );

  const allImportedFacts = [...experienceFacts, ...projectFacts];
  const unverifiedCount = allImportedFacts.filter((f) => !f.isVerified).length;
  const verifiedCount = allImportedFacts.filter((f) => f.isVerified).length;

  const displayedFacts = allImportedFacts.filter((f) => {
    if (filterMode === "unverified") return !f.isVerified;
    if (filterMode === "verified") return f.isVerified;
    return true;
  });

  const handleToggle = async (factId: string, currentVerified: boolean) => {
    setLoadingFactId(factId);
    try {
      await onVerifyFact(factId, !currentVerified);
    } finally {
      setLoadingFactId(null);
    }
  };

  const handleVerifyAll = async () => {
    setIsVerifyingAll(true);
    try {
      await onVerifyAll();
    } finally {
      setIsVerifyingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                CV Import Fact Verification Portal
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Source: <span className="font-semibold text-zinc-700 dark:text-zinc-300">HHH Fonseka - Associate Software Engineer - 2026.pdf</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {unverifiedCount > 0 && (
              <button
                onClick={handleVerifyAll}
                disabled={isVerifyingAll}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow"
              >
                <Check className="w-4 h-4" />
                {isVerifyingAll ? "Verifying..." : `Verify All (${unverifiedCount})`}
              </button>
            )}
          </div>
        </div>

        {/* Security Rule Notice */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-900 dark:bg-blue-950/30 dark:border-blue-900/60 dark:text-blue-200 text-xs leading-relaxed flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>Zero-Hallucination Policy:</strong> Every bullet generated for a job application must strictly cite verified fact IDs. Unverified facts cannot be used in tailored CVs.
          </span>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Filter:</span>
            <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
              <button
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  filterMode === "all"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                All ({allImportedFacts.length})
              </button>
              <button
                onClick={() => setFilterMode("unverified")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  filterMode === "unverified"
                    ? "bg-amber-100 text-amber-900 shadow-sm dark:bg-amber-900/60 dark:text-amber-200"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                Unverified ({unverifiedCount})
              </button>
              <button
                onClick={() => setFilterMode("verified")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  filterMode === "verified"
                    ? "bg-emerald-100 text-emerald-900 shadow-sm dark:bg-emerald-900/60 dark:text-emerald-200"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                Verified ({verifiedCount})
              </button>
            </div>
          </div>
          <span className="text-xs text-zinc-400">
            Showing {displayedFacts.length} facts
          </span>
        </div>
      </div>

      {/* Facts List */}
      <div className="space-y-3">
        {displayedFacts.map((fact) => {
          const isLoading = loadingFactId === fact.id;
          return (
            <div
              key={fact.id}
              className={`p-5 rounded-2xl border transition-all ${
                fact.isVerified
                  ? "bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm"
                  : "bg-amber-50/40 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 font-semibold">
                      {fact.id}
                    </span>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      from {fact.parentTitle}
                    </span>
                    {fact.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified Fact
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                        <AlertCircle className="w-3 h-3" />
                        Pending Verification
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                    {fact.text}
                  </p>

                  {fact.evidence && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                      Evidence / Context: {fact.evidence}
                    </p>
                  )}

                  {/* Skills Tagged */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-zinc-400 font-medium">Linked skills:</span>
                    {fact.skillIds.map((sid) => (
                      <span
                        key={sid}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900"
                      >
                        {sid}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(fact.id, fact.isVerified)}
                    disabled={isLoading}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-sm ${
                      fact.isVerified
                        ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {fact.isVerified ? (
                      <>Revoke</>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Verify Fact
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
