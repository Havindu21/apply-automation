import { NextRequest, NextResponse } from "next/server";
import { DiscoveryOrchestrator, discoveryOrchestrator } from "@/lib/discovery/orchestrator";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eligibleOnly = searchParams.get("eligibleOnly") === "true";
    const workMode = searchParams.get("workMode") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100");

    const jobs = await DiscoveryOrchestrator.getStoredJobs({
      eligibleOnly,
      workMode,
      search,
      limit,
    });

    return NextResponse.json({ success: true, count: jobs.length, jobs });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch jobs";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await discoveryOrchestrator.runDiscovery({
      source: body.source,
      limitPerSource: body.limitPerSource || 20,
      companySlug: body.companySlug,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Discovery run failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
