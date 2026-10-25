"use client";

import React, { useState } from "react";
import { FullProfile, UserPreferences } from "@/lib/validation/profile";
import { Sliders, Globe, Shield, DollarSign, Calendar, Save, Check } from "lucide-react";

interface PreferencesTabProps {
  profile: FullProfile;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
}

export function PreferencesTab({ profile, onUpdatePreferences }: PreferencesTabProps) {
  const [prefs, setPrefs] = useState<UserPreferences>(profile.preferences);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleWorkModeToggle = (mode: "remote" | "hybrid" | "onsite") => {
    const updatedModes = {
      ...prefs.workModes,
      [mode]: !prefs.workModes[mode],
    };

    // Validation: At least one work mode must be true
    if (!updatedModes.remote && !updatedModes.hybrid && !updatedModes.onsite) {
      setErrorMsg("At least one work mode (Remote, Hybrid, or Onsite) must remain enabled.");
      return;
    }

    setErrorMsg(null);
    setPrefs({ ...prefs, workModes: updatedModes });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onUpdatePreferences(prefs);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update preferences";
      setErrorMsg(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Job Preferences & Search Guards</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Configure geographic eligibility, work-mode toggles, salary thresholds, and automation schedules.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4" /> Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Preferences"}
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Work Modes Section */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Work Modes (Persistent Toggles)</h3>
        </div>
        <p className="text-xs text-zinc-500">
          When remote-only is active, all job discovery, matching, and queueing pipelines immediately enforce that rule.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Remote Toggle */}
          <button
            type="button"
            onClick={() => handleWorkModeToggle("remote")}
            className={`p-4 rounded-xl border text-left transition-all ${
              prefs.workModes.remote
                ? "bg-blue-50/70 border-blue-400 text-blue-950 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-100 shadow-sm"
                : "bg-zinc-50 border-zinc-200 text-zinc-500 dark:bg-zinc-900 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">Remote</span>
              <span className={`w-2.5 h-2.5 rounded-full ${prefs.workModes.remote ? "bg-blue-600" : "bg-zinc-300"}`} />
            </div>
            <p className="text-xs text-zinc-500 mt-2">Work from home or anywhere globally.</p>
          </button>

          {/* Hybrid Toggle */}
          <button
            type="button"
            onClick={() => handleWorkModeToggle("hybrid")}
            className={`p-4 rounded-xl border text-left transition-all ${
              prefs.workModes.hybrid
                ? "bg-blue-50/70 border-blue-400 text-blue-950 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-100 shadow-sm"
                : "bg-zinc-50 border-zinc-200 text-zinc-500 dark:bg-zinc-900 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">Hybrid</span>
              <span className={`w-2.5 h-2.5 rounded-full ${prefs.workModes.hybrid ? "bg-blue-600" : "bg-zinc-300"}`} />
            </div>
            <p className="text-xs text-zinc-500 mt-2">Split between office and remote location.</p>
          </button>

          {/* Onsite Toggle */}
          <button
            type="button"
            onClick={() => handleWorkModeToggle("onsite")}
            className={`p-4 rounded-xl border text-left transition-all ${
              prefs.workModes.onsite
                ? "bg-blue-50/70 border-blue-400 text-blue-950 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-100 shadow-sm"
                : "bg-zinc-50 border-zinc-200 text-zinc-500 dark:bg-zinc-900 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">Onsite</span>
              <span className={`w-2.5 h-2.5 rounded-full ${prefs.workModes.onsite ? "bg-blue-600" : "bg-zinc-300"}`} />
            </div>
            <p className="text-xs text-zinc-500 mt-2">Physical office presence required.</p>
          </button>
        </div>

        {/* Geographic Eligibility Guard (Sri Lanka) */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.allowSriLankaRemoteOnly}
              onChange={(e) => setPrefs({ ...prefs, allowSriLankaRemoteOnly: e.target.checked })}
              className="mt-1 w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
            />
            <div className="space-y-1">
              <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                Enforce Geographic Hiring Eligibility for Sri Lanka
              </span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Automatically rejects US-only or EU-only remote jobs. Only allows remote jobs explicitly open to applicants based in Sri Lanka, APAC, or Worldwide.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Salary & Application Thresholds */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Compensation & Matching Thresholds</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Minimum Salary ({prefs.salaryCurrency})
            </label>
            <input
              type="number"
              value={prefs.minSalary || ""}
              onChange={(e) => setPrefs({ ...prefs, minSalary: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="e.g. 1500"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Minimum Match Score (0–100)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={prefs.minMatchScore}
              onChange={(e) => setPrefs({ ...prefs, minMatchScore: parseInt(e.target.value) || 60 })}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Max Daily Applications
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={prefs.maxApplicationsPerDay}
              onChange={(e) => setPrefs({ ...prefs, maxApplicationsPerDay: parseInt(e.target.value) || 5 })}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-medium"
            />
          </div>
        </div>
      </div>

      {/* Automation Schedule */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Scheduled Discovery Automation</h3>
        </div>

        <div className="space-y-4 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.automationEnabled}
              onChange={(e) => setPrefs({ ...prefs, automationEnabled: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded border-zinc-300"
            />
            <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
              Enable Scheduled Daily Job Discovery
            </span>
          </label>

          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Cron Schedule Expression
            </label>
            <input
              type="text"
              value={prefs.automationCron}
              onChange={(e) => setPrefs({ ...prefs, automationCron: e.target.value })}
              placeholder="0 8 * * *"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-mono"
            />
            <span className="text-[11px] text-zinc-400 mt-1 block">
              Default &quot;0 8 * * *&quot; runs daily at 08:00 AM.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
