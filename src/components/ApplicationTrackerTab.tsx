"use client";

import React, { useState, useEffect } from "react";
import { ApplicationPackage } from "@/lib/services/application-service";
import { ApplicationStatus, ApplicationStateMachine } from "@/lib/applications/state-machine";
import { FullProfile } from "@/lib/validation/profile";
import {
  Download,
  ExternalLink,
  CheckCircle2,
  Play,
  Sparkles,
  Search,
  Building,
  MapPin,
  Globe2,
  Copy,
  Check,
  History,
  X,
  Trophy,
} from "lucide-react";

interface ApplicationTrackerTabProps {
  profile: FullProfile;
  onOpenInStudio?: (jobId: string) => void;
}

export function ApplicationTrackerTab({ profile }: ApplicationTrackerTabProps) {
  const [applications, setApplications] = useState<ApplicationPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeModalApp, setActiveModalApp] = useState<ApplicationPackage | null>(null);
  const [modalType, setModalType] = useState<"quick_fill" | "history" | "confirm" | null>(null);

  // Confirmation form state
  const [confirmEvidence, setConfirmEvidence] = useState("");
  const [hasUserConfirmedOutcome, setHasUserConfirmedOutcome] = useState(false);

  // Copied indicator for Quick Fill
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      const res = await fetch("/api/applications");
      const data = await res.json();
      if (data.success && Array.isArray(data.applications)) {
        setApplications(data.applications);
      }
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch("/api/applications")
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success && Array.isArray(data.applications)) {
          setApplications(data.applications);
        }
      })
      .catch((err) => console.error("Failed to fetch applications:", err))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleTransition = async (
    appId: string,
    targetStatus: ApplicationStatus,
    reason?: string,
    evidence?: string
  ) => {
    try {
      const res = await fetch(`/api/applications/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          actor: "human", // Enforces user-initiated human action
          reason: reason || `Transitioned to ${targetStatus} via web UI`,
          evidence,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchApplications();
        if (modalType === "confirm") {
          setModalType(null);
          setActiveModalApp(null);
          setConfirmEvidence("");
        }
      } else {
        alert(`Transition failed: ${data.error}`);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Error updating application status");
    }
  };

  const handleLaunchAssistedApply = async (app: ApplicationPackage) => {
    try {
      const res = await fetch(`/api/applications/${app.id}/assist`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert(`Assisted Session Launched!\n\n${data.message}`);
        await fetchApplications();
      } else {
        // Fallback to opening candidate Quick Fill drawer and job URL
        alert(`Browser launch note: ${data.error}\nOpening application URL and Quick-Fill Copilot.`);
        setActiveModalApp(app);
        setModalType("quick_fill");
        if (app.job?.url) {
          window.open(app.job.url, "_blank");
        }
      }
    } catch (err) {
      console.error("Assisted apply error:", err);
      if (app.job?.url) {
        window.open(app.job.url, "_blank");
      }
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredApps = applications.filter((app) => {
    const q = searchTerm.toLowerCase();
    const titleMatch = (app.job?.title || "").toLowerCase().includes(q);
    const companyMatch = (app.job?.company || "").toLowerCase().includes(q);
    return titleMatch || companyMatch;
  });

  // Pipeline columns
  const columns: { id: string; title: string; statuses: ApplicationStatus[]; color: string }[] = [
    { id: "review", title: "Review Queue", statuses: ["review", "prepared"], color: "border-amber-400 bg-amber-50/20" },
    { id: "approved", title: "Approved for Apply", statuses: ["approved"], color: "border-indigo-400 bg-indigo-50/20" },
    { id: "applying", title: "Applying / Copilot", statuses: ["applying"], color: "border-blue-400 bg-blue-50/20" },
    { id: "confirmed", title: "Submitted & Confirmed", statuses: ["submitted", "confirmed"], color: "border-emerald-400 bg-emerald-50/20" },
    { id: "interview", title: "Interviews & Offers", statuses: ["responded", "interview", "offer"], color: "border-purple-400 bg-purple-50/20" },
  ];

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "review":
      case "prepared":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Pending Review</span>;
      case "approved":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">Approved</span>;
      case "applying":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Applying</span>;
      case "submitted":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">Awaiting Conf</span>;
      case "confirmed":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Confirmed Applied</span>;
      case "interview":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">Interview</span>;
      case "offer":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">Offer Received 🎉</span>;
      case "rejected":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">Rejected</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Application Pipeline & Human Gatekeeper
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Strict human-reviewed application pipeline. Zero autonomous submissions without explicit approval.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Filter by role or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50">
            <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">
              {applications.filter((a) => a.status === "review" || a.status === "prepared").length}
            </div>
            <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Review Queue</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50">
            <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">
              {applications.filter((a) => a.status === "approved").length}
            </div>
            <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">Approved</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50">
            <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">
              {applications.filter((a) => a.status === "applying").length}
            </div>
            <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Applying</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50">
            <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">
              {applications.filter((a) => a.status === "confirmed" || a.status === "submitted").length}
            </div>
            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Confirmed Applied</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50">
            <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">
              {applications.filter((a) => a.status === "interview" || a.status === "offer").length}
            </div>
            <div className="text-[11px] font-medium text-purple-600 dark:text-purple-400">Interviews / Offers</div>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-zinc-500">Loading applications...</div>
      ) : filteredApps.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-dashed border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-indigo-500 mx-auto" />
          <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">No Applications in Pipeline Yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Discover jobs in the Job Explorer, evaluate fit in the Application Studio, and save verified packages to your pipeline.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
          {columns.map((col) => {
            const columnApps = filteredApps.filter((a) => col.statuses.includes(a.status));
            return (
              <div
                key={col.id}
                className="rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-3 space-y-3 min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{col.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {columnApps.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {columnApps.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 hover:border-indigo-400 transition-all"
                    >
                      {/* Top Header */}
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 line-clamp-1">
                            {app.job?.title || "Software Engineer"}
                          </span>
                          {getStatusBadge(app.status)}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                          <Building className="w-3 h-3 text-zinc-400" />
                          <span className="font-medium line-clamp-1">{app.job?.company || "Company"}</span>
                        </div>
                      </div>

                      {/* Location & Tags */}
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {app.job?.location || "Remote"}
                        </span>
                        {app.job?.isWorldwideRemote && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 font-medium">
                            <Globe2 className="w-2.5 h-2.5" />
                            Worldwide
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-mono">
                          {app.citedFactIds?.length || 0} facts cited
                        </span>
                      </div>

                      {/* Summary teaser */}
                      {app.tailoredCvJson?.summary && (
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {app.tailoredCvJson.summary}
                        </p>
                      )}

                      {/* Documents Download & Preview Buttons */}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-1.5">
                        <a
                          href={`/api/applications/${app.id}/pdf`}
                          download
                          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
                        >
                          <Download className="w-3 h-3 text-blue-600" />
                          ATS Resume
                        </a>
                        <a
                          href={`/api/applications/${app.id}/preview`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3 text-zinc-500" />
                          Preview
                        </a>
                      </div>

                      {/* Actions based on state */}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-1.5">
                        {/* REVIEW STAGE */}
                        {app.status === "review" && (
                          <button
                            onClick={() => handleTransition(app.id, "approved", "Approved by human user")}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve for Apply
                          </button>
                        )}

                        {/* APPROVED STAGE */}
                        {app.status === "approved" && (
                          <div className="space-y-1">
                            <button
                              onClick={() => handleLaunchAssistedApply(app)}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-sm transition-all"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Launch Assisted Apply
                            </button>
                            <button
                              onClick={() => {
                                setActiveModalApp(app);
                                setModalType("quick_fill");
                              }}
                              className="w-full flex items-center justify-center gap-1 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold text-[11px] hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            >
                              <Copy className="w-3 h-3" />
                              Quick-Fill Clipboard
                            </button>
                          </div>
                        )}

                        {/* APPLYING STAGE */}
                        {app.status === "applying" && (
                          <div className="space-y-1">
                            <button
                              onClick={() => {
                                setActiveModalApp(app);
                                setModalType("confirm");
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Confirm Applied
                            </button>
                            <button
                              onClick={() => {
                                setActiveModalApp(app);
                                setModalType("quick_fill");
                              }}
                              className="w-full flex items-center justify-center gap-1 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold text-[11px]"
                            >
                              Quick-Fill Clipboard
                            </button>
                          </div>
                        )}

                        {/* CONFIRMED STAGE */}
                        {(app.status === "confirmed" || app.status === "submitted") && (
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            <button
                              onClick={() => handleTransition(app.id, "interview", "Interview invitation received")}
                              className="py-1 px-1.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold text-center"
                            >
                              + Interview
                            </button>
                            <button
                              onClick={() => handleTransition(app.id, "rejected", "Application not selected")}
                              className="py-1 px-1.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 font-medium text-center"
                            >
                              Not Selected
                            </button>
                          </div>
                        )}

                        {/* Audit Log / History Button */}
                        <button
                          onClick={() => {
                            setActiveModalApp(app);
                            setModalType("history");
                          }}
                          className="w-full flex items-center justify-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 pt-1"
                        >
                          <History className="w-3 h-3" />
                          View Audit History ({app.history?.length || 0})
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: QUICK FILL CLIPBOARD COPILOT */}
      {modalType === "quick_fill" && activeModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Quick-Fill Copilot: {activeModalApp.job?.company}
                </h3>
                <p className="text-xs text-zinc-500">One-click copy candidate info into employer forms.</p>
              </div>
              <button
                onClick={() => {
                  setModalType(null);
                  setActiveModalApp(null);
                }}
                className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {[
                { label: "Full Name", val: profile.fullName, key: "fullName" },
                { label: "First Name", val: profile.fullName.split(" ")[0] || "", key: "firstName" },
                { label: "Last Name", val: profile.fullName.split(" ").slice(1).join(" ") || "", key: "lastName" },
                { label: "Email Address", val: profile.email, key: "email" },
                { label: "Phone Number", val: profile.phone || "", key: "phone" },
                { label: "Location", val: profile.location || "Colombo, Sri Lanka", key: "location" },
                { label: "LinkedIn URL", val: profile.linkedinUrl || "", key: "linkedin" },
                { label: "GitHub URL", val: profile.githubUrl || "", key: "github" },
                { label: "Tailored Headline", val: activeModalApp.tailoredCvJson.headline || "", key: "headline" },
                { label: "Tailored Summary", val: activeModalApp.tailoredCvJson.summary || "", key: "summary" },
                { label: "Highlight Skills", val: activeModalApp.tailoredCvJson.highlightSkills.join(", "), key: "skills" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                  <div className="space-y-0.5 overflow-hidden pr-3">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase">{item.label}</div>
                    <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{item.val || "—"}</div>
                  </div>
                  <button
                    disabled={!item.val}
                    onClick={() => copyToClipboard(item.val, item.key)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-xs font-semibold transition-all shrink-0"
                  >
                    {copiedKey === item.key ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center">
              <a
                href={`/api/applications/${activeModalApp.id}/pdf`}
                download
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                Download Tailored ATS Resume
              </a>
              {activeModalApp.job?.url && (
                <a
                  href={activeModalApp.job.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Application Page
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM APPLIED DIALOG */}
      {modalType === "confirm" && activeModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Confirm Application Submission
                </h3>
              </div>
              <p className="text-xs text-zinc-500">
                JobPilot never records an application as confirmed without human verification.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
              <div className="font-bold text-zinc-800 dark:text-zinc-200">{activeModalApp.job?.title}</div>
              <div className="text-zinc-500">{activeModalApp.job?.company}</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Actual Submission Outcome / Evidence (Required)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Received confirmation email from employer, Application Reference #84920, Greenhouse confirmation screen verified"
                value={confirmEvidence}
                onChange={(e) => setConfirmEvidence(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-zinc-500">
                An attempted form fill does not qualify. You must provide actual proof of completed submission.
              </p>
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasUserConfirmedOutcome}
                  onChange={(e) => setHasUserConfirmedOutcome(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  I certify that I have verified the employer form, completed the final submit click myself, and verified the successful submission outcome.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => {
                  setModalType(null);
                  setActiveModalApp(null);
                  setHasUserConfirmedOutcome(false);
                  setConfirmEvidence("");
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                disabled={!hasUserConfirmedOutcome || confirmEvidence.trim().length < 5}
                onClick={() =>
                  handleTransition(
                    activeModalApp.id,
                    "confirmed",
                    "Application confirmed by human user",
                    confirmEvidence.trim()
                  )
                }
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Confirmed Applied
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDIT HISTORY TRAIL */}
      {modalType === "history" && activeModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Application Audit Trail & Proof
                </h3>
              </div>
              <button
                onClick={() => {
                  setModalType(null);
                  setActiveModalApp(null);
                }}
                className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {activeModalApp.history && activeModalApp.history.length > 0 ? (
                activeModalApp.history.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {ApplicationStateMachine.getStatusLabel(ev.fromStatus)} →{" "}
                        {ApplicationStateMachine.getStatusLabel(ev.toStatus)}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        actor: {ev.actor}
                      </span>
                    </div>
                    {ev.reason && <p className="text-zinc-600 dark:text-zinc-400">{ev.reason}</p>}
                    {ev.evidence && (
                      <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                        Evidence: {ev.evidence}
                      </p>
                    )}
                    <div className="text-[10px] text-zinc-400">
                      {new Date(ev.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-zinc-500">No history events logged yet.</div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
              <button
                onClick={() => {
                  setModalType(null);
                  setActiveModalApp(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
