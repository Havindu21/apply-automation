import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CVTailorService } from "@/lib/tailoring/tailor";
import { ProfileService } from "@/lib/services/profile-service";
import { DiscoveryOrchestrator } from "@/lib/discovery/orchestrator";

const TailorSchema = z.object({
  jobId: z.string().min(1),
  careerProfileId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TailorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    const storedJobs = await DiscoveryOrchestrator.getStoredJobs();
    const targetJob = storedJobs.find((j) => j.urlHash === parsed.data.jobId);

    if (!targetJob) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    const profile = await ProfileService.getProfile();
    const packageResult = await CVTailorService.generateTailoredPackage(
      targetJob,
      profile,
      parsed.data.careerProfileId
    );

    return NextResponse.json({ success: true, package: packageResult });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Tailoring failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
