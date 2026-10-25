"use client";

import React from "react";
import { Compass, ShieldCheck, UserCheck, Briefcase, Sliders, Activity, Sparkles } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unverifiedCount: number;
}

export function Navbar({ activeTab, setActiveTab, unverifiedCount }: NavbarProps) {
  const tabs = [
    { id: "overview", label: "Overview", icon: Compass },
    { id: "jobs", label: "Job Explorer", icon: Compass },
    { id: "studio", label: "Application Studio", icon: Sparkles },
    {
      id: "cv-import",
      label: "CV Import Review",
      icon: ShieldCheck,
      badge: unverifiedCount > 0 ? `${unverifiedCount} unverified` : "All Verified",
      badgeColor: unverifiedCount > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    },
    { id: "profile", label: "My Profile & Facts", icon: UserCheck },
    { id: "career-profiles", label: "Career Profiles", icon: Briefcase },
    { id: "preferences", label: "Search & Work Modes", icon: Sliders },
    { id: "automation", label: "Automation & Logs", icon: Activity },
  ];

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              JP
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">JobPilot</span>
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                Phase 2 Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                      isActive
                        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{tab.label}</span>
                    {tab.badge && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tab.badgeColor}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
