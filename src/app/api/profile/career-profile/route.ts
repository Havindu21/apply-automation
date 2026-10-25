import { NextRequest, NextResponse } from "next/server";
import { ProfileService } from "@/lib/services/profile-service";
import { z } from "zod";

const CareerProfileUpdateSchema = z.object({
  id: z.string().min(1),
  isEnabled: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CareerProfileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    await ProfileService.toggleCareerProfile(parsed.data.id, parsed.data.isEnabled);
    return NextResponse.json({ success: true, message: "Career profile updated" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
