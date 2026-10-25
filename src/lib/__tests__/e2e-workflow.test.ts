import { describe, it, expect, vi } from "vitest";
import { ProfileService } from "../services/profile-service";
import { evaluateGeographicEligibility } from "../discovery/geo-filter";
import { JobMatcher } from "../matching/matcher";
import { CVTailorService } from "../tailoring/tailor";
import { CVTruthVerifier } from "../tailoring/verifier";
import { ApplicationService } from "../services/application-service";
import { ApplicationStateMachine } from "../applications/state-machine";
import { FormCopilot } from "../copilot/form-filler";
import { geminiClient } from "../ai/gemini-client";
import { NormalizedJob } from "../discovery/types";

describe("Phase H: Complete End-to-End Pipeline & Safety Audit", () => {
  it("executes the entire candidate lifecycle strictly respecting all safety gates", async () => {
    // -------------------------------------------------------------
    // STAGE 1: Profile Initialization & Unverified Ground Truth
    // -------------------------------------------------------------
    const profile = await ProfileService.getProfile();
    expect(profile.id).toBeDefined();
    expect(profile.fullName).toBe("Havindu Hesara");

    // All facts are initially UNVERIFIED
    const allInitialFacts = [
      ...profile.experiences.flatMap((e) => e.facts),
      ...profile.projects.flatMap((p) => p.facts),
    ];
    expect(allInitialFacts.length).toBeGreaterThan(0);

    // -------------------------------------------------------------
    // STAGE 2: Explicit Human Fact Verification
    // -------------------------------------------------------------
    // User verifies their real atomic facts
    const verifiedCount = await ProfileService.verifyAllFacts();
    expect(verifiedCount).toBe(allInitialFacts.length);

    const verifiedProfile = await ProfileService.getProfile();
    const verifiedFacts = [
      ...verifiedProfile.experiences.flatMap((e) => e.facts),
      ...verifiedProfile.projects.flatMap((p) => p.facts),
    ];
    expect(verifiedFacts.every((f) => f.isVerified)).toBe(true);

    // -------------------------------------------------------------
    // STAGE 3: Search & Work Mode Preference Configuration
    // -------------------------------------------------------------
    const updatedPrefs = await ProfileService.updatePreferences({
      workModes: { remote: true, hybrid: false, onsite: false },
      allowSriLankaRemoteOnly: true,
      targetLocations: ["Worldwide", "Sri Lanka"],
    });
    expect(updatedPrefs.allowSriLankaRemoteOnly).toBe(true);
    expect(updatedPrefs.workModes.remote).toBe(true);

    // -------------------------------------------------------------
    // STAGE 4: Job Ingestion & 3-Way Geographic Filtering
    // -------------------------------------------------------------
    // Job 1: Eligible Worldwide
    const eligibleJob: NormalizedJob = {
      source: "remotive",
      sourceId: "job-e2e-1",
      url: "https://boards.greenhouse.io/gitlab/jobs/101",
      urlHash: "hash-e2e-eligible",
      dedupeKey: "gitlab::react frontend engineer::worldwide",
      title: "Senior React Frontend Engineer",
      company: "GitLab",
      location: "Worldwide",
      workMode: "remote",
      isWorldwideRemote: true,
      allowedLocations: ["Worldwide"],
      description: "Looking for an engineer experienced in React, Next.js, and frontend race condition optimization.",
      discoveredAt: new Date(),
      eligibility: evaluateGeographicEligibility("Worldwide", "Open to all countries worldwide."),
      status: "discovered",
    };
    expect(eligibleJob.eligibility.status).toBe("eligible");
    expect(eligibleJob.eligibility.isEligibleForSriLanka).toBe(true);

    // Job 2: Ineligible US-Only
    const usRestrictedJob: NormalizedJob = {
      ...eligibleJob,
      urlHash: "hash-e2e-us",
      title: "React Developer (US Only)",
      location: "United States",
      eligibility: evaluateGeographicEligibility("United States", "Must reside in the US on W2."),
    };
    expect(usRestrictedJob.eligibility.status).toBe("ineligible");
    expect(usRestrictedJob.eligibility.isEligibleForSriLanka).toBe(false);

    // Job 3: Unknown / Ambiguous Remote (Requires Human Review)
    const ambiguousJob: NormalizedJob = {
      ...eligibleJob,
      urlHash: "hash-e2e-ambig",
      location: "Remote",
      eligibility: evaluateGeographicEligibility("Remote", "Standard remote developer position."),
    };
    expect(ambiguousJob.eligibility.status).toBe("unknown");
    expect(ambiguousJob.eligibility.requiresReview).toBe(true);
    expect(ambiguousJob.eligibility.isEligibleForSriLanka).toBe(false); // Never silently treated as eligible

    // -------------------------------------------------------------
    // STAGE 5: Two-Tier Matching Engine
    // -------------------------------------------------------------
    // Mock Gemini structured output for deterministic speed
    vi.spyOn(geminiClient, "generateStructured").mockImplementation(async () => ({
      matchScore: 92,
      eligible: true,
      strengths: ["React & Next.js mastery", "Race condition prevention", "Frontend performance"],
      gaps: ["No direct GitLab CI experience mentioned"],
      seniorityFit: "Associate / Mid-Level (Strong match)",
      explanation: "Exceptional frontend skill and performance architecture fit.",
      headline: "Senior React Frontend Engineer",
      summary: "Associate Software Engineer specialized in React frontend performance and race condition prevention.",
      highlightSkills: ["React", "Next.js", "Redux Toolkit", "Frontend Performance & Optimization"],
      experiences: [
        {
          company: "Mobios Private Limited",
          role: "Associate Software Engineer",
          startDate: "2024-02",
          endDate: null,
          bullets: [
            {
              text: "Eliminated filter-based API request race conditions using AbortController with useEffect cleanup so stale responses no longer overwrite the UI.",
              citedFactIds: ["fact-calsda-race-conditions"],
            },
          ],
        },
      ],
      projects: [
        {
          name: "BuildBusinessLK",
          technologies: ["React", "Next.js"],
          bullets: [
            {
              text: "Built a RAG-based AI assistant using LangChain and FAISS.",
              citedFactIds: ["fact-buildbusiness-rag"],
            },
          ],
        },
      ],
      unsupportedRequirements: [],
    }));

    const matchEvaluation = await JobMatcher.evaluateJob(eligibleJob, verifiedProfile);
    expect(matchEvaluation.eligible).toBe(true);
    expect(matchEvaluation.matchScore).toBe(92);
    expect(matchEvaluation.strengths.length).toBeGreaterThan(0);

    // -------------------------------------------------------------
    // STAGE 6: Truthful CV Tailoring & Verifier Guard
    // -------------------------------------------------------------
    const tailoredPackage = await CVTailorService.generateTailoredPackage(eligibleJob, verifiedProfile);
    expect(tailoredPackage.verification.isValid).toBe(true);
    expect(tailoredPackage.tailoredCV.experiences.length).toBeGreaterThan(0);

    // Confirm all bullet claims cite verified facts
    const allCitedIds = tailoredPackage.tailoredCV.experiences.flatMap((e) =>
      e.bullets.flatMap((b) => b.citedFactIds)
    );
    expect(allCitedIds.length).toBeGreaterThan(0);
    const factsCheck = CVTruthVerifier.verify(tailoredPackage.tailoredCV, verifiedProfile);
    expect(factsCheck.isValid).toBe(true);
    expect(factsCheck.errors).toHaveLength(0);

    // -------------------------------------------------------------
    // STAGE 7: Review Queue Placement
    // -------------------------------------------------------------
    const appPackage = await ApplicationService.createOrUpdatePackage({
      jobId: eligibleJob.urlHash,
      tailoredCv: tailoredPackage.tailoredCV,
      coverLetter: tailoredPackage.coverLetter,
      citedFactIds: allCitedIds,
      method: "assisted_form",
      job: eligibleJob,
    });
    expect(appPackage.status).toBe("review");
    expect(appPackage.id).toBeDefined();

    // -------------------------------------------------------------
    // STAGE 8: Safety Gatekeeper — Automated AI Approval BLOCKED
    // -------------------------------------------------------------
    // An AI or background system process MUST NOT be able to approve
    const aiApprovalAttempt = ApplicationStateMachine.validateTransition(
      appPackage.status,
      "approved",
      "system"
    );
    expect(aiApprovalAttempt.valid).toBe(false);
    expect(aiApprovalAttempt.error).toContain("Policy violation: An application can only be approved by a verified human action");

    // -------------------------------------------------------------
    // STAGE 9: Authenticated Human Approval Gate
    // -------------------------------------------------------------
    const approvedApp = await ApplicationService.transitionStatus(
      appPackage.id,
      "approved",
      "human",
      { reason: "Human candidate reviewed and approved tailored CV and cover letter." }
    );
    expect(approvedApp.status).toBe("approved");

    // -------------------------------------------------------------
    // STAGE 10: Safety Gate — Modifying CV Invalidates Prior Approval
    // -------------------------------------------------------------
    const modifiedCV = structuredClone(tailoredPackage.tailoredCV);
    modifiedCV.summary = "Updated summary text reflecting recent project contributions.";
    const rePreparedApp = await ApplicationService.createOrUpdatePackage({
      jobId: eligibleJob.urlHash,
      tailoredCv: modifiedCV,
      coverLetter: tailoredPackage.coverLetter,
      citedFactIds: allCitedIds,
      job: eligibleJob,
    });
    // Status MUST reset to review!
    expect(rePreparedApp.status).toBe("review");

    // Human approves again
    await ApplicationService.transitionStatus(rePreparedApp.id, "approved", "human");

    // -------------------------------------------------------------
    // STAGE 11: Assisted Form Copilot Launch & Stop Before Submit
    // -------------------------------------------------------------
    const formPayload = FormCopilot.prepareFormPayload(verifiedProfile, modifiedCV);
    expect(formPayload.firstName).toBe("Havindu");
    expect(formPayload.lastName).toBe("Hesara");
    expect(formPayload.email).toBe(verifiedProfile.email);

    // Transition to applying
    const applyingApp = await ApplicationService.transitionStatus(
      rePreparedApp.id,
      "applying",
      "human",
      { reason: "Form copilot initiated. Paused before submission for candidate review." }
    );
    expect(applyingApp.status).toBe("applying");

    // -------------------------------------------------------------
    // STAGE 12: Submission and Human Final Confirmation with Evidence
    // -------------------------------------------------------------
    // Submission and confirmation are strictly separate states
    const submittedApp = await ApplicationService.transitionStatus(
      applyingApp.id,
      "submitted",
      "human",
      { reason: "User completed human review and clicked submit on employer portal; awaiting receipt." }
    );
    expect(submittedApp.status).toBe("submitted");

    const confirmedApp = await ApplicationService.transitionStatus(
      submittedApp.id,
      "confirmed",
      "human",
      {
        reason: "User verified confirmation receipt email.",
        evidence: "Greenhouse Application Receipt ID: #GH-98765432",
      }
    );
    expect(confirmedApp.status).toBe("confirmed");
    expect(confirmedApp.confirmationEvidence).toBe("Greenhouse Application Receipt ID: #GH-98765432");

    // Verify audit trail recorded every single transition
    expect(confirmedApp.history.length).toBeGreaterThanOrEqual(4);
    const lastEvent = confirmedApp.history[confirmedApp.history.length - 1];
    expect(lastEvent.fromStatus).toBe("submitted");
    expect(lastEvent.toStatus).toBe("confirmed");
    expect(lastEvent.actor).toBe("human");
    expect(lastEvent.evidence).toContain("GH-98765432");
  });
});
