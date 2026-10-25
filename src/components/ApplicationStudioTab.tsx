"use client";

import React, { useState, useEffect } from "react";
import { FullProfile } from "@/lib/validation/profile";
import { NormalizedJob } from "@/lib/discovery/types";
import { MatchEvaluation } from "@/lib/matching/matcher";
import { TailoredApplicationPackage } from "@/lib/tailoring/tailor";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  Loader2,
  Target,
  ExternalLink,
  Building,
} from "lucide-react";

interface ApplicationStudioTabProps {
  profile: FullProfile;
  initialJobId?: string | null;
}

export function ApplicationStudioTab({ profile, initialJobId }: ApplicationStudioTabProps) {
  const [availableJobs, setAvailableJobs] = useState<NormalizedJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || "");
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  // Match state
  const [isMatching, setIsMatching] = useState(false);
  const [evaluation, setEvaluation] = useState<MatchEvaluation | null>(null);

  // Tailoring state
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailoredPackage, setTailoredPackage] = useState<TailoredApplicationPackage | null>(null);
  const [tailoringError, setTailoringError] = useState<string | null>(null);

  // Active view: 'match' | 'cv' | 'cover-letter'
  const [viewMode, setViewMode] = useState<"match" | "cv" | "cover-letter">("match");

  useEffect(() => {
    let active = true;
    fetch("/api/jobs?eligibleOnly=true&limit=50")
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success && Array.isArray(data.jobs)) {
          setAvailableJobs(data.jobs);
          if (!selectedJobId && data.jobs.length > 0) {
            setSelectedJobId(data.jobs[0].urlHash);
          }
        }
      })
      .catch((err) => console.error("Failed to load jobs:", err))
      .finally(() => {
        if (active) setIsLoadingJobs(false);
      });

    return () => {
      active = false;
    };
  }, [selectedJobId]);

  const selectedJob = availableJobs.find((j) => j.urlHash === selectedJobId) || availableJobs[0];

  const handleRunMatch = async () => {
    if (!selectedJob) return;
    setIsMatching(true);
    setEvaluation(null);

    try {
      const res = await fetch("/api/matching/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJob.urlHash }),
      });
      const data = await res.json();
      if (data.success) {
        setEvaluation(data.evaluation);
      }
    } catch (err) {
      console.error("Match error:", err);
    } finally {
      setIsMatching(false);
    }
  };

  const handleGenerateTailoredCV = async () => {
    if (!selectedJob) return;
    setIsTailoring(true);
    setTailoringError(null);

    try {
      const res = await fetch("/api/tailoring/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJob.urlHash,
          careerProfileId: evaluation?.careerProfileId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setTailoringError(data.error || "Tailoring failed");
        return;
      }
      setTailoredPackage(data.package);
      setViewMode("cv");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tailoring error";
      setTailoringError(msg);
    } finally {
      setIsTailoring(false);
    }
  };

  const verifiedFactCount = [
    ...profile.experiences.flatMap((e) => e.facts),
    ...profile.projects.flatMap((p) => p.facts),
  ].filter((f) => f.isVerified).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Job Selector */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Application Studio & Truthful Tailoring
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Evaluates job fit and produces truthful tailored CVs citing verified fact IDs.
            </p>
          </div>

          {verifiedFactCount === 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300">
              Warning: You have 0 verified facts. Visit &quot;CV Import Review&quot; tab to verify facts before tailoring.
            </div>
          )}
        </div>

        {/* Job Selection Dropdown */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
            Target Job:
          </label>
          <div className="flex-1">
            {isLoadingJobs ? (
              <div className="text-xs text-zinc-400">Loading jobs...</div>
            ) : availableJobs.length === 0 ? (
              <div className="text-xs text-zinc-400">
                No eligible jobs found. Run discovery in the Job Explorer tab first.
              </div>
            ) : (
              <select
                value={selectedJob?.urlHash || ""}
                onChange={(e) => {
                  setSelectedJobId(e.target.value);
                  setEvaluation(null);
                  setTailoredPackage(null);
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {availableJobs.map((j) => (
                  <option key={j.urlHash} value={j.urlHash}>
                    {j.title} — {j.company} ({j.location})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRunMatch}
              disabled={isMatching || !selectedJob}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow"
            >
              {isMatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              {isMatching ? "Analyzing Fit..." : "Run Match Analysis"}
            </button>
            <button
              onClick={handleGenerateTailoredCV}
              disabled={isTailoring || !selectedJob || verifiedFactCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow"
            >
              {isTailoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {isTailoring ? "Tailoring..." : "Tailor Truthful CV"}
            </button>
          </div>
        </div>
      </div>

      {tailoringError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          {tailoringError}
        </div>
      )}

      {/* Selected Job Context Card */}
      {selectedJob && (
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">{selectedJob.title}</h3>
              </div>
              <p className="text-xs font-semibold text-zinc-500 mt-0.5">
                {selectedJob.company} • {selectedJob.location} • Source: {selectedJob.source.toUpperCase()}
              </p>
            </div>
            <a
              href={selectedJob.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View Original Posting
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Navigation sub-tabs */}
      {(evaluation || tailoredPackage) && (
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <button
            onClick={() => setViewMode("match")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "match"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Match Score & Analysis
          </button>
          {tailoredPackage && (
            <>
              <button
                onClick={() => setViewMode("cv")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "cv"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Tailored CV (Side-by-Side)
              </button>
              {tailoredPackage.coverLetter && (
                <button
                  onClick={() => setViewMode("cover-letter")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "cover-letter"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Cover Letter
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* VIEW 1: MATCH EVALUATION */}
      {viewMode === "match" && evaluation && (
        <div className="space-y-6">
          {/* Score & Seniority Card */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Explainable Match Score</span>
              <div className="mt-2 text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {evaluation.matchScore}<span className="text-xl text-zinc-400">/100</span>
              </div>
              <span className="mt-1 text-[11px] text-zinc-400">Not an employer ATS score</span>
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Seniority & Target Profile</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                  {evaluation.careerProfileTitle}
                </span>
              </div>
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {evaluation.seniorityFit}
              </h4>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {evaluation.explanation}
              </p>
            </div>
          </div>

          {/* Strengths & Gaps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-sm uppercase tracking-wide">Candidate Strengths</h4>
              </div>
              <ul className="space-y-2 pt-1">
                {evaluation.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-emerald-900 dark:text-emerald-200">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Gaps */}
            <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h4 className="font-bold text-sm uppercase tracking-wide">Honest Gaps & Missing Requirements</h4>
              </div>
              <ul className="space-y-2 pt-1">
                {evaluation.gaps.map((gap, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TAILORED CV (SIDE-BY-SIDE DIFF) */}
      {viewMode === "cv" && tailoredPackage && (
        <div className="space-y-6">
          {/* Verification Badge Bar */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200 flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>
                Zero-Hallucination Guard Passed: {tailoredPackage.verification.verifiedFactCount} claims grounded in verified fact IDs.
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white font-mono text-[11px]">
              VERIFIED 100%
            </span>
          </div>

          {/* Headline & Summary */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-3 shadow-sm">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tailored Professional Headline</span>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{tailoredPackage.tailoredCV.headline}</h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pt-2 border-t border-zinc-100 dark:border-zinc-800">
              {tailoredPackage.tailoredCV.summary}
            </p>

            <div className="pt-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Emphasized Verified Skills ({tailoredPackage.tailoredCV.highlightSkills.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tailoredPackage.tailoredCV.highlightSkills.map((s) => (
                  <span
                    key={s}
                    className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-300 font-semibold"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Side-by-Side: Base CV vs Tailored CV */}
          <div className="space-y-4">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Side-by-Side Comparison: Base CV Facts vs. Tailored Presentation
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Base Ground Truth Facts */}
              <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/60 dark:border-zinc-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700">
                  <span className="font-bold text-xs uppercase tracking-wider text-zinc-500">
                    Base Ground Truth Facts
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">Canonical Profile</span>
                </div>

                <div className="space-y-4">
                  {profile.experiences.map((exp) => (
                    <div key={exp.id} className="space-y-2">
                      <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{exp.company}</div>
                      <div className="space-y-2">
                        {exp.facts.map((f) => (
                          <div
                            key={f.id}
                            className="p-3 rounded-xl bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300"
                          >
                            <span className="font-mono text-[10px] text-blue-600 block mb-1">[{f.id}]</span>
                            {f.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Tailored CV Presentation */}
              <div className="p-6 rounded-2xl bg-white border border-blue-200 dark:bg-zinc-900 dark:border-blue-900/60 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="font-bold text-xs uppercase tracking-wider text-blue-600">
                    Tailored CV Bullets (Citing Fact IDs)
                  </span>
                  <span className="text-[11px] font-mono text-emerald-600 font-bold">100% Traceable</span>
                </div>

                <div className="space-y-4">
                  {tailoredPackage.tailoredCV.experiences.map((exp, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{exp.company}</div>
                      <div className="space-y-2">
                        {exp.bullets.map((b, bIdx) => (
                          <div
                            key={bIdx}
                            className="p-3 rounded-xl bg-blue-50/40 border border-blue-200/80 dark:bg-zinc-800 dark:border-blue-900/60 text-xs text-zinc-800 dark:text-zinc-200 space-y-1.5"
                          >
                            <p className="leading-relaxed font-medium">{b.text}</p>
                            <div className="flex flex-wrap gap-1">
                              {b.citedFactIds.map((fid) => (
                                <span
                                  key={fid}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold"
                                >
                                  ✓ cites {fid}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: GROUNDED COVER LETTER */}
      {viewMode === "cover-letter" && tailoredPackage?.coverLetter && (
        <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-4 shadow-sm max-w-3xl">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Grounded Cover Letter</h3>
              <p className="text-xs text-zinc-500">Addressed to {selectedJob?.company} for {selectedJob?.title}</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 font-mono">
              Ready for Review
            </span>
          </div>

          <div className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line font-serif">
            {tailoredPackage.coverLetter}
          </div>
        </div>
      )}
    </div>
  );
}
