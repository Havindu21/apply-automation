"use client";

import React from "react";
import { FullProfile } from "@/lib/validation/profile";
import { ShieldCheck, AlertCircle, CheckCircle2, Briefcase, Globe, ArrowRight, Zap, Play } from "lucide-react";

interface OverviewTabProps {
  profile: FullProfile;
  setActiveTab: (tab: string) => void;
  onTriggerDiscovery: () => void;
  isTriggering: boolean;
}

export function OverviewTab({
  profile,
  setActiveTab,
  onTriggerDiscovery,
  isTriggering,
}: OverviewTabProps) {
  const allFacts = [
    ...profile.experiences.flatMap((e) => e.facts),
    ...profile.projects.flatMap((p) => p.facts),
  ];
  const verifiedCount = allFacts.filter((f) => f.isVerified).length;
  const unverifiedCount = allFacts.length - verifiedCount;
  const activeCareerProfiles = profile.careerProfiles.filter((cp) => cp.isEnabled).length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Truth Engine Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {profile.fullName}
            </h1>
            <p className="text-blue-100/80 text-sm sm:text-base max-w-2xl">
              JobPilot is configured with your career profile from Mobios Private Limited. AI CV tailoring is strictly constrained to your verified atomic facts.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab("cv-import")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-100 transition-colors shadow"
            >
              Review CV Facts
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onTriggerDiscovery}
              disabled={isTriggering}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-semibold text-sm border border-blue-400/30 transition-colors"
            >
              <Play className="w-4 h-4 fill-white" />
              {isTriggering ? "Queueing..." : "Trigger Discovery"}
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Verified Facts</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">{verifiedCount}</span>
            <span className="text-xs text-zinc-500">of {allFacts.length} total facts</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {verifiedCount === allFacts.length ? "100% verified & trusted" : `${unverifiedCount} require verification`}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Career Targets</span>
            <Briefcase className="w-5 h-5 text-blue-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">{activeCareerProfiles}</span>
            <span className="text-xs text-zinc-500">active profiles</span>
          </div>
          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
            Frontend, Full-stack, Backend, Mobile, AI
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Work Modes</span>
            <Globe className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {profile.preferences.workModes.remote ? "Remote" : ""}
              {profile.preferences.workModes.hybrid ? " Hybrid" : ""}
              {profile.preferences.workModes.onsite ? " Onsite" : ""}
            </span>
          </div>
          <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            {profile.preferences.allowSriLankaRemoteOnly ? "Sri Lanka & Global Eligible Only" : "All Remote"}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Automation</span>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {profile.preferences.automationEnabled ? "Active" : "Manual Only"}
            </span>
          </div>
          <div className="mt-2 text-xs text-zinc-500 font-mono">
            {profile.preferences.automationCron}
          </div>
        </div>
      </div>

      {/* Actionable Alert if Unverified Facts Remain */}
      {unverifiedCount > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Action Required: {unverifiedCount} Imported CV Facts Await Verification
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Facts extracted from your uploaded CV cannot be cited by the AI tailoring engine until you verify them. This guarantees no unreviewed claims or hallucinations enter any job application.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("cv-import")}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow transition-colors shrink-0"
            >
              Review Now
            </button>
          </div>
        </div>
      )}

      {/* Career Profile Quick Glance */}
      <div className="rounded-2xl bg-white border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Active Career Targets ({activeCareerProfiles} enabled)
          </h2>
          <button
            onClick={() => setActiveTab("career-profiles")}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Manage Profiles →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.careerProfiles.map((cp) => (
            <div
              key={cp.id}
              className={`p-4 rounded-xl border transition-all ${
                cp.isEnabled
                  ? "bg-zinc-50 border-zinc-200 dark:bg-zinc-800/60 dark:border-zinc-700"
                  : "bg-zinc-100/50 border-dashed border-zinc-300 opacity-60 dark:bg-zinc-900 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{cp.title}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  Priority {cp.priority}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                {cp.summaryHeadline}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {cp.highlightSkillIds.slice(0, 4).map((s) => (
                  <span
                    key={s}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
