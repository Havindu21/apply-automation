"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FullProfile, UserPreferences } from "@/lib/validation/profile";
import { Navbar } from "@/components/Navbar";
import { OverviewTab } from "@/components/OverviewTab";
import { JobExplorerTab } from "@/components/JobExplorerTab";
import { ApplicationStudioTab } from "@/components/ApplicationStudioTab";
import { ApplicationTrackerTab } from "@/components/ApplicationTrackerTab";
import { AnalyticsTab } from "@/components/AnalyticsTab";
import { CvImportReviewTab } from "@/components/CvImportReviewTab";
import { ProfileTab } from "@/components/ProfileTab";
import { CareerProfilesTab } from "@/components/CareerProfilesTab";
import { PreferencesTab } from "@/components/PreferencesTab";
import { AutomationLogsTab } from "@/components/AutomationLogsTab";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedStudioJobId, setSelectedStudioJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);

  const reloadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success && data.profile) {
          setProfile(data.profile);
        }
      })
      .catch((err) => console.error("Error fetching profile:", err))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleVerifyFact = async (factId: string, isVerified: boolean) => {
    try {
      const res = await fetch("/api/profile/verify-fact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factId, isVerified }),
      });
      const data = await res.json();
      if (data.success) {
        await reloadProfile();
      }
    } catch (err) {
      console.error("Failed to verify fact:", err);
    }
  };

  const handleVerifyAll = async () => {
    try {
      const res = await fetch("/api/profile/verify-all", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await reloadProfile();
      }
    } catch (err) {
      console.error("Failed to verify all facts:", err);
    }
  };

  const handleToggleProfile = async (id: string, isEnabled: boolean) => {
    try {
      const res = await fetch("/api/profile/career-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        await reloadProfile();
      }
    } catch (err) {
      console.error("Failed to toggle career profile:", err);
    }
  };

  const handleUpdatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      const res = await fetch("/api/profile/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        await reloadProfile();
      }
    } catch (err) {
      console.error("Failed to update preferences:", err);
      throw err;
    }
  };

  const handleTriggerDiscovery = async () => {
    setIsTriggering(true);
    try {
      await fetch("/api/automation/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "all" }),
      });
    } catch (err) {
      console.error("Failed to trigger discovery:", err);
    } finally {
      setIsTriggering(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-zinc-500">Loading JobPilot Engine...</p>
      </div>
    );
  }

  const allFacts = [
    ...profile.experiences.flatMap((e) => e.facts),
    ...profile.projects.flatMap((p) => p.facts),
  ];
  const unverifiedCount = allFacts.filter((f) => !f.isVerified).length;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 flex">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unverifiedCount={unverifiedCount}
      />

      <div className="flex-1 min-w-0 flex flex-col">
      <main className="flex-1 w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && (
          <OverviewTab
            profile={profile}
            setActiveTab={setActiveTab}
            onTriggerDiscovery={handleTriggerDiscovery}
            isTriggering={isTriggering}
          />
        )}

        {activeTab === "jobs" && (
          <JobExplorerTab
            onOpenInStudio={(jobId) => {
              setSelectedStudioJobId(jobId);
              setActiveTab("studio");
            }}
          />
        )}

        {activeTab === "studio" && (
          <ApplicationStudioTab
            profile={profile}
            initialJobId={selectedStudioJobId}
          />
        )}

        {activeTab === "applications" && (
          <ApplicationTrackerTab
            profile={profile}
            onOpenInStudio={(jobId) => {
              setSelectedStudioJobId(jobId);
              setActiveTab("studio");
            }}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsTab profile={profile} />
        )}

        {activeTab === "cv-import" && (
          <CvImportReviewTab
            profile={profile}
            onVerifyFact={handleVerifyFact}
            onVerifyAll={handleVerifyAll}
          />
        )}

        {activeTab === "profile" && <ProfileTab profile={profile} />}

        {activeTab === "career-profiles" && (
          <CareerProfilesTab
            profile={profile}
            onToggleProfile={handleToggleProfile}
          />
        )}

        {activeTab === "preferences" && (
          <PreferencesTab
            profile={profile}
            onUpdatePreferences={handleUpdatePreferences}
          />
        )}

        {activeTab === "automation" && (
          <AutomationLogsTab
            onTriggerDiscovery={handleTriggerDiscovery}
            isTriggering={isTriggering}
          />
        )}
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500">
        JobPilot &copy; 2026. Built with Next.js, PostgreSQL, Drizzle ORM & pg-boss. Strictly truthful AI tailoring.
      </footer>
      </div>
    </div>
  );
}
