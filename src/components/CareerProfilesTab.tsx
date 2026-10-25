"use client";

import React from "react";
import { FullProfile } from "@/lib/validation/profile";
import { Briefcase, Power, Star, Target } from "lucide-react";

interface CareerProfilesTabProps {
  profile: FullProfile;
  onToggleProfile: (id: string, isEnabled: boolean) => Promise<void>;
}

export function CareerProfilesTab({ profile, onToggleProfile }: CareerProfilesTabProps) {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-2">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Configurable Career Targets</h2>
        </div>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          Career profiles control how the discovery engine matches jobs and which verified facts are emphasized in tailored CVs. All profiles share the exact same ground-truth facts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {profile.careerProfiles.map((cp) => (
          <div
            key={cp.id}
            className={`p-6 rounded-2xl border transition-all ${
              cp.isEnabled
                ? "bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm"
                : "bg-zinc-50 border-zinc-200 opacity-60 dark:bg-zinc-900/50 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">{cp.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Priority #{cp.priority}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {cp.summaryHeadline}
                </p>
              </div>

              <button
                onClick={() => onToggleProfile(cp.id, !cp.isEnabled)}
                className={`p-2 rounded-xl border transition-colors ${
                  cp.isEnabled
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                    : "bg-zinc-100 border-zinc-300 text-zinc-400 hover:bg-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-500"
                }`}
                title={cp.isEnabled ? "Disable career target" : "Enable career target"}
              >
                <Power className="w-4 h-4" />
              </button>
            </div>

            {/* Target Titles */}
            <div className="space-y-1.5 pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-4">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Target className="w-3 h-3" /> Target Job Titles
              </span>
              <div className="flex flex-wrap gap-1.5">
                {cp.targetTitles.map((title) => (
                  <span
                    key={title}
                    className="text-xs px-2.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 font-medium"
                  >
                    {title}
                  </span>
                ))}
              </div>
            </div>

            {/* Highlighted Skills */}
            <div className="space-y-1.5 pt-3">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500" /> Emphasized Verified Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {cp.highlightSkillIds.map((sid) => (
                  <span
                    key={sid}
                    className="text-xs px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-300 font-semibold"
                  >
                    {sid}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
