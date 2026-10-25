"use client";

import React, { useState } from "react";
import { FullProfile } from "@/lib/validation/profile";
import { Mail, Phone, MapPin, Globe, ExternalLink, Briefcase, GraduationCap, Code2, Layers, CheckCircle2 } from "lucide-react";

interface ProfileTabProps {
  profile: FullProfile;
}

export function ProfileTab({ profile }: ProfileTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const skillCategories = [
    { id: "all", label: "All Skills" },
    { id: "frontend", label: "Frontend" },
    { id: "backend", label: "Backend" },
    { id: "mobile", label: "Mobile" },
    { id: "ai_ml", label: "AI & ML" },
    { id: "auth", label: "Auth & Security" },
    { id: "database", label: "Database" },
  ];

  const filteredSkills = profile.skills.filter((s) =>
    selectedCategory === "all" ? true : s.category === selectedCategory
  );

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{profile.fullName}</h1>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{profile.headline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              {profile.email}
            </a>
            {profile.phone && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Phone className="w-3.5 h-3.5" />
                {profile.phone}
              </span>
            )}
            {profile.location && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <MapPin className="w-3.5 h-3.5" />
                {profile.location}
              </span>
            )}
            {profile.githubUrl && (
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                GitHub
              </a>
            )}
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                LinkedIn
              </a>
            )}
          </div>
        </div>

        {profile.summary && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800 leading-relaxed">
            {profile.summary}
          </p>
        )}
      </div>

      {/* Skills Manager */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Verified Technical Skills ({profile.skills.length})
            </h2>
          </div>
          <div className="flex flex-wrap gap-1 bg-zinc-100 p-1 rounded-lg dark:bg-zinc-800">
            {skillCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  selectedCategory === c.id
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {filteredSkills.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {s.name}
            </span>
          ))}
        </div>
      </div>

      {/* Experience & Atomic Facts */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Professional Experience & Atomic Facts
          </h2>
        </div>

        <div className="space-y-4">
          {profile.experiences.map((exp) => (
            <div
              key={exp.id}
              className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{exp.role}</h3>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{exp.company}</p>
                </div>
                <div className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md dark:bg-zinc-800">
                  {exp.startDate} — {exp.isCurrent ? "Present" : exp.endDate}
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">
                  Verified Experience Facts ({exp.facts.length})
                </span>
                <div className="space-y-2">
                  {exp.facts.map((fact) => (
                    <div
                      key={fact.id}
                      className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 dark:bg-zinc-800/40 dark:border-zinc-800 flex items-start gap-3"
                    >
                      <div className="mt-0.5">
                        {fact.isVerified ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-amber-500 flex items-center justify-center shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                          {fact.text}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] text-zinc-400">{fact.id}</span>
                          {fact.skillIds.map((s) => (
                            <span
                              key={s}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projects */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Engineered Projects & Evidence
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {profile.projects.map((proj) => (
            <div
              key={proj.id}
              className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-4 shadow-sm"
            >
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{proj.name}</h3>
                <p className="text-xs font-semibold text-zinc-500 mt-0.5">{proj.role}</p>
                {proj.description && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                    {proj.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {proj.technologies.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Associated Facts ({proj.facts.length})
                </span>
                {proj.facts.map((f) => (
                  <div
                    key={f.id}
                    className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 dark:bg-zinc-800/40 dark:border-zinc-700/60 text-xs text-zinc-800 dark:text-zinc-200"
                  >
                    {f.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Education */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Education & Qualifications</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profile.educations.map((edu) => (
            <div key={edu.id} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{edu.degree}</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{edu.institution}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {edu.startDate} — {edu.isCurrent ? "Present" : edu.endDate} {edu.grade ? `(${edu.grade})` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
