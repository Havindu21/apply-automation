import { NextRequest, NextResponse } from "next/server";
import { ApplicationService } from "@/lib/services/application-service";
import { ProfileService } from "@/lib/services/profile-service";
import { generateATSSemanticHTML, generateCoverLetterSemanticHTML } from "@/lib/documents/ats-template";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const type = req.nextUrl.searchParams.get("type");

    const application = await ApplicationService.getApplicationById(id);
    if (!application) {
      return new NextResponse("Application not found", { status: 404 });
    }

    const profile = await ProfileService.getProfile();
    let html: string;

    if (type === "cover_letter") {
      html = generateCoverLetterSemanticHTML(
        application.coverLetter || "No cover letter provided.",
        profile,
        application.job?.title,
        application.job?.company
      );
    } else {
      html = generateATSSemanticHTML(application.tailoredCvJson, profile);
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error generating preview";
    return new NextResponse(`Error: ${message}`, { status: 500 });
  }
}
