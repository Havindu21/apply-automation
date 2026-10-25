import { NextRequest, NextResponse } from "next/server";
import { ProfileService } from "@/lib/services/profile-service";
import { z } from "zod";

const VerifyPayloadSchema = z.object({
  factId: z.string().min(1),
  isVerified: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VerifyPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    await ProfileService.verifyFact(parsed.data.factId, parsed.data.isVerified);
    return NextResponse.json({ success: true, message: "Fact verification updated" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
