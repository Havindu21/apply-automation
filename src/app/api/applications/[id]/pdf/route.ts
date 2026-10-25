import { NextRequest, NextResponse } from "next/server";
import { ApplicationService } from "@/lib/services/application-service";
import { ProfileService } from "@/lib/services/profile-service";
import { PDFGenerator } from "@/lib/documents/pdf-generator";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const type = req.nextUrl.searchParams.get("type"); // 'cv' or 'cover_letter'

    const application = await ApplicationService.getApplicationById(id);
    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    const profile = await ProfileService.getProfile();
    let pdfBuffer: Buffer;
    let filename: string;

    const companySanitized = (application.job?.company || "Company").replace(/[^a-zA-Z0-9_-]/g, "_");
    const nameSanitized = profile.fullName.replace(/[^a-zA-Z0-9_-]/g, "_");

    if (type === "cover_letter") {
      if (!application.coverLetter) {
        return NextResponse.json(
          { success: false, error: "Cover letter not available for this application" },
          { status: 400 }
        );
      }
      pdfBuffer = await PDFGenerator.generateCoverLetterPdf(
        application.coverLetter,
        profile,
        application.job?.title,
        application.job?.company
      );
      filename = `${nameSanitized}_Cover_Letter_${companySanitized}.pdf`;
    } else {
      pdfBuffer = await PDFGenerator.generateCVPdf(application.tailoredCvJson, profile);
      filename = `${nameSanitized}_Resume_${companySanitized}.pdf`;
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error generating PDF";
    console.error("PDF generation failed:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
