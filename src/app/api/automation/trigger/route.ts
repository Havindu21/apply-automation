import { NextRequest, NextResponse } from "next/server";
import { enqueueDiscoveryJob } from "@/worker";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const jobId = await enqueueDiscoveryJob(body.source);
    return NextResponse.json({
      success: true,
      jobId,
      message: "Discovery job queued into pg-boss background worker",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to trigger discovery queue";
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
