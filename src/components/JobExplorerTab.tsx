"use client";

import React, { useState, useEffect, useCallback } from "react";
import { NormalizedJob } from "@/lib/discovery/types";
import {
  Compass,
  Search,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Plus,
  X,
  FileText,
  DollarSign,
} from "lucide-react";

interface JobExplorerTabProps {
  onOpenInStudio?: (jobId: string) => void;
}

export function JobExplorerTab({ onOpenInStudio }: JobExplorerTabProps) {
  const [jobs, setJobs] = useState<NormalizedJob[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [eligibleOnly, setEligibleOnly] = useState<boolean>(true);
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");

  // Inspection modal
  const [inspectingJob, setInspectingJob] = useState<NormalizedJob | null>(null);

  // Manual Import modal
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualUrl, setManualUrl] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualLocation, setManualLocation] = useState("Remote (Worldwide)");
  const [manualDescription, setManualDescription] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const reloadJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (eligibleOnly) params.append("eligibleOnly", "true");
      if (selectedWorkMode !== "all") params.append("workMode", selectedWorkMode);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    }
  }, [eligibleOnly, selectedWorkMode, searchQuery]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (eligibleOnly) params.append("eligibleOnly", "true");
    if (selectedWorkMode !== "all") params.append("workMode", selectedWorkMode);
    if (searchQuery.trim()) params.append("search", searchQuery.trim());

    fetch(`/api/jobs?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success) {
          setJobs(data.jobs || []);
        }
      })
      .catch((err) => console.error("Failed to fetch jobs:", err))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [eligibleOnly, selectedWorkMode, searchQuery]);

  const handleRunDiscovery = async () => {
    setIsDiscovering(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: selectedSource !== "all" ? selectedSource : undefined }),
      });
      const data = await res.json();
      if (data.success) {
        await reloadJobs();
      }
    } catch (err) {
      console.error("Discovery trigger failed:", err);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleManualImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsImporting(true);
    setImportError(null);

    try {
      const res = await fetch("/api/jobs/manual-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: manualUrl,
          title: manualTitle,
          company: manualCompany,
          location: manualLocation,
          workMode: "remote",
          description: manualDescription,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setImportError(data.error?.[0]?.message || data.error || "Import failed");
        return;
      }

      setShowManualModal(false);
      setManualUrl("");
      setManualTitle("");
      setManualCompany("");
      setManualDescription("");
      await reloadJobs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setImportError(msg);
    } finally {
      setIsImporting(false);
    }
  };

  // Filter local jobs if source selected
  const displayedJobs = jobs.filter((j) => (selectedSource === "all" ? true : j.source === selectedSource));
  const eligibleCount = jobs.filter((j) => j.eligibility.isEligibleForSriLanka).length;
  const filteredCount = jobs.length - eligibleCount;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Job Explorer & Feed Ingestion</h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Aggregated from Remotive, RemoteOK, Jobicy, WeWorkRemotely, and ATS watchlists with geographic filtering.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowManualModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 text-xs sm:text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Paste Job URL
            </button>
            <button
              onClick={handleRunDiscovery}
              disabled={isDiscovering}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow"
            >
              <RefreshCw className={`w-4 h-4 ${isDiscovering ? "animate-spin" : ""}`} />
              {isDiscovering ? "Fetching Feeds..." : "Run Discovery Now"}
            </button>
          </div>
        </div>

        {/* Search & Filter Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, tech, company..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs sm:text-sm font-medium"
            />
          </div>

          {/* Work Mode filter */}
          <div>
            <select
              value={selectedWorkMode}
              onChange={(e) => setSelectedWorkMode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs sm:text-sm font-medium"
            >
              <option value="all">All Work Modes</option>
              <option value="remote">Remote Only</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </select>
          </div>

          {/* Source filter */}
          <div>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs sm:text-sm font-medium"
            >
              <option value="all">All Sources</option>
              <option value="remotive">Remotive</option>
              <option value="remoteok">RemoteOK</option>
              <option value="jobicy">Jobicy</option>
              <option value="weworkremotely">WeWorkRemotely</option>
              <option value="greenhouse">Greenhouse Watchlist</option>
              <option value="lever">Lever Watchlist</option>
              <option value="manual">Manual Imports</option>
            </select>
          </div>

          {/* Sri Lanka Geographic Guard Toggle */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={eligibleOnly}
                onChange={(e) => setEligibleOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-zinc-300"
              />
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                Sri Lanka & Worldwide Eligible Only
              </span>
            </label>
          </div>
        </div>

        {/* Metric counts */}
        <div className="flex items-center gap-4 text-xs text-zinc-500 pt-1">
          <span>Total Ingested: <strong>{jobs.length}</strong></span>
          <span className="text-emerald-600 font-medium">Eligible: <strong>{eligibleCount}</strong></span>
          {filteredCount > 0 && (
            <span className="text-amber-600 font-medium">Filtered (US/EU only): <strong>{filteredCount}</strong></span>
          )}
        </div>
      </div>

      {/* Job Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-400">Loading discovered jobs...</div>
      ) : displayedJobs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-3">
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            No jobs found matching your filters.
          </p>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Click &quot;Run Discovery Now&quot; to fetch the latest postings from Remotive, RemoteOK, and WeWorkRemotely.
          </p>
          <button
            onClick={handleRunDiscovery}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors shadow"
          >
            Run Discovery Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedJobs.map((job) => (
            <div
              key={job.urlHash}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                job.eligibility.isEligibleForSriLanka
                  ? "bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm hover:border-blue-400"
                  : "bg-zinc-50/60 border-zinc-200 opacity-75 dark:bg-zinc-900/40 dark:border-zinc-800"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 line-clamp-1">
                      {job.title}
                    </h3>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                      {job.company}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {job.source}
                  </span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {job.location}
                  </span>

                  {job.eligibility.isEligibleForSriLanka ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Eligible (Sri Lanka / Worldwide)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Filtered: {job.eligibility.detectedRegion}
                    </span>
                  )}

                  {job.salaryRaw && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                      <DollarSign className="w-3 h-3" />
                      {job.salaryRaw}
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                  {job.description.replace(/<[^>]*>?/gm, "").slice(0, 160)}...
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                <span className="text-[11px] text-zinc-400">
                  {job.postedAt ? new Date(job.postedAt).toLocaleDateString() : "Recently posted"}
                </span>

                <div className="flex items-center gap-2">
                  {onOpenInStudio && job.eligibility.isEligibleForSriLanka && (
                    <button
                      onClick={() => onOpenInStudio(job.urlHash)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-300 transition-colors"
                    >
                      Match in Studio →
                    </button>
                  )}
                  <button
                    onClick={() => setInspectingJob(job)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Inspect Details
                  </button>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Original Link
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Job Description Modal */}
      {inspectingJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{inspectingJob.title}</h3>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {inspectingJob.company} • {inspectingJob.location}
                </p>
              </div>
              <button
                onClick={() => setInspectingJob(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-amber-50/70 border-b border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200 text-xs flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Untrusted External Content:</strong> Delimited for AI safety to prevent prompt injection.
              </span>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line font-sans">
              <div
                dangerouslySetInnerHTML={{
                  __html: inspectingJob.description,
                }}
              />
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Eligibility: {inspectingJob.eligibility.reason}
              </span>
              <a
                href={inspectingJob.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors"
              >
                Open Original Posting
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Manual Job URL Import Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleManualImportSubmit}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Manually Ingest Job Posting
              </h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                {importError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Posting URL (LinkedIn, Company Careers, etc.)
              </label>
              <input
                type="url"
                required
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. React Frontend Engineer"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={manualCompany}
                  onChange={(e) => setManualCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Location
              </label>
              <input
                type="text"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                placeholder="e.g. Remote (Worldwide)"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Job Description
              </label>
              <textarea
                required
                rows={4}
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="Paste the job description or requirements here..."
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isImporting}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow"
              >
                {isImporting ? "Ingesting..." : "Ingest Job"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
