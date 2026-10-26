"use client";

import React from "react";
import { Compass, ShieldCheck, UserCheck, Sliders, Activity, Sparkles, Send, BarChart3 } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unverifiedCount: number;
}

export function Navbar({ activeTab, setActiveTab, unverifiedCount }: NavbarProps) {
  const tabs = [
    { id: "overview", label: "Overview", icon: Compass },
    { id: "jobs", label: "Job Explorer", icon: Compass },
    { id: "studio", label: "Studio", icon: Sparkles },
    { id: "applications", label: "Applications", icon: Send },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    {
      id: "cv-import",
      label: "CV Import",
      icon: ShieldCheck,
      badge: unverifiedCount > 0 ? `${unverifiedCount} unverified` : "Verified",
      badgeColor: unverifiedCount > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    },
    { id: "profile", label: "Profile", icon: UserCheck },
    { id: "preferences", label: "Search & Work Modes", icon: Sliders },
    { id: "automation", label: "Automation", icon: Activity },
  ];

  return (
    <aside className="sticky top-0 h-screen shrink-0 w-16 lg:w-60 flex flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 z-40">
      <div className="flex items-center gap-3 h-16 px-3 lg:px-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
          JP
        </div>
        <div className="hidden lg:block min-w-0">
          <div className="font-bold text-lg tracking-tight leading-none text-zinc-900 dark:text-zinc-100">JobPilot</div>
          <span className="mt-1 inline-block whitespace-nowrap text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
            Phase 5 Copilot
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              aria-label={tab.label}
              className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                isActive
                  ? "bg-zinc-100 text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline whitespace-nowrap">{tab.label}</span>
              {tab.badge && (
                <span className={`hidden lg:inline ml-auto whitespace-nowrap text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tab.badgeColor}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
