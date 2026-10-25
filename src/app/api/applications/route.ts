import { NextResponse } from "next/server";
import { ApplicationService } from "@/lib/services/application-service";

export async function GET() {
  try {
    const list = await ApplicationService.getApplications();
    return NextResponse.json({ success: true, applications: list });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobId, tailoredCv, coverLetter, citedFactIds, method, job } = body;

    if (!jobId || !tailoredCv) {
      return NextResponse.json(
        { success: false, error: "jobId and tailoredCv are required" },
        { status: 400 }
      );
    }

    const pkg = await ApplicationService.createOrUpdatePackage({
      jobId,
      tailoredCv,
      coverLetter,
      citedFactIds: citedFactIds || [],
      method,
      job,
    });

    return NextResponse.json({ success: true, application: pkg });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
