import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseManualJobInput } from "@/lib/discovery/adapters/manual";
import { computeUrlHash, computeDedupeKey } from "@/lib/discovery/dedupe";
import { evaluateGeographicEligibility } from "@/lib/discovery/geo-filter";
import { DiscoveryOrchestrator } from "@/lib/discovery/orchestrator";
import { NormalizedJob } from "@/lib/discovery/types";

const ManualImportSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company is required"),
  location: z.string().optional().default("Remote"),
  workMode: z.enum(["remote", "hybrid", "onsite", "unknown"]).default("remote"),
  description: z.string().min(10, "Job description must be at least 10 characters"),
  salaryRaw: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ManualImportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    const raw = parseManualJobInput(parsed.data);
    const urlHash = computeUrlHash(raw.url);
    const dedupeKey = computeDedupeKey(raw.company, raw.title, raw.location);
    const geoResult = evaluateGeographicEligibility(raw.location || "", raw.description);

    const job: NormalizedJob = {
      source: "manual",
      sourceId: raw.sourceId,
      url: raw.url,
      urlHash,
      dedupeKey,
      title: raw.title,
      company: raw.company,
      location: raw.location || "Remote",
      workMode: raw.workMode || "remote",
      isWorldwideRemote: geoResult.isWorldwideRemote,
      allowedLocations: geoResult.positiveFlagsFound,
      description: raw.description,
      salaryRaw: raw.salaryRaw,
      postedAt: new Date(),
      discoveredAt: new Date(),
      eligibility: geoResult,
      status: geoResult.isEligibleForSriLanka ? "discovered" : "filtered_out",
    };

    await DiscoveryOrchestrator.addManualJob(job);

    return NextResponse.json({
      success: true,
      message: "Job manually imported successfully",
      job,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Manual import failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
