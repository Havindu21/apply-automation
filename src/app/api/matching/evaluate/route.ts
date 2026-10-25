import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { JobMatcher } from "@/lib/matching/matcher";
import { ProfileService } from "@/lib/services/profile-service";
import { DiscoveryOrchestrator } from "@/lib/discovery/orchestrator";

const EvaluateSchema = z.object({
  jobId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = EvaluateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    const storedJobs = await DiscoveryOrchestrator.getStoredJobs();
    const targetJob = storedJobs.find((j) => j.urlHash === parsed.data.jobId);

    if (!targetJob) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    const profile = await ProfileService.getProfile();
    const evaluation = await JobMatcher.evaluateJob(targetJob, profile);

    return NextResponse.json({ success: true, evaluation });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Matching evaluation failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
