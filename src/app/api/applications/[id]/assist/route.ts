import { NextResponse } from "next/server";
import { ApplicationService } from "@/lib/services/application-service";
import { ProfileService } from "@/lib/services/profile-service";
import { PDFGenerator } from "@/lib/documents/pdf-generator";
import { FormCopilot } from "@/lib/copilot/form-filler";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const application = await ApplicationService.getApplicationById(id);

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    if (!application.job?.url) {
      return NextResponse.json(
        { success: false, error: "Application has no job URL associated" },
        { status: 400 }
      );
    }

    // Must be approved before applying
    if (application.status !== "approved" && application.status !== "applying") {
      return NextResponse.json(
        {
          success: false,
          error: `Application must be in "approved" status before launching assisted application. Current status: "${application.status}".`,
        },
        { status: 400 }
      );
    }

    const profile = await ProfileService.getProfile();
    let pdfBuffer: Buffer | undefined;

    try {
      pdfBuffer = await PDFGenerator.generateCVPdf(application.tailoredCvJson, profile);
    } catch (pdfErr) {
      console.warn("Could not pre-render PDF buffer for assisted upload:", pdfErr);
    }

    // Launch assisted session
    const session = await FormCopilot.launchAssistedSession(
      application.job.url,
      profile,
      application.tailoredCvJson,
      pdfBuffer,
      true // headed mode
    );

    // If application was approved, transition to applying
    if (application.status === "approved") {
      await ApplicationService.transitionStatus(id, "applying", "human", {
        reason: "Assisted browser session launched by human user.",
      });
    }

    return NextResponse.json({
      success: true,
      session,
      message: session.message,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error launching assisted session";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
